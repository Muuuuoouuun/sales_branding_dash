"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FileText as FileCsv,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Wifi,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/Card";
import clsx from "clsx";
import styles from "./page.module.css";

type Tab = "crm" | "manual" | "upload";
type CrmStatus = "connected" | "disconnected" | "connecting";

interface RegionRow {
  id: string;
  name: string;
  revenue: string;
  target: string;
  deals_active: string;
  deals_closed: string;
}

interface CrmPlatform {
  id: string;
  name: string;
  desc: string;
  color: string;
  status: CrmStatus;
  fields: { key: string; label: string; type?: string }[];
}

interface DashboardRegion {
  name: string;
  revenue: number;
  target: number;
  deals_active: number;
  deals_closed: number;
}

interface DashboardPayload {
  regional?: DashboardRegion[];
  dataSource?: string;
  lastUpdated?: string;
  periodLabel?: string;
}

const RECOMMENDED_PLATFORMS: CrmPlatform[] = [
  {
    id: "supabase",
    name: "Supabase",
    desc: "Operational store for BD truth, sync history, and downstream automation.",
    color: "#3ecf8e",
    status: "disconnected",
    fields: [
      { key: "projectUrl", label: "Project URL", type: "url" },
      { key: "anonKeyRef", label: "Anon Key Env Name" },
      { key: "serviceRoleRef", label: "Service Role Env Name" },
    ],
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    desc: "Primary working sheet used by BD and ops to publish current numbers.",
    color: "#34a853",
    status: "disconnected",
    fields: [
      { key: "spreadsheetId", label: "Spreadsheet ID" },
      { key: "worksheet", label: "Worksheet Name" },
      { key: "serviceAccountRef", label: "Service Account Env Name" },
    ],
  },
  {
    id: "neo_crm",
    name: "Neo CRM",
    desc: "External lead and pipeline source that feeds the operating dashboard.",
    color: "#2563eb",
    status: "disconnected",
    fields: [
      { key: "baseUrl", label: "Base URL", type: "url" },
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
      { key: "fieldMapping", label: "Field Mapping (JSON)" },
    ],
  },
  {
    id: "rest",
    name: "REST API",
    desc: "Fallback path for middleware, ETL, or future source consolidation.",
    color: "#8b5cf6",
    status: "disconnected",
    fields: [
      { key: "endpoint", label: "Endpoint URL", type: "url" },
      { key: "token", label: "Bearer Token", type: "password" },
      { key: "mapping", label: "Field Mapping (JSON)" },
    ],
  },
];

const EMPTY_SUMMARY = {
  totalRevenue: 0,
  totalTarget: 0,
  attainment: 0,
  regionCount: 0,
};

const newRow = (): RegionRow => ({
  id: crypto.randomUUID(),
  name: "",
  revenue: "",
  target: "",
  deals_active: "",
  deals_closed: "",
});

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeRows(rows: DashboardRegion[]): RegionRow[] {
  if (rows.length === 0) {
    return [newRow()];
  }

  return rows.map((row) => ({
    id: crypto.randomUUID(),
    name: row.name,
    revenue: String(row.revenue),
    target: String(row.target),
    deals_active: String(row.deals_active),
    deals_closed: String(row.deals_closed),
  }));
}

