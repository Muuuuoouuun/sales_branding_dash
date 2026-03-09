"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import SalesTip from "@/components/SalesTip";
import Link from "next/link";
import {
  Phone, Mail, MessageSquare, ArrowRight, Loader2,
  Kanban, TableProperties, Crosshair,
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type CrmTab    = "killist" | "pipeline" | "leads";
type SortDir   = "asc" | "desc" | null;
type LeadStatus = "critical" | "warning" | "good";
type QuickSort  = "critical" | "revenue" | "due" | "contact" | null;

interface Lead {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  due_label: string;
  action: string;
}

type LeadWithStatus = Lead & { _status: LeadStatus };

interface FocusScore {
  name: string;
  score: number;
  label: string;
  won: number;
  pipeline: number;
  deals: number;
}

interface ActionItem {
  salesRep: string;
  target: string;
  prob: string;
  action: string;
  due: string;
  region: string;
  stage: string;
}

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: "Lead",        label: "리드",  color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  { id: "Proposal",    label: "제안",  color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
  { id: "Negotiation", label: "협상",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  { id: "Contract",    label: "계약",  color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
];

const OWNER_COLORS: Record<string, string> = {
  "김민수": "#6366f1",
  "이지원": "#22c55e",
  "박웨이": "#f59e0b",
};

const STAGE_COLOR: Record<string, string> = {
  Lead: "#64748b", Proposal: "#6366f1", Negotiation: "#f59e0b", Contract: "#22c55e",
};
const STAGE_KR: Record<string, string> = {
  Lead: "리드", Proposal: "제안", Negotiation: "협상", Contract: "계약",
};

// ── Helper functions ──────────────────────────────────────────────────────────
function getLeadStatus(lead: Lead): LeadStatus {
  if (lead.stage === "Contract") return "good";

  let dueDays = 0;
  if (lead.due_label.includes("초과"))     dueDays = -parseInt(lead.due_label);
  else if (lead.due_label === "오늘")       dueDays = 0;
  else if (lead.due_label === "내일")       dueDays = 1;
  else                                      dueDays = parseInt(lead.due_label);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lc = new Date(lead.last_contact);  lc.setHours(0, 0, 0, 0);
  const daysSinceContact = Math.floor((today.getTime() - lc.getTime()) / 86_400_000);

  if (dueDays < 0 || lead.probability < 40)                           return "critical";
  if (dueDays <= 7 || lead.probability < 65 || daysSinceContact > 14) return "warning";
  return "good";
}

function formatLastContact(dateStr: string): string {
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const today = new Date();    today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [tab, setTab]           = useState<CrmTab>("killist");
  const [scores, setScores]     = useState<FocusScore[]>([]);
  const [actions, setActions]   = useState<ActionItem[]>([]);
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/crm/leads")
      .then(r => r.json())
      .then(d => {
        setScores(d.scores ?? []);
        setActions(d.actions ?? []);
        setLeads(d.leads ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const TABS: { id: CrmTab; label: string; icon: React.ReactNode }[] = [
    { id: "killist",  label: "Kill-List",     icon: <Crosshair size={14} /> },
    { id: "pipeline", label: "Pipeline",      icon: <Kanban size={14} /> },
    { id: "leads",    label: "Leads 테이블",   icon: <TableProperties size={14} /> },
  ];

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>CRM Tactics</h1>
          <p className={styles.subtitle}>Focus Scores · Pipeline · Kill-List</p>
        </div>
      </header>

      {/* ── Focus Score bar ── */}
      {!loading && (
        <div className={styles.scoreRow}>
          {scores.map((s, i) => (
            <div key={s.name} className={`${styles.scoreCard} stagger-${i + 1}`}>
              <div className={styles.scoreTop}>
                <span className={styles.scoreName}>{s.name}</span>
                <span className={styles.scoreLabel}
                  style={{ color: s.score >= 80 ? "#4ade80" : s.score >= 55 ? "#fbbf24" : "#f87171" }}>
                  {s.label}
                </span>
              </div>
              <div className={styles.scoreNum} style={{
                color: s.score >= 80 ? "#4ade80" : s.score >= 55 ? "#fbbf24" : "#f87171"
              }}>
                {s.score}
              </div>
              <div className={styles.scoreBar}>
                <div className={styles.scoreBarFill} style={{
                  width: `${s.score}%`,
                  background: s.score >= 80
                    ? "linear-gradient(90deg,#16a34a,#4ade80)"
                    : s.score >= 55
                      ? "linear-gradient(90deg,#d97706,#fbbf24)"
                      : "linear-gradient(90deg,#b91c1c,#ef4444)",
                }} />
              </div>
              <div className={styles.scoreMeta}>
                <span>계약 ₩{(s.won / 1000).toFixed(0)}B</span>
                <span>파이프 ₩{(s.pipeline / 1000).toFixed(0)}B</span>
                <span>{s.deals}건</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <SalesTip offset={21} />

      {/* ── Content ── */}
      {loading ? (
        <div className={styles.loadingBox}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      ) : (
        <>
          {tab === "killist"  && <KillListTab actions={actions} />}
          {tab === "pipeline" && <PipelineTab leads={leads} />}
          {tab === "leads"    && <LeadsTab leads={leads} />}
        </>
      )}
    </div>
  );
}

// ── Kill-List Tab ─────────────────────────────────────────────────────────────
function KillListTab({ actions }: { actions: ActionItem[] }) {
  return (
    <div className={styles.killList}>
      {actions.map((item, idx) => {
        const stageColor = STAGE_COLOR[item.stage] ?? "#818cf8";
        const ownerColor = OWNER_COLORS[item.salesRep] ?? "#818cf8";
        const probNum    = parseInt(item.prob);
        const isUrgent   = item.due.includes("초과") || item.due === "오늘";
        return (
          <div key={idx} className={styles.killCard}>
            <div className={styles.killLeft}>
              <div className={styles.killMeta}>
                <span className={styles.ownerBadge} style={{ background: `${ownerColor}22`, color: ownerColor, borderColor: `${ownerColor}44` }}>
                  {item.salesRep}
                </span>
                <span className={styles.stageBadge} style={{ background: `${stageColor}18`, color: stageColor }}>
                  {item.stage}
                </span>
                <span className={styles.region}>{item.region}</span>
              </div>
              <div className={styles.killCompany}>{item.target}</div>
              <p className={styles.killAction}>{item.action}</p>
            </div>
            <div className={styles.killRight}>
              <div className={styles.probBlock}>
                <span className={styles.probNum} style={{ color: probNum >= 70 ? "#4ade80" : probNum >= 50 ? "#fbbf24" : "#f87171" }}>
                  {item.prob}
                </span>
                <span className={styles.probLabel}>확률</span>
              </div>
              <div className={styles.dueTag} style={{
                color: isUrgent ? "#f87171" : "var(--text-muted)",
                borderColor: isUrgent ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)",
                background: isUrgent ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
              }}>
                {isUrgent && "⚠️ "}{item.due}
              </div>
              <div className={styles.killBtns}>
                <button className={styles.iconBtn}><Phone size={15} /></button>
                <button className={styles.iconBtn}><Mail size={15} /></button>
                <button className={styles.iconBtn}><MessageSquare size={15} /></button>
                <button className={styles.execBtn}>실행 <ArrowRight size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pipeline Kanban Tab ───────────────────────────────────────────────────────
function PipelineTab({ leads }: { leads: Lead[] }) {
  const byStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    STAGES.forEach(s => map.set(s.id, []));
    leads.forEach(l => map.get(l.stage)?.push(l));
    return map;
  }, [leads]);

  return (
    <div className={styles.kanban}>
      {STAGES.map(st => {
        const cards = byStage.get(st.id) ?? [];
        const totalRevenue = cards.reduce((s, c) => s + c.revenue_potential, 0);
        return (
          <div key={st.id} className={styles.kanbanCol}>
            <div className={styles.kanbanHeader} style={{ borderTopColor: st.color }}>
              <div className={styles.kanbanHeaderTop}>
                <span className={styles.kanbanStage} style={{ color: st.color }}>{st.label}</span>
                <span className={styles.kanbanCount} style={{ background: `${st.color}22`, color: st.color }}>
                  {cards.length}
                </span>
              </div>
              <span className={styles.kanbanRevenue}>₩{(totalRevenue / 1000).toFixed(1)}B</span>
            </div>
            <div className={styles.kanbanCards}>
              {cards.map(c => {
                const ownerColor = OWNER_COLORS[c.owner] ?? "#818cf8";
                const isOverdue  = c.due_label.includes("초과");
                return (
                  <div key={c.id} className={styles.dealCard} style={{ borderLeftColor: st.color }}>
                    <div className={styles.dealTop}>
                      <span className={styles.dealCompany}>{c.company}</span>
                      <span className={styles.dealProb} style={{
                        color: c.probability >= 70 ? "#4ade80" : c.probability >= 50 ? "#fbbf24" : "#f87171",
                      }}>{c.probability}%</span>
                    </div>
                    <div className={styles.dealContact}>{c.contact} · {c.region}</div>
                    <div className={styles.dealProbBar}>
                      <div style={{
                        width: `${c.probability}%`, height: "100%", borderRadius: 2,
                        background: st.color, opacity: 0.7,
                        transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                      }} />
                    </div>
                    <div className={styles.dealBottom}>
                      <span className={styles.dealRev}>₩{(c.revenue_potential / 1000).toFixed(1)}B</span>
                      <span className={styles.dealOwner} style={{ color: ownerColor }}>{c.owner}</span>
                      <span className={styles.dealDue} style={{ color: isOverdue ? "#f87171" : "var(--text-muted)" }}>
                        {c.due_label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className={styles.emptyCol}>딜 없음</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pipeline Summary Strip ────────────────────────────────────────────────────
function PipelineStrip({
  leads,
  activeStage,
  onStageClick,
}: {
  leads: Lead[];
  activeStage: string | null;
  onStageClick: (stage: string | null) => void;
}) {
  const stats = useMemo(() => {
    return STAGES.map(st => {
      const rows = leads.filter(l => l.stage === st.id);
      return {
        ...st,
        count: rows.length,
        totalRevenue: rows.reduce((s, l) => s + l.revenue_potential, 0),
      };
    });
  }, [leads]);

  return (
    <div className={styles.pipelineStrip}>
      {stats.map(st => {
        const isActive = activeStage === st.id;
        return (
          <div
            key={st.id}
            className={`${styles.pipelineCard} ${isActive ? styles.pipelineCardActive : ""}`}
            style={{ "--stage-color": st.color } as React.CSSProperties}
            onClick={() => onStageClick(isActive ? null : st.id)}
          >
            {/* colored top bar via ::before color set by style */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: st.color, borderRadius: "0.75rem 0.75rem 0 0" }} />
            <div className={styles.pipelineCardHeader}>
              <span className={styles.pipelineStageLabel} style={{ color: st.color }}>
                {st.label}
              </span>
              <span className={styles.pipelineCount}>{st.count}건</span>
            </div>
            <div className={styles.pipelineRevenue}>
              ₩{st.totalRevenue >= 1000
                ? `${(st.totalRevenue / 1000).toFixed(1)}B`
                : `${st.totalRevenue}M`}
            </div>
            <div className={styles.pipelineRevLabel}>파이프라인 매출</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = {
    critical: { label: "위험", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    warning:  { label: "주의", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    good:     { label: "양호", color: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  }[status];
  return (
    <span
      className={styles.statusBadge}
      style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}44` }}
    >
      {status === "critical" ? "🔴" : status === "warning" ? "🟡" : "🟢"} {cfg.label}
    </span>
  );
}

// ── Leads Table Tab ───────────────────────────────────────────────────────────
type SortKey = keyof Lead;

const QUICK_SORTS: { id: Exclude<QuickSort, null>; label: string }[] = [
  { id: "critical", label: "⚡ 위험 우선"    },
  { id: "revenue",  label: "💰 매출 높은 순" },
  { id: "due",      label: "⏰ 마감 임박 순" },
  { id: "contact",  label: "📞 최근 연락 순" },
];

function LeadsTab({ leads }: { leads: Lead[] }) {
  const [sortKey, setSortKey]       = useState<SortKey>("probability");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [filterOwner, setFilterOwner] = useState("전체");
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [quickSort, setQuickSort]   = useState<QuickSort>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const owners = useMemo(() => ["전체", ...Array.from(new Set(leads.map(l => l.owner)))], [leads]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sorted: LeadWithStatus[] = useMemo(() => {
    const STATUS_ORDER: Record<LeadStatus, number> = { critical: 0, warning: 1, good: 2 };

    let rows: LeadWithStatus[] = leads
      .filter(l =>
        (filterOwner === "전체" || l.owner === filterOwner) &&
        (filterStage === null    || l.stage === filterStage),
      )
      .map(l => ({ ...l, _status: getLeadStatus(l) }));

    if (quickSort === "critical") {
      rows.sort((a, b) => STATUS_ORDER[a._status] - STATUS_ORDER[b._status]);
    } else if (quickSort === "revenue") {
      rows.sort((a, b) => b.revenue_potential - a.revenue_potential);
    } else if (quickSort === "due") {
      rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
    } else if (quickSort === "contact") {
      rows.sort((a, b) => b.last_contact.localeCompare(a.last_contact));
    } else if (sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [leads, filterOwner, filterStage, quickSort, sortKey, sortDir]);

  const maxRevenue = useMemo(
    () => Math.max(...sorted.map(l => l.revenue_potential), 1),
    [sorted],
  );

  const handleSort = (key: SortKey) => {
    setQuickSort(null);
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleQuickSort = (id: Exclude<QuickSort, null>) => {
    setQuickSort(prev => prev === id ? null : id);
    setSortDir(null);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k || !sortDir || quickSort !== null)
      return <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  };

  const totalRevenue = sorted.reduce((s, l) => s + l.revenue_potential, 0);

  // Sortable column headers
  const SORTABLE_COLS: [SortKey, string][] = [
    ["company",           "회사명"],
    ["stage",             "단계"],
    ["probability",       "확률"],
    ["revenue_potential", "예상매출"],
    ["last_contact",      "마지막연락"],
    ["due_label",         "마감"],
  ];

  return (
    <div>
      {/* ── Pipeline Summary Strip ── */}
      <PipelineStrip
        leads={leads}
        activeStage={filterStage}
        onStageClick={setFilterStage}
      />

      {/* ── Quick Sort Chips ── */}
      <div className={styles.quickSortBar}>
        {QUICK_SORTS.map(qs => (
          <button
            key={qs.id}
            className={`${styles.quickSortChip} ${quickSort === qs.id ? styles.quickSortActive : ""}`}
            onClick={() => handleQuickSort(qs.id)}
          >
            {qs.label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>담당자</span>
          {owners.map(o => (
            <button
              key={o}
              className={`${styles.filterChip} ${filterOwner === o ? styles.filterChipActive : ""}`}
              style={filterOwner === o && o !== "전체"
                ? { color: OWNER_COLORS[o], borderColor: `${OWNER_COLORS[o]}55`, background: `${OWNER_COLORS[o]}11` }
                : {}}
              onClick={() => setFilterOwner(o)}
            >{o}</button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>단계</span>
          <button
            className={`${styles.filterChip} ${filterStage === null ? styles.filterChipActive : ""}`}
            onClick={() => setFilterStage(null)}
          >전체</button>
          {STAGES.map(st => (
            <button
              key={st.id}
              className={`${styles.filterChip} ${filterStage === st.id ? styles.filterChipActive : ""}`}
              style={filterStage === st.id
                ? { color: st.color, borderColor: `${st.color}55`, background: `${st.color}11` }
                : {}}
              onClick={() => setFilterStage(prev => prev === st.id ? null : st.id)}
            >{st.label}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap} style={{ overflowX: "auto" }}>
        <table className={styles.table} style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th className={styles.th}>상태</th>
              {SORTABLE_COLS.map(([key, label]) => (
                <th key={key} className={styles.th} onClick={() => handleSort(key)}>
                  <span className={styles.thInner}>{label} <SortIcon k={key} /></span>
                </th>
              ))}
              <th className={styles.th}>다음 액션</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(l => {
              const sc        = STAGE_COLOR[l.stage] ?? "#818cf8";
              const oc        = OWNER_COLORS[l.owner] ?? "#818cf8";
              const isOverdue = l.due_label.includes("초과");
              const isExpanded = expandedIds.has(l.id);

              return (
                <React.Fragment key={l.id}>
                  <tr
                    className={`${styles.tr} ${isExpanded ? styles.trExpanded : ""}`}
                    onClick={() => toggleExpand(l.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* 상태 */}
                    <td className={styles.td}>
                      <StatusBadge status={l._status} />
                    </td>
                    {/* 회사명 */}
                    <td className={styles.td} style={{ fontWeight: 600, color: "var(--foreground)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <ChevronRight
                          size={12}
                          style={{
                            transition: "transform 0.2s",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            opacity: 0.4,
                            flexShrink: 0,
                          }}
                        />
                        <Link
                          href={`/crm/${l.id}`}
                          className={styles.companyLink}
                          onClick={e => e.stopPropagation()}
                        >
                          {l.company}
                          <ExternalLink size={10} style={{ opacity: 0.4, marginLeft: 2, flexShrink: 0 }} />
                        </Link>
                      </span>
                    </td>
                    {/* 단계 */}
                    <td className={styles.td}>
                      <span className={styles.stageTag} style={{ color: sc, background: `${sc}18`, borderColor: `${sc}33` }}>
                        {STAGE_KR[l.stage] ?? l.stage}
                      </span>
                    </td>
                    {/* 확률 */}
                    <td className={styles.td}>
                      <div className={styles.probCell}>
                        <span style={{
                          color: l.probability >= 70 ? "#4ade80" : l.probability >= 50 ? "#fbbf24" : "#f87171",
                          fontWeight: 700,
                          width: 32,
                          display: "inline-block",
                          textAlign: "right",
                        }}>
                          {l.probability}%
                        </span>
                        <div className={styles.miniBar}>
                          <div style={{ width: `${l.probability}%`, height: "100%", borderRadius: 2, background: sc }} />
                        </div>
                      </div>
                    </td>
                    {/* 예상매출 */}
                    <td className={styles.td}>
                      <div className={styles.revCell}>
                        <span style={{ fontWeight: 600 }}>₩{l.revenue_potential.toLocaleString()}M</span>
                        <div className={styles.revBar}>
                          <div style={{
                            width: `${(l.revenue_potential / maxRevenue) * 100}%`,
                            height: "100%",
                            borderRadius: 2,
                            background: "var(--primary)",
                            opacity: 0.65,
                          }} />
                        </div>
                      </div>
                    </td>
                    {/* 마지막연락 */}
                    <td className={styles.td} style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {formatLastContact(l.last_contact)}
                    </td>
                    {/* 마감 */}
                    <td className={styles.td} style={{
                      color: isOverdue ? "#f87171" : "var(--text-muted)",
                      fontWeight: isOverdue ? 700 : 400,
                    }}>
                      {isOverdue && "⚠️ "}{l.due_label}
                    </td>
                    {/* 다음 액션 */}
                    <td className={styles.actionCell} style={{ paddingTop: 12, paddingBottom: 12 }}>
                      {l.action}
                    </td>
                  </tr>

                  {/* ── 확장 행 ── */}
                  {isExpanded && (
                    <tr className={styles.expandRow}>
                      <td colSpan={8}>
                        <div className={styles.expandContent}>
                          <div className={styles.expandField}>
                            <span className={styles.expandLabel}>담당자</span>
                            <span>{l.contact}</span>
                          </div>
                          <div className={styles.expandField}>
                            <span className={styles.expandLabel}>영업담당</span>
                            <span style={{ color: oc, fontWeight: 600 }}>{l.owner}</span>
                          </div>
                          <div className={styles.expandField}>
                            <span className={styles.expandLabel}>지역</span>
                            <span>{l.region}</span>
                          </div>
                          <div className={`${styles.expandField} ${styles.expandAction}`}>
                            <span className={styles.expandLabel}>다음 액션 (전체)</span>
                            <span>{l.action}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <div className={styles.tableFooter}>
          총 {sorted.length}건 · 예상 매출 ₩{totalRevenue.toLocaleString()}M
        </div>
      </div>
    </div>
  );
}
