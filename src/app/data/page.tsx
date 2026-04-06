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
import { formatRevenue } from "@/lib/formatCurrency";
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

interface IntegrationProviderStatus {
  id: string;
  name: string;
  category: "database" | "spreadsheet" | "crm" | "custom";
  ready: boolean;
  summary: string;
  requiredEnvKeys: string[];
  missingEnvKeys: string[];
}

interface ValidationItem {
  id: string;
  severity: "ok" | "warn" | "critical";
  title: string;
  detail: string;
}

interface DiffItem {
  name: string;
  state: "added" | "changed" | "removed";
  revenueDelta: number;
  targetDelta: number;
  activeDelta: number;
  closedDelta: number;
}

interface DiffSummary {
  added: number;
  changed: number;
  removed: number;
  revenueDelta: number;
  targetDelta: number;
  items: DiffItem[];
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

const EMPTY_DIFF_SUMMARY: DiffSummary = {
  added: 0,
  changed: 0,
  removed: 0,
  revenueDelta: 0,
  targetDelta: 0,
  items: [],
};

const newRow = (): RegionRow => ({
  id: crypto.randomUUID(),
  name: "",
  revenue: "",
  target: "",
  deals_active: "",
  deals_closed: "",
});


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

function toMetricRow(row: RegionRow) {
  return {
    name: row.name.trim(),
    revenue: Number(row.revenue) || 0,
    target: Number(row.target) || 0,
    dealsActive: Number(row.deals_active) || 0,
    dealsClosed: Number(row.deals_closed) || 0,
  };
}

function formatSignedValue(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString()}`;
}

function buildValidationItems(rows: RegionRow[]): ValidationItem[] {
  const filledRows = rows.filter((row) => row.name.trim());
  if (filledRows.length === 0) {
    return [
      {
        id: "empty-table",
        severity: "warn",
        title: "No named regions yet",
        detail: "Add at least one row before committing the truth table.",
      },
    ];
  }

  const issues: ValidationItem[] = [];
  const nameCounts = new Map<string, number>();

  for (const row of filledRows) {
    const normalized = row.name.trim().toLowerCase();
    nameCounts.set(normalized, (nameCounts.get(normalized) ?? 0) + 1);

    const metrics = toMetricRow(row);
    if (
      metrics.revenue < 0 ||
      metrics.target < 0 ||
      metrics.dealsActive < 0 ||
      metrics.dealsClosed < 0
    ) {
      issues.push({
        id: `${row.id}-negative`,
        severity: "critical",
        title: `${row.name} has a negative value`,
        detail: "Revenue, target, and deal counts should stay at zero or above.",
      });
    }

    if (metrics.dealsClosed > metrics.dealsActive) {
      issues.push({
        id: `${row.id}-closed-over-active`,
        severity: "critical",
        title: `${row.name} has closed deals above active deals`,
        detail: "Check whether the active/closed counts were swapped before saving.",
      });
    }

    if (metrics.target === 0 && metrics.revenue > 0) {
      issues.push({
        id: `${row.id}-missing-target`,
        severity: "warn",
        title: `${row.name} has revenue without a target`,
        detail: "The board will overstate attainment until a target is set.",
      });
    }

    const attainment = metrics.target > 0 ? Math.round((metrics.revenue / metrics.target) * 100) : 0;
    if (attainment > 140) {
      issues.push({
        id: `${row.id}-attainment`,
        severity: "warn",
        title: `${row.name} is unusually far above target`,
        detail: `Attainment is ${attainment}%, so this row should be sanity-checked before commit.`,
      });
    }
  }

  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      issues.push({
        id: `duplicate-${name}`,
        severity: "critical",
        title: `Duplicate region detected`,
        detail: `${name} appears ${count} times. Merge or rename the rows before saving.`,
      });
    }
  }

  if (issues.length === 0) {
    return [
      {
        id: "ok",
        severity: "ok",
        title: "Table passes the quick checks",
        detail: "No duplicate regions or obvious numeric conflicts were found in the current draft.",
      },
    ];
  }

  return issues;
}

function buildDiffSummary(currentRows: RegionRow[], baselineRows: RegionRow[]): DiffSummary {
  const currentMap = new Map(
    currentRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const metrics = toMetricRow(row);
        return [metrics.name.toLowerCase(), metrics] as const;
      }),
  );
  const baselineMap = new Map(
    baselineRows
      .filter((row) => row.name.trim())
      .map((row) => {
        const metrics = toMetricRow(row);
        return [metrics.name.toLowerCase(), metrics] as const;
      }),
  );

  const keys = new Set([...currentMap.keys(), ...baselineMap.keys()]);
  const items: DiffItem[] = [];

  for (const key of keys) {
    const current = currentMap.get(key);
    const baseline = baselineMap.get(key);

    if (current && !baseline) {
      items.push({
        name: current.name,
        state: "added",
        revenueDelta: current.revenue,
        targetDelta: current.target,
        activeDelta: current.dealsActive,
        closedDelta: current.dealsClosed,
      });
      continue;
    }

    if (!current && baseline) {
      items.push({
        name: baseline.name,
        state: "removed",
        revenueDelta: -baseline.revenue,
        targetDelta: -baseline.target,
        activeDelta: -baseline.dealsActive,
        closedDelta: -baseline.dealsClosed,
      });
      continue;
    }

    if (!current || !baseline) {
      continue;
    }

    const revenueDelta = current.revenue - baseline.revenue;
    const targetDelta = current.target - baseline.target;
    const activeDelta = current.dealsActive - baseline.dealsActive;
    const closedDelta = current.dealsClosed - baseline.dealsClosed;

    if (revenueDelta || targetDelta || activeDelta || closedDelta) {
      items.push({
        name: current.name,
        state: "changed",
        revenueDelta,
        targetDelta,
        activeDelta,
        closedDelta,
      });
    }
  }

  return {
    added: items.filter((item) => item.state === "added").length,
    changed: items.filter((item) => item.state === "changed").length,
    removed: items.filter((item) => item.state === "removed").length,
    revenueDelta: items.reduce((sum, item) => sum + item.revenueDelta, 0),
    targetDelta: items.reduce((sum, item) => sum + item.targetDelta, 0),
    items: items.sort((left, right) => {
      const impactDiff =
        Math.abs(right.revenueDelta) +
        Math.abs(right.targetDelta) -
        (Math.abs(left.revenueDelta) + Math.abs(left.targetDelta));
      return impactDiff || left.name.localeCompare(right.name);
    }),
  };
}

function getLaggingRows(rows: RegionRow[]) {
  return rows
    .filter((row) => row.name.trim())
    .map((row) => {
      const metrics = toMetricRow(row);
      const attainment = metrics.target > 0 ? Math.round((metrics.revenue / metrics.target) * 100) : 0;
      const gap = Math.max(metrics.target - metrics.revenue, 0);
      return {
        id: row.id,
        name: metrics.name,
        attainment,
        gap,
        velocity:
          metrics.dealsActive > 0 ? Math.round((metrics.dealsClosed / metrics.dealsActive) * 100) : 0,
      };
    })
    .sort((left, right) => left.attainment - right.attainment || right.gap - left.gap)
    .slice(0, 4);
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<Tab>("crm");
  const [platforms, setPlatforms] = useState<CrmPlatform[]>(RECOMMENDED_PLATFORMS);
  const [integrationMeta, setIntegrationMeta] = useState<Record<string, IntegrationProviderStatus>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [crmFields, setCrmFields] = useState<Record<string, Record<string, string>>>({});
  const [syncStatus, setSyncStatus] = useState("");
  const [rows, setRows] = useState<RegionRow[]>([newRow()]);
  const [baselineRows, setBaselineRows] = useState<RegionRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [lastCommitMeta, setLastCommitMeta] = useState<{ backend: string; savedAt: string; rowCount: number } | null>(null);
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
            const normalizedRows = normalizeRows(payload.regional ?? []);
            setRows(normalizedRows);
            setBaselineRows(normalizedRows);
            setDashboardInfo({
              dataSource: payload.dataSource ?? "fallback",
              lastUpdated: payload.lastUpdated ?? "",
              periodLabel: payload.periodLabel ?? "BD Team",
            });
          }
        } else if (alive) {
          setRows([newRow()]);
          setBaselineRows([]);
        }

        if (integrationsRes.ok) {
          const data = (await integrationsRes.json()) as {
            providers?: IntegrationProviderStatus[];
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
            setIntegrationMeta(
              Object.fromEntries(
                (data.providers ?? []).map((provider) => [provider.id, provider]),
              ),
            );
          }
        }
      } catch {
        if (alive) {
          setRows([newRow()]);
          setBaselineRows([]);
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

  const connectorChecklist = useMemo(
    () =>
      platforms.map((platform) => {
        const meta = integrationMeta[platform.id];
        return {
          id: platform.id,
          name: platform.name,
          ready: platform.status === "connected" || meta?.ready === true,
          summary: meta?.summary ?? platform.desc,
          category: meta?.category ?? "custom",
          missingEnvKeys: meta?.missingEnvKeys ?? [],
          requiredEnvKeys: meta?.requiredEnvKeys ?? platform.fields.map((field) => field.label),
        };
      }),
    [integrationMeta, platforms],
  );

  const truthValidation = useMemo(() => buildValidationItems(rows), [rows]);
  const truthDiff = useMemo(() => buildDiffSummary(rows, baselineRows), [rows, baselineRows]);
  const laggingRows = useMemo(() => getLaggingRows(rows), [rows]);
  const uploadValidation = useMemo(
    () => (uploadRows ? buildValidationItems(uploadRows) : []),
    [uploadRows],
  );
  const uploadDiff = useMemo(
    () => (uploadRows ? buildDiffSummary(uploadRows, baselineRows) : EMPTY_DIFF_SUMMARY),
    [baselineRows, uploadRows],
  );
  const connectorImpacts = useMemo(
    () => [
      {
        id: "google-sheet-impact",
        label: "Google Sheets",
        target: "Dashboard / Research",
        detail: "Feeds regional metrics, period labels, and live board snapshots used across the cockpit.",
        status: integrationMeta.google_sheets?.ready ?? false,
      },
      {
        id: "crm-impact",
        label: "Neo CRM",
        target: "CRM / Pipeline",
        detail: "Feeds lead health, owner actions, and stage movement into the execution board.",
        status: integrationMeta.neo_crm?.ready ?? false,
      },
      {
        id: "warehouse-impact",
        label: "Supabase",
        target: "Save / Sync history",
        detail: "Stores saved truth-table commits and lead sync state for downstream automation.",
        status: integrationMeta.supabase?.ready ?? false,
      },
      {
        id: "rest-impact",
        label: "REST API",
        target: "Future middleware",
        detail: "Acts as the escape hatch for ETL, webhooks, and custom source consolidation.",
        status: integrationMeta.rest?.ready ?? false,
      },
    ],
    [integrationMeta],
  );

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

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        backend?: string;
        savedAt?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      setSaveMsg({ type: "ok", text: data.message ?? "Saved successfully." });
      setLastCommitMeta({
        backend: data.backend ?? "unknown",
        savedAt: data.savedAt ?? new Date().toISOString(),
        rowCount: payload.length,
      });
      setBaselineRows(source.map((row) => ({ ...row })));
      return true;
    } catch (error) {
      setSaveMsg({ type: "err", text: error instanceof Error ? error.message : "Save failed." });
      return false;
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
    const succeeded = await handleSave(uploadRows);
    if (succeeded) {
      setRows(uploadRows);
      setUploadRows(null);
      setUploadFilename("");
      setActiveTab("manual");
    }
    setApplying(false);
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

          <div className={styles.opsGrid}>
            <Card title="Connection readiness" action={<span className={styles.cardAction}>Mocked from live env status</span>}>
              <div className={styles.checkList}>
                {connectorChecklist.map((item) => (
                  <div key={item.id} className={styles.checkRow}>
                    <div className={styles.checkBody}>
                      <div className={styles.checkTitleRow}>
                        <span className={styles.checkTitle}>{item.name}</span>
                        <span className={`${styles.inlineBadge} ${item.ready ? styles.inlineBadgeOk : styles.inlineBadgeMuted}`}>
                          {item.ready ? "Ready" : `${item.missingEnvKeys.length} missing`}
                        </span>
                      </div>
                      <div className={styles.checkDetail}>{item.summary}</div>
                      <div className={styles.keyList}>
                        {(item.ready ? item.requiredEnvKeys : item.missingEnvKeys).slice(0, 4).map((key) => (
                          <span key={`${item.id}-${key}`} className={styles.keyPill}>
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Sync impact map" action={<span className={styles.cardAction}>Planning mockup</span>}>
              <div className={styles.impactList}>
                {connectorImpacts.map((item) => (
                  <div key={item.id} className={styles.impactRow}>
                    <div>
                      <div className={styles.checkTitleRow}>
                        <span className={styles.checkTitle}>{item.label}</span>
                        <span className={`${styles.inlineBadge} ${item.status ? styles.inlineBadgeOk : styles.inlineBadgeWarn}`}>
                          {item.status ? "Connected path" : "Blocked path"}
                        </span>
                      </div>
                      <div className={styles.impactTarget}>{item.target}</div>
                      <div className={styles.checkDetail}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className={styles.noteCard}>
            <AlertCircle size={14} />
            The connector cards are readiness controls, not decoration. Use them to keep the BD source chain explicit before data lands in the dashboard.
          </div>
        </section>
      )}

      {activeTab === "manual" && (
        <section className={styles.sectionStack}>
          <div className={styles.truthLayout}>
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

            <div className={styles.sideStack}>
              <Card title="Quality checks" action={<span className={styles.cardAction}>Quick validation</span>}>
                <div className={styles.insightList}>
                  {truthValidation.map((issue) => (
                    <div key={issue.id} className={`${styles.insightRow} ${styles[`severity_${issue.severity}`]}`}>
                      <div className={styles.checkTitleRow}>
                        <span className={styles.checkTitle}>{issue.title}</span>
                        <span className={`${styles.inlineBadge} ${styles[`inlineBadge_${issue.severity}`]}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <div className={styles.checkDetail}>{issue.detail}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Delta vs loaded board" action={<span className={styles.cardAction}>Planning mockup</span>}>
                <div className={styles.deltaStats}>
                  <div className={styles.deltaCard}>
                    <span className={styles.summaryLabel}>Changed</span>
                    <strong className={styles.summaryValue}>{truthDiff.changed}</strong>
                  </div>
                  <div className={styles.deltaCard}>
                    <span className={styles.summaryLabel}>Revenue delta</span>
                    <strong className={styles.summaryValue}>{formatSignedValue(truthDiff.revenueDelta)}M</strong>
                  </div>
                  <div className={styles.deltaCard}>
                    <span className={styles.summaryLabel}>Target delta</span>
                    <strong className={styles.summaryValue}>{formatSignedValue(truthDiff.targetDelta)}M</strong>
                  </div>
                </div>
                <div className={styles.insightList}>
                  {truthDiff.items.length === 0 ? (
                    <div className={styles.emptyInline}>No local changes yet. Edit the table to see the mock diff panel fill in.</div>
                  ) : (
                    truthDiff.items.slice(0, 5).map((item) => (
                      <div key={`${item.name}-${item.state}`} className={styles.insightRow}>
                        <div className={styles.checkTitleRow}>
                          <span className={styles.checkTitle}>{item.name}</span>
                          <span className={`${styles.inlineBadge} ${item.state === "removed" ? styles.inlineBadgeWarn : styles.inlineBadgeMuted}`}>
                            {item.state}
                          </span>
                        </div>
                        <div className={styles.deltaMeta}>
                          <span>Rev {formatSignedValue(item.revenueDelta)}M</span>
                          <span>Target {formatSignedValue(item.targetDelta)}M</span>
                          <span>Active {formatSignedValue(item.activeDelta)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card title="Regions to review" action={<span className={styles.cardAction}>Operating shortlist</span>}>
                <div className={styles.regionReviewList}>
                  {laggingRows.map((row) => (
                    <div key={row.id} className={styles.regionReviewRow}>
                      <div>
                        <div className={styles.checkTitle}>{row.name}</div>
                        <div className={styles.checkDetail}>Gap {formatRevenue(row.gap)} | Velocity {row.velocity}%</div>
                      </div>
                      <span className={`${styles.inlineBadge} ${row.attainment >= 90 ? styles.inlineBadgeOk : styles.inlineBadgeWarn}`}>
                        {row.attainment}%
                      </span>
                    </div>
                  ))}
                  {lastCommitMeta ? (
                    <div className={styles.commitMeta}>
                      Last commit saved to <strong>{lastCommitMeta.backend}</strong> at {formatDateTime(lastCommitMeta.savedAt)} with {lastCommitMeta.rowCount} rows.
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
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
            <div className={styles.truthLayout}>
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

              <div className={styles.sideStack}>
                <Card title="Staging preflight" action={<span className={styles.cardAction}>Mock diff</span>}>
                  <div className={styles.deltaStats}>
                    <div className={styles.deltaCard}>
                      <span className={styles.summaryLabel}>Added</span>
                      <strong className={styles.summaryValue}>{uploadDiff.added}</strong>
                    </div>
                    <div className={styles.deltaCard}>
                      <span className={styles.summaryLabel}>Changed</span>
                      <strong className={styles.summaryValue}>{uploadDiff.changed}</strong>
                    </div>
                    <div className={styles.deltaCard}>
                      <span className={styles.summaryLabel}>Revenue delta</span>
                      <strong className={styles.summaryValue}>{formatSignedValue(uploadDiff.revenueDelta)}M</strong>
                    </div>
                  </div>
                  <div className={styles.insightList}>
                    {uploadDiff.items.slice(0, 5).map((item) => (
                      <div key={`${item.name}-${item.state}-upload`} className={styles.insightRow}>
                        <div className={styles.checkTitleRow}>
                          <span className={styles.checkTitle}>{item.name}</span>
                          <span className={`${styles.inlineBadge} ${styles.inlineBadgeMuted}`}>{item.state}</span>
                        </div>
                        <div className={styles.deltaMeta}>
                          <span>Rev {formatSignedValue(item.revenueDelta)}M</span>
                          <span>Target {formatSignedValue(item.targetDelta)}M</span>
                          <span>Closed {formatSignedValue(item.closedDelta)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Validation report" action={<span className={styles.cardAction}>Quick checks</span>}>
                  <div className={styles.insightList}>
                    {uploadValidation.map((issue) => (
                      <div key={`${issue.id}-upload`} className={`${styles.insightRow} ${styles[`severity_${issue.severity}`]}`}>
                        <div className={styles.checkTitleRow}>
                          <span className={styles.checkTitle}>{issue.title}</span>
                          <span className={`${styles.inlineBadge} ${styles[`inlineBadge_${issue.severity}`]}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <div className={styles.checkDetail}>{issue.detail}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