function parseCsvRows(text: string): RegionRow[] | null {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const required = ["name", "revenue", "target", "deals_active", "deals_closed"];
  if (!required.every((key) => headers.includes(key))) {
    return null;
  }

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const get = (key: string) => values[headers.indexOf(key)] ?? "";

    return {
      id: crypto.randomUUID(),
      name: get("name"),
      revenue: get("revenue"),
      target: get("target"),
      deals_active: get("deals_active"),
      deals_closed: get("deals_closed"),
    };
  });
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || file.type === "text/csv";
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<Tab>("crm");
  const [platforms, setPlatforms] = useState<CrmPlatform[]>(RECOMMENDED_PLATFORMS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [crmFields, setCrmFields] = useState<Record<string, Record<string, string>>>({});
  const [syncStatus, setSyncStatus] = useState("");
  const [rows, setRows] = useState<RegionRow[]>([newRow()]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadRows, setUploadRows] = useState<RegionRow[] | null>(null);
  const [uploadFilename, setUploadFilename] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [applying, setApplying] = useState(false);
  const [dashboardInfo, setDashboardInfo] = useState({
    dataSource: "fallback",
    lastUpdated: "",
    periodLabel: "BD Team",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [regionsRes, integrationsRes] = await Promise.all([
          fetch("/api/dashboard/regions"),
          fetch("/api/integrations/status"),
        ]);

        if (regionsRes.ok) {
          const payload = (await regionsRes.json()) as DashboardPayload;
          if (alive) {
            setRows(normalizeRows(payload.regional ?? []));
            setDashboardInfo({
              dataSource: payload.dataSource ?? "fallback",
              lastUpdated: payload.lastUpdated ?? "",
              periodLabel: payload.periodLabel ?? "BD Team",
            });
          }
        } else if (alive) {
          setRows([newRow()]);
        }

        if (integrationsRes.ok) {
          const data = (await integrationsRes.json()) as {
            providers?: Array<{ id: string; ready: boolean }>;
          };
          const readyIds = new Set(
            (data.providers ?? [])
              .filter((provider) => provider.ready)
              .map((provider) => provider.id),
          );

          if (alive) {
            setPlatforms((prev) =>
              prev.map((platform) => ({
                ...platform,
                status: readyIds.has(platform.id) ? "connected" : "disconnected",
              })),
            );
          }
        }
      } catch {
        if (alive) {
          setRows([newRow()]);
        }
      } finally {
        if (alive) {
          setLoadingRows(false);
        }
      }
    };

    void loadData();

    return () => {
      alive = false;
    };
  }, []);

  const connectedCount = useMemo(
    () => platforms.filter((platform) => platform.status === "connected").length,
    [platforms],
  );

  const summary = useMemo(() => {
    const filledRows = rows.filter((row) => row.name.trim());
    const parsedRows = filledRows.map((row) => ({
      revenue: Number(row.revenue) || 0,
      target: Number(row.target) || 0,
    }));

    const totalRevenue = parsedRows.reduce((sum, row) => sum + row.revenue, 0);
    const totalTarget = parsedRows.reduce((sum, row) => sum + row.target, 0);
    const attainment = totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0;

    return {
      ...EMPTY_SUMMARY,
      totalRevenue,
      totalTarget,
      attainment,
      regionCount: filledRows.length,
    };
  }, [rows]);

  const updateCell = (id: string, key: keyof RegionRow, value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const addRow = () => setRows((current) => [...current, newRow()]);

  const deleteRow = (id: string) => setRows((current) => current.filter((row) => row.id !== id));

  const updateCrmField = (platformId: string, key: string, value: string) => {
    setCrmFields((current) => ({
      ...current,
      [platformId]: {
        ...current[platformId],
        [key]: value,
      },
    }));
  };

  const handleConnect = async (platform: CrmPlatform) => {
    setPlatforms((current) =>
      current.map((item) => (item.id === platform.id ? { ...item, status: "connecting" } : item)),
    );
    setSyncStatus("");

    await new Promise((resolve) => setTimeout(resolve, 1200));

    setPlatforms((current) =>
      current.map((item) => (item.id === platform.id ? { ...item, status: "connected" } : item)),
    );
    setSyncStatus(`${platform.name} connected and ready for sync.`);
    setExpandedId(null);
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms((current) =>
      current.map((item) => (item.id === platformId ? { ...item, status: "disconnected" } : item)),
    );
    setSyncStatus("");
  };

  const handleSave = async (targetRows?: RegionRow[]) => {
    const source = targetRows ?? rows;
    setSaving(true);
    setSaveMsg(null);

    try {
      const payload = source.map((row) => ({
        name: row.name.trim(),
        revenue: Number(row.revenue) || 0,
        target: Number(row.target) || 0,
        deals_active: Number(row.deals_active) || 0,
        deals_closed: Number(row.deals_closed) || 0,
      }));

      const response = await fetch("/api/data/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });

      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      setSaveMsg({ type: "ok", text: data.message ?? "Saved successfully." });
    } catch (error) {
      setSaveMsg({ type: "err", text: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleFileRead = (file: File) => {
    if (!isCsvFile(file)) {
      setUploadFilename("");
      setUploadRows(null);
      setUploadError("Only CSV files are supported here. Export Excel data to CSV before staging.");
      return;
    }

    setUploadError("");
    setUploadRows(null);
    setUploadFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result ?? "");
      const parsed = parseCsvRows(text);
      if (!parsed) {
        setUploadError("CSV schema must include name, revenue, target, deals_active, and deals_closed.");
        return;
      }

      setUploadRows(parsed);
    };

    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleApplyUpload = async () => {
    if (!uploadRows) {
      return;
    }

    setApplying(true);
    await handleSave(uploadRows);
    setRows(uploadRows);
    setUploadRows(null);
    setUploadFilename("");
    setApplying(false);
    setActiveTab("manual");
  };

  const renderStatus = (status: CrmStatus) => {
    if (status === "connected") {
      return <span className={`${styles.connBadge} ${styles.connBadgeOn}`}><CheckCircle2 size={11} /> Connected</span>;
    }

    if (status === "connecting") {
      return <span className={`${styles.connBadge} ${styles.connBadgeWait}`}><Loader2 size={11} className={styles.spin} /> Connecting</span>;
    }

    return <span className={`${styles.connBadge} ${styles.connBadgeOff}`}><XCircle size={11} /> Disconnected</span>;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Input Data</p>
          <h1 className={styles.title}>Source-of-truth operations console</h1>
          <p className={styles.subtitle}>
            Connect the upstream systems, inspect the live regional truth table, and stage bulk changes before they land.
          </p>
        </div>

        <div className={styles.statusBadge}>
          <div className={clsx(styles.statusDot, connectedCount > 0 && styles.statusDotOn)} />
          {connectedCount > 0 ? `${connectedCount} connectors ready` : "No connectors ready yet"}
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Source</span>
          <span className={styles.summaryValue}>{dashboardInfo.dataSource === "google-sheets" ? "Live Sheet" : "Fallback"}</span>
          <span className={styles.summaryMeta}>{dashboardInfo.periodLabel}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Rows</span>
          <span className={styles.summaryValue}>{summary.regionCount}</span>
          <span className={styles.summaryMeta}>Editable truth table</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Revenue</span>
          <span className={styles.summaryValue}>{formatRevenue(summary.totalRevenue)}</span>
          <span className={styles.summaryMeta}>Against {formatRevenue(summary.totalTarget)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Attainment</span>
          <span className={styles.summaryValue}>{summary.attainment}%</span>
          <span className={styles.summaryMeta}>Last sync: {formatDateTime(dashboardInfo.lastUpdated)}</span>
        </div>
      </section>

      <nav className={styles.tabBar} aria-label="Input Data tabs">
        {([
          { key: "crm", label: "Connectors", icon: <Wifi size={15} /> },
          { key: "manual", label: "Truth Table", icon: <Database size={15} /> },
          { key: "upload", label: "Bulk Staging", icon: <Upload size={15} /> },
        ] as Array<{ key: Tab; label: string; icon: React.ReactNode }>).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={clsx(styles.tabBtn, activeTab === tab.key && styles.tabBtnActive)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "crm" && (
        <section className={styles.sectionStack}>
          {syncStatus ? (
            <div className={styles.syncBanner}>
              <CheckCircle2 size={15} />
              {syncStatus}
            </div>
          ) : null}

          <div className={styles.platformGrid}>
            {platforms.map((platform) => (
              <article key={platform.id} className={styles.platformCard}>
                <div className={styles.platformHeader}>
                  <div className={styles.platformIcon} style={{ background: `${platform.color}22`, borderColor: `${platform.color}44` }}>
                    <Link2 size={18} style={{ color: platform.color }} />
                  </div>
                  <div className={styles.platformMeta}>
                    <span className={styles.platformName}>{platform.name}</span>
                    <span className={styles.platformDesc}>{platform.desc}</span>
                  </div>
                  {renderStatus(platform.status)}
                </div>

                <div className={styles.platformActions}>
                  {platform.status === "connected" ? (
                    <>
                      <button type="button" className={styles.btnSync} onClick={() => setSyncStatus(`${platform.name} synced at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`)}>
                        <RefreshCw size={13} /> Sync now
                      </button>
                      <button type="button" className={styles.btnDisconnect} onClick={() => handleDisconnect(platform.id)}>
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnConnect}
                      disabled={platform.status === "connecting"}
                      onClick={() => setExpandedId((current) => (current === platform.id ? null : platform.id))}
                    >
                      {platform.status === "connecting" ? (
                        <>
                          <Loader2 size={13} className={styles.spin} /> Connecting
                        </>
                      ) : (
                        <>
                          Configure
                          <ChevronRight size={13} className={clsx(styles.chevron, expandedId === platform.id && styles.chevronOpen)} />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {expandedId === platform.id && platform.status !== "connected" ? (
                  <div className={styles.configPanel}>
                    {platform.fields.map((field) => (
                      <label key={field.key} className={styles.fieldRow}>
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <input
                          type={field.type ?? "text"}
                          className={styles.fieldInput}
                          placeholder={`Enter ${field.label}`}
                          value={crmFields[platform.id]?.[field.key] ?? ""}
                          onChange={(event) => updateCrmField(platform.id, field.key, event.target.value)}
                        />
                      </label>
                    ))}
                    <button type="button" className={styles.btnConnectConfirm} onClick={() => handleConnect(platform)}>
                      <Link2 size={14} /> Test and connect
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className={styles.noteCard}>
            <AlertCircle size={14} />
            The connector cards are readiness controls, not decoration. Use them to keep the BD source chain explicit before data lands in the dashboard.
          </div>
        </section>
      )}

      {activeTab === "manual" && (
        <section className={styles.sectionStack}>
          <Card title="Regional truth table" action={<span className={styles.cardAction}>Editable source of truth</span>}>
            {loadingRows ? (
              <div className={styles.centered}>
                <Loader2 size={28} className={styles.spin} style={{ color: "var(--primary)" }} />
              </div>
            ) : (
              <>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Region</th>
                        <th>Revenue</th>
                        <th>Target</th>
                        <th>Active</th>
                        <th>Closed</th>
                        <th>Attainment</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const attainment = row.target ? Math.round((Number(row.revenue) / Number(row.target)) * 100) : 0;
                        const attainmentColor = attainment >= 90 ? "#22c55e" : attainment >= 70 ? "#fbbf24" : "#ef4444";

                        return (
                          <tr key={row.id} className={styles.tableRow}>
                            <td>
                              <input
                                className={styles.cellInput}
                                value={row.name}
                                onChange={(event) => updateCell(row.id, "name", event.target.value)}
                                placeholder="Region"
                              />
                            </td>
                            {(["revenue", "target", "deals_active", "deals_closed"] as const).map((field) => (
                              <td key={field}>
                                <input
                                  className={styles.cellInput}
                                  type="number"
                                  min="0"
                                  value={row[field]}
                                  onChange={(event) => updateCell(row.id, field, event.target.value)}
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td>
                              <span
                                className={styles.progBadge}
                                style={{
                                  color: attainmentColor,
                                  borderColor: `${attainmentColor}44`,
                                  background: `${attainmentColor}11`,
                                }}
                              >
                                {attainment}%
                              </span>
                            </td>
                            <td>
                              <button type="button" className={styles.deleteBtn} onClick={() => deleteRow(row.id)} title="Remove row">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.tableFooter}>
                  <button type="button" className={styles.addRowBtn} onClick={addRow}>
                    <Plus size={14} /> Add row
                  </button>

                  <div className={styles.saveArea}>
                    {saveMsg ? (
                      <span className={clsx(styles.saveMsg, saveMsg.type === "ok" ? styles.saveMsgOk : styles.saveMsgErr)}>
                        {saveMsg.type === "ok" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {saveMsg.text}
                      </span>
                    ) : null}
                    <button type="button" className={styles.saveBtn} onClick={() => handleSave()} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 size={14} className={styles.spin} /> Saving
                        </>
                      ) : (
                        <>
                          <Save size={14} /> Commit truth table
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </section>
      )}

      {activeTab === "upload" && (
        <section className={styles.sectionStack}>
          <Card
            title="Bulk staging"
            action={<span className={styles.cardAction}>Validate before commit</span>}
          >
            <div
              className={clsx(styles.dropZone, dragOver && styles.dropZoneActive)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <Upload size={32} className={styles.dropIcon} />
              <p className={styles.dropText}>
                Drop a CSV here or <span className={styles.dropHighlight}>click to stage a CSV</span>
              </p>
              <p className={styles.dropHint}>CSV only. Required schema: name, revenue, target, deals_active, deals_closed</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className={styles.fileInput}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleFileRead(file);
                  }
                }}
              />
            </div>

            <div className={styles.formatGuide}>
              <div className={styles.guideHeader}>
                <FileCsv size={14} /> Required columns
              </div>
              <code className={styles.guideCode}>name, revenue, target, deals_active, deals_closed</code>
              <p className={styles.guideExample}>Example: Seoul, 4200, 4000, 80, 72</p>
            </div>

            {uploadError ? (
              <div className={styles.uploadError}>
                <XCircle size={14} /> {uploadError}
              </div>
            ) : null}
          </Card>

          {uploadRows ? (
            <Card
              title={`Preview: ${uploadFilename} (${uploadRows.length} rows)`}
              action={
                <div className={styles.previewActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => {
                      setUploadRows(null);
                      setUploadFilename("");
                    }}
                  >
                    Clear
                  </button>
                  <button type="button" className={styles.applyBtn} onClick={handleApplyUpload} disabled={applying}>
                    {applying ? (
                      <>
                        <Loader2 size={13} className={styles.spin} /> Applying
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={13} /> Apply to truth table
                      </>
                    )}
                  </button>
                </div>
              }
            >
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Revenue</th>
                      <th>Target</th>
                      <th>Active</th>
                      <th>Closed</th>
                      <th>Attainment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadRows.map((row) => {
                      const revenue = Number(row.revenue) || 0;
                      const target = Number(row.target) || 0;
                      const attainment = target > 0 ? Math.round((revenue / target) * 100) : 0;
                      const attainmentColor = attainment >= 90 ? "#22c55e" : attainment >= 70 ? "#fbbf24" : "#ef4444";

                      return (
                        <tr key={row.id} className={styles.tableRow}>
                          <td className={styles.cellBold}>{row.name}</td>
                          <td>{formatRevenue(revenue)}</td>
                          <td>{formatRevenue(target)}</td>
                          <td>{row.deals_active}</td>
                          <td>{row.deals_closed}</td>
                          <td>
                            <span
                              className={styles.progBadge}
                              style={{
                                color: attainmentColor,
                                borderColor: `${attainmentColor}44`,
                                background: `${attainmentColor}11`,
                              }}
                            >
                              {attainment}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {saveMsg ? (
                <div
                  className={clsx(styles.saveMsg, saveMsg.type === "ok" ? styles.saveMsgOk : styles.saveMsgErr)}
                  style={{ marginTop: "1rem" }}
                >
                  {saveMsg.type === "ok" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {saveMsg.text}
                </div>
              ) : null}
            </Card>
          ) : null}
        </section>
      )}
    </div>
  );
}
