"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Card from "@/components/Card";
import {
  Database, Link2, RefreshCw, Plus, Trash2, Save,
  Upload, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronRight, FileSpreadsheet, FileText as FileCsv, Wifi,
} from "lucide-react";
import styles from "./page.module.css";
import clsx from "clsx";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "crm" | "manual" | "upload";

interface RegionRow {
  id: string;           // local UI only
  name: string;
  revenue: string;
  target: string;
  deals_active: string;
  deals_closed: string;
}

type CrmStatus = "connected" | "disconnected" | "connecting";

interface CrmPlatform {
  id: string;
  name: string;
  desc: string;
  color: string;
  status: CrmStatus;
  fields: { key: string; label: string; type?: string }[];
}

// ─── CRM Platforms config ────────────────────────────────────────────────────
/* Legacy connector draft kept for reference.
  {
    id: "supabase",
    name: "Supabase",
    desc: "Sales Cloud · Service Cloud",
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
    desc: "CRM · Marketing Hub",
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
    name: "더존 iCUBE",
    desc: "영업관리 · ERP 연동",
    color: "#2563eb",
    status: "disconnected",
    fields: [
      { key: "serverUrl", label: "서버 URL", type: "url" },
      { key: "userId",    label: "사용자 ID" },
      { key: "apiKey",    label: "API 키", type: "password" },
    ],
  },
  {
    id: "rest",
    name: "REST API",
    desc: "커스텀 CRM / 자체 서버",
    color: "#8b5cf6",
    status: "disconnected",
    fields: [
      { key: "endpoint",  label: "Endpoint URL", type: "url" },
      { key: "token",     label: "Bearer Token", type: "password" },
      { key: "mapping",   label: "필드 매핑 (JSON)" },
    ],
  },
*/

const RECOMMENDED_PLATFORMS: CrmPlatform[] = [
  {
    id: "supabase",
    name: "Supabase",
    desc: "Primary database and sync target",
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
    desc: "Spreadsheet import or scheduled sync",
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
    desc: "China HQ CRM via Open API adapter",
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
    desc: "Fallback connector for middleware or ETL",
    color: "#8b5cf6",
    status: "disconnected",
    fields: [
      { key: "endpoint", label: "Endpoint URL", type: "url" },
      { key: "token", label: "Bearer Token", type: "password" },
      { key: "mapping", label: "Field Mapping (JSON)" },
    ],
  },
];

const newRow = (): RegionRow => ({
  id: crypto.randomUUID(),
  name: "", revenue: "", target: "", deals_active: "", deals_closed: "",
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function DataPage() {
  const [activeTab, setActiveTab]         = useState<Tab>("crm");
  const [platforms, setPlatforms]         = useState<CrmPlatform[]>(RECOMMENDED_PLATFORMS);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [crmFields, setCrmFields]         = useState<Record<string, Record<string, string>>>({});
  const [syncStatus, setSyncStatus]       = useState<string>("");

  const [rows, setRows]                   = useState<RegionRow[]>([]);
  const [loadingRows, setLoadingRows]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [dragOver, setDragOver]           = useState(false);
  const [uploadRows, setUploadRows]       = useState<RegionRow[] | null>(null);
  const [uploadFilename, setUploadFilename] = useState<string>("");
  const [uploadError, setUploadError]     = useState<string>("");
  const [applying, setApplying]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load current CSV data ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/dashboard/regions")
      .then(r => r.json())
      .then(({ regional }) => {
        setRows(
          (regional as Array<Record<string, unknown>>).map((r) => ({
            id: crypto.randomUUID(),
            name:         String(r.name),
            revenue:      String(r.revenue),
            target:       String(r.target),
            deals_active: String(r.deals_active),
            deals_closed: String(r.deals_closed),
          }))
        );
      })
      .catch(() => setRows([newRow()]))
      .finally(() => setLoadingRows(false));
  }, []);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then(r => r.json())
      .then(({ providers }) => {
        const readyIds = new Set<string>(
          (providers as Array<{ id: string; ready: boolean }>)
            .filter((provider) => provider.ready)
            .map((provider) => provider.id)
        );

        setPlatforms(prev =>
          prev.map(platform => ({
            ...platform,
            status: readyIds.has(platform.id) ? "connected" : "disconnected",
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  // ── Manual input helpers ─────────────────────────────────────────────────
  const updateCell = (id: string, key: keyof RegionRow, val: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));

  const addRow = () => setRows(prev => [...prev, newRow()]);

  const deleteRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));

  const handleSave = async (targetRows?: RegionRow[]) => {
    const source = targetRows ?? rows;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = source.map(r => ({
        name:         r.name.trim(),
        revenue:      Number(r.revenue) || 0,
        target:       Number(r.target)  || 0,
        deals_active: Number(r.deals_active) || 0,
        deals_closed: Number(r.deals_closed) || 0,
      }));
      const res = await fetch("/api/data/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveMsg({ type: "ok", text: data.message });
    } catch (e) {
      setSaveMsg({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  };

  // ── CRM helpers ──────────────────────────────────────────────────────────
  const updateCrmField = (platformId: string, key: string, val: string) =>
    setCrmFields(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], [key]: val },
    }));

  const handleConnect = async (platform: CrmPlatform) => {
    setPlatforms(prev =>
      prev.map(p => p.id === platform.id ? { ...p, status: "connecting" } : p)
    );
    setSyncStatus("");
    await new Promise(r => setTimeout(r, 1800)); // simulate
    setPlatforms(prev =>
      prev.map(p => p.id === platform.id ? { ...p, status: "connected" } : p)
    );
    setSyncStatus(`${platform.name} 연결 완료 · 데이터 동기화 시뮬레이션 완료`);
    setExpandedId(null);
  };

  const handleDisconnect = (id: string) => {
    setPlatforms(prev =>
      prev.map(p => p.id === id ? { ...p, status: "disconnected" } : p)
    );
    setSyncStatus("");
  };

  // ── CSV upload parsing ───────────────────────────────────────────────────
  const parseCSV = useCallback((text: string): RegionRow[] | null => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const required = ["name", "revenue", "target", "deals_active", "deals_closed"];
    if (!required.every(k => headers.includes(k))) return null;

    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const get = (k: string) => vals[headers.indexOf(k)] ?? "";
      return {
        id: crypto.randomUUID(),
        name: get("name"), revenue: get("revenue"), target: get("target"),
        deals_active: get("deals_active"), deals_closed: get("deals_closed"),
      };
    });
  }, []);

  const handleFileRead = useCallback((file: File) => {
    setUploadError("");
    setUploadRows(null);
    setUploadFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed) {
        setUploadError("컬럼이 올바르지 않습니다. name, revenue, target, deals_active, deals_closed 가 필요합니다.");
        return;
      }
      setUploadRows(parsed);
    };
    reader.readAsText(file, "utf-8");
  }, [parseCSV]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const handleApplyUpload = async () => {
    if (!uploadRows) return;
    setApplying(true);
    await handleSave(uploadRows);
    setRows(uploadRows);
    setUploadRows(null);
    setUploadFilename("");
    setApplying(false);
    setActiveTab("manual");
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  const connectedCount = platforms.filter(p => p.status === "connected").length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Input Data</h1>
          <p className={styles.subtitle}>CRM 연동 · 수동 입력 · 파일 업로드</p>
        </div>

        {/* connection status badge */}
        <div className={styles.statusBadge}>
          <div className={clsx(styles.statusDot, connectedCount > 0 && styles.statusDotOn)} />
          {connectedCount > 0
            ? `${connectedCount}개 CRM 연결됨`
            : "CRM 미연결 · CSV 파일 사용 중"}
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {([
          { key: "crm",    label: "CRM 연동", icon: <Wifi size={15} /> },
          { key: "manual", label: "수동 입력", icon: <Database size={15} /> },
          { key: "upload", label: "파일 업로드", icon: <Upload size={15} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            className={clsx(styles.tab, activeTab === t.key && styles.tabActive)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CRM 연동 ─────────────────────────────────────────────────── */}
      {activeTab === "crm" && (
        <div className={styles.crmSection}>
          {syncStatus && (
            <div className={styles.syncBanner}>
              <CheckCircle2 size={15} /> {syncStatus}
            </div>
          )}

          <div className={styles.platformGrid}>
            {platforms.map(platform => (
              <div key={platform.id} className={styles.platformCard}>
                {/* Card header */}
                <div className={styles.platformHeader}>
                  <div
                    className={styles.platformIcon}
                    style={{ background: platform.color + "22", border: `1px solid ${platform.color}44` }}
                  >
                    <Link2 size={18} style={{ color: platform.color }} />
                  </div>
                  <div className={styles.platformMeta}>
                    <span className={styles.platformName}>{platform.name}</span>
                    <span className={styles.platformDesc}>{platform.desc}</span>
                  </div>
                  <div className={clsx(
                    styles.connBadge,
                    platform.status === "connected"   && styles.connBadgeOn,
                    platform.status === "connecting"  && styles.connBadgeWait,
                    platform.status === "disconnected"&& styles.connBadgeOff,
                  )}>
                    {platform.status === "connected"   && <><CheckCircle2 size={11} /> 연결됨</>}
                    {platform.status === "connecting"  && <><Loader2 size={11} className={styles.spin} /> 연결 중…</>}
                    {platform.status === "disconnected"&& <><XCircle size={11} /> 미연결</>}
                  </div>
                </div>

                {/* Actions */}
                {platform.status === "connected" ? (
                  <div className={styles.platformActions}>
                    <button
                      className={styles.btnSync}
                      onClick={() => setSyncStatus(`${platform.name} 동기화 완료 · ${new Date().toLocaleTimeString("ko-KR")}`)}
                    >
                      <RefreshCw size={13} /> 데이터 동기화
                    </button>
                    <button className={styles.btnDisconnect} onClick={() => handleDisconnect(platform.id)}>
                      연결 해제
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.btnConnect}
                    disabled={platform.status === "connecting"}
                    onClick={() => setExpandedId(expandedId === platform.id ? null : platform.id)}
                  >
                    {platform.status === "connecting"
                      ? <><Loader2 size={13} className={styles.spin} /> 연결 중…</>
                      : <>설정 <ChevronRight size={13} className={clsx(styles.chevron, expandedId === platform.id && styles.chevronOpen)} /></>
                    }
                  </button>
                )}

                {/* Expanded config panel */}
                {expandedId === platform.id && platform.status !== "connected" && (
                  <div className={styles.configPanel}>
                    {platform.fields.map(f => (
                      <div key={f.key} className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>{f.label}</label>
                        <input
                          type={f.type ?? "text"}
                          className={styles.fieldInput}
                          placeholder={`${f.label} 입력`}
                          value={crmFields[platform.id]?.[f.key] ?? ""}
                          onChange={e => updateCrmField(platform.id, f.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <button
                      className={styles.btnConnectConfirm}
                      onClick={() => handleConnect(platform)}
                    >
                      <Link2 size={14} /> 연결 테스트 &amp; 적용
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info note */}
          <div className={styles.infoNote}>
            <AlertCircle size={14} />
            CRM 연동 시 데이터는 자동으로 <code>data/regions.csv</code>에 매핑되어 대시보드에 반영됩니다.
            연결 정보는 서버 환경변수(.env)에 저장하는 것을 권장합니다.
          </div>
        </div>
      )}

      {/* ── 수동 입력 ─────────────────────────────────────────────────── */}
      {activeTab === "manual" && (
        <Card title="지역별 데이터 수동 입력">
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
                      <th>지역명</th>
                      <th>매출 (M)</th>
                      <th>목표 (M)</th>
                      <th>활성 딜</th>
                      <th>클로즈 딜</th>
                      <th>달성률</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const prog = row.target
                        ? Math.round((Number(row.revenue) / Number(row.target)) * 100)
                        : 0;
                      const progColor =
                        prog >= 90 ? "#22c55e" : prog >= 70 ? "#fbbf24" : "#ef4444";

                      return (
                        <tr key={row.id} className={styles.tableRow}>
                          <td>
                            <input
                              className={styles.cellInput}
                              value={row.name}
                              onChange={e => updateCell(row.id, "name", e.target.value)}
                              placeholder="지역명"
                            />
                          </td>
                          {(["revenue","target","deals_active","deals_closed"] as const).map(k => (
                            <td key={k}>
                              <input
                                className={styles.cellInput}
                                type="number"
                                min="0"
                                value={row[k]}
                                onChange={e => updateCell(row.id, k, e.target.value)}
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td>
                            <span className={styles.progBadge} style={{ color: progColor, borderColor: progColor + "44", background: progColor + "11" }}>
                              {prog}%
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => deleteRow(row.id)}
                              title="행 삭제"
                            >
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
                <button className={styles.addRowBtn} onClick={addRow}>
                  <Plus size={14} /> 행 추가
                </button>

                <div className={styles.saveArea}>
                  {saveMsg && (
                    <span className={clsx(styles.saveMsg, saveMsg.type === "ok" ? styles.saveMsgOk : styles.saveMsgErr)}>
                      {saveMsg.type === "ok" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {saveMsg.text}
                    </span>
                  )}
                  <button
                    className={styles.saveBtn}
                    onClick={() => handleSave()}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader2 size={14} className={styles.spin} /> 저장 중…</>
                      : <><Save size={14} /> CSV 저장 &amp; 적용</>
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── 파일 업로드 ──────────────────────────────────────────────── */}
      {activeTab === "upload" && (
        <div className={styles.uploadSection}>
          <Card title="CSV / Excel 파일 업로드">
            {/* Drop zone */}
            <div
              className={clsx(styles.dropZone, dragOver && styles.dropZoneActive)}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className={styles.dropIcon} />
              <p className={styles.dropText}>
                파일을 드래그하거나 <span className={styles.dropHighlight}>클릭하여 선택</span>
              </p>
              <p className={styles.dropHint}>CSV (UTF-8) · Excel 미지원 시 CSV로 변환 후 업로드</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className={styles.fileInput}
                onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0])}
              />
            </div>

            {/* Format guide */}
            <div className={styles.formatGuide}>
              <div className={styles.guideHeader}>
                <FileCsv size={14} /> 필수 컬럼 형식
              </div>
              <code className={styles.guideCode}>
                name, revenue, target, deals_active, deals_closed
              </code>
              <p className={styles.guideExample}>
                예) 서울, 4200, 4000, 80, 72
              </p>
            </div>

            {/* Upload error */}
            {uploadError && (
              <div className={styles.uploadError}>
                <XCircle size={14} /> {uploadError}
              </div>
            )}
          </Card>

          {/* Preview table */}
          {uploadRows && (
            <Card
              title={`미리보기 · ${uploadFilename} (${uploadRows.length}행)`}
              action={
                <div className={styles.previewActions}>
                  <button className={styles.cancelBtn} onClick={() => { setUploadRows(null); setUploadFilename(""); }}>
                    취소
                  </button>
                  <button className={styles.applyBtn} onClick={handleApplyUpload} disabled={applying}>
                    {applying
                      ? <><Loader2 size={13} className={styles.spin} /> 적용 중…</>
                      : <><FileSpreadsheet size={13} /> 적용 (CSV 덮어쓰기)</>
                    }
                  </button>
                </div>
              }
            >
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>지역명</th>
                      <th>매출</th>
                      <th>목표</th>
                      <th>활성 딜</th>
                      <th>클로즈</th>
                      <th>달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadRows.map(row => {
                      const prog = Number(row.target)
                        ? Math.round((Number(row.revenue) / Number(row.target)) * 100)
                        : 0;
                      const progColor = prog >= 90 ? "#22c55e" : prog >= 70 ? "#fbbf24" : "#ef4444";
                      return (
                        <tr key={row.id} className={styles.tableRow}>
                          <td className={styles.cellBold}>{row.name}</td>
                          <td>₩{Number(row.revenue).toLocaleString()}M</td>
                          <td>₩{Number(row.target).toLocaleString()}M</td>
                          <td>{row.deals_active}</td>
                          <td>{row.deals_closed}</td>
                          <td>
                            <span className={styles.progBadge} style={{ color: progColor, borderColor: progColor + "44", background: progColor + "11" }}>
                              {prog}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {saveMsg && (
                <div className={clsx(styles.saveMsg, saveMsg.type === "ok" ? styles.saveMsgOk : styles.saveMsgErr)} style={{ marginTop: "1rem" }}>
                  {saveMsg.type === "ok" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {saveMsg.text}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
