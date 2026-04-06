"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock3,
  Crosshair,
  Kanban,
  Loader2,
  RefreshCw,
  Search,
  TableProperties,
  UserRound,
  X,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "@/components/Card";
import styles from "./page.module.css";

type CrmTab = "killist" | "pipeline" | "leads";
type StageName = "Lead" | "Proposal" | "Negotiation" | "Contract";
type SortDir = "asc" | "desc" | null;
type SortKey =
  | "company"
  | "contact"
  | "region"
  | "stage"
  | "owner"
  | "probability"
  | "revenue_potential"
  | "due_date"
  | "last_contact";

interface Lead {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: StageName;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  due_label: string;
  action: string;
  notes?: string | null;
  urgencyScore?: number;
  deal_type?: "New" | "Renew" | null;
  product_type?: string | null;
  importance?: string | null;
}

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
  stage: StageName;
  deal_type?: string | null;
  product_type?: string | null;
  importance?: string | null;
}

interface CrmSummary {
  openDeals: number;
  wonDeals: number;
  overdueDeals: number;
  urgentDeals: number;
  weightedPipeline: number;
  totalPotential: number;
  averageProbability: number;
  nextDueLabel: string;
  stageCounts: Record<StageName, number>;
  stageValues: Record<StageName, number>;
  newPipeline: number;
  renewPipeline: number;
  newDeals: number;
  renewDeals: number;
  newWon: number;
  renewWon: number;
}

interface CrmPayload {
  backend: "supabase" | "csv";
  generatedAt: string;
  summary: CrmSummary;
  scores: FocusScore[];
  actions: ActionItem[];
  leads: Lead[];
}

interface ScoreResult {
  lead: { id: number; company: string; contact: string; stage: string; probability: number; owner: string };
  score: {
    urgencyScore: number;
    riskLevel: string;
    expectedValue: number;
    daysSinceContact: number;
    daysUntilDue: number;
    dueLabel: string;
  };
  callScript: string;
}

interface AiModalState {
  open: boolean;
  leadId: number | null;
  company: string;
  data: ScoreResult | null;
  loading: boolean;
  error: string | null;
}

const STAGE_META: Record<StageName, { label: string; color: string; soft: string }> = {
  Lead: { label: "Lead", color: "#64748b", soft: "rgba(100, 116, 139, 0.12)" },
  Proposal: { label: "Proposal", color: "#6366f1", soft: "rgba(99, 102, 241, 0.12)" },
  Negotiation: { label: "Negotiation", color: "#f59e0b", soft: "rgba(245, 158, 11, 0.12)" },
  Contract: { label: "Contract", color: "#22c55e", soft: "rgba(34, 197, 94, 0.12)" },
};

const STAGE_ORDER: StageName[] = ["Lead", "Proposal", "Negotiation", "Contract"];
const STAGE_INDEX: Record<StageName, number> = { Lead: 0, Proposal: 1, Negotiation: 2, Contract: 3 };
const OWNER_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#ef4444"];

const EMPTY_SUMMARY: CrmSummary = {
  openDeals: 0,
  wonDeals: 0,
  overdueDeals: 0,
  urgentDeals: 0,
  weightedPipeline: 0,
  totalPotential: 0,
  averageProbability: 0,
  nextDueLabel: "No open due date",
  stageCounts: { Lead: 0, Proposal: 0, Negotiation: 0, Contract: 0 },
  stageValues: { Lead: 0, Proposal: 0, Negotiation: 0, Contract: 0 },
  newPipeline: 0,
  renewPipeline: 0,
  newDeals: 0,
  renewDeals: 0,
  newWon: 0,
  renewWon: 0,
};

const EMPTY_PAYLOAD: CrmPayload = {
  backend: "csv",
  generatedAt: "",
  summary: EMPTY_SUMMARY,
  scores: [],
  actions: [],
  leads: [],
};

function formatMoney(value: number): string {
  const symbol = typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥';
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

function formatDateTime(value: string): string {
  if (!value) return "Unknown";

  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function normalizePayload(payload: Partial<CrmPayload> | null | undefined): CrmPayload {
  const summary = payload?.summary ?? EMPTY_SUMMARY;

  return {
    backend: payload?.backend ?? "csv",
    generatedAt: payload?.generatedAt ?? "",
    summary: {
      ...EMPTY_SUMMARY,
      ...summary,
      stageCounts: { ...EMPTY_SUMMARY.stageCounts, ...(summary.stageCounts ?? {}) },
      stageValues: { ...EMPTY_SUMMARY.stageValues, ...(summary.stageValues ?? {}) },
      newPipeline: summary.newPipeline ?? 0,
      renewPipeline: summary.renewPipeline ?? 0,
      newDeals: summary.newDeals ?? 0,
      renewDeals: summary.renewDeals ?? 0,
      newWon: summary.newWon ?? 0,
      renewWon: summary.renewWon ?? 0,
    },
    scores: payload?.scores ?? [],
    actions: payload?.actions ?? [],
    leads: payload?.leads ?? [],
  };
}

function getSeoulMidnight(dateValue: string): number | null {
  const normalized = dateValue.trim();
  if (!normalized) return null;

  const parsed = new Date(`${normalized}T00:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function buildFallbackSummary(leads: Lead[]): CrmSummary {
  const summary = { ...EMPTY_SUMMARY };

  for (const lead of leads) {
    summary.totalPotential += lead.revenue_potential;
    summary.averageProbability += lead.probability;
    summary.stageCounts[lead.stage] += 1;
    summary.stageValues[lead.stage] += lead.revenue_potential;

    if (lead.stage === "Contract") {
      summary.wonDeals += 1;
      continue;
    }

    summary.openDeals += 1;
    summary.weightedPipeline += Math.round((lead.revenue_potential * lead.probability) / 100);
    if (lead.due_label.startsWith("Overdue")) summary.overdueDeals += 1;
    if (lead.due_label.startsWith("Overdue") || lead.due_label === "Due today" || lead.due_label === "Due tomorrow" || lead.probability < 45) {
      summary.urgentDeals += 1;
    }
  }

  summary.averageProbability = leads.length ? Math.round(summary.averageProbability / leads.length) : 0;
  const nextDueLead = [...leads]
    .filter((lead) => lead.stage !== "Contract")
    .sort((left, right) => (getSeoulMidnight(left.due_date) ?? Number.POSITIVE_INFINITY) - (getSeoulMidnight(right.due_date) ?? Number.POSITIVE_INFINITY))[0];
  summary.nextDueLabel = nextDueLead?.due_label ?? "No open due date";

  return summary;
}

function getOwnerColors(scores: FocusScore[]): Record<string, string> {
  return Object.fromEntries(scores.map((score, index) => [score.name, OWNER_COLORS[index % OWNER_COLORS.length]]));
}

function getLeadTone(value: number): string {
  if (value >= 80) return "#22c55e";
  if (value >= 60) return "#f59e0b";
  return "#ef4444";
}

function getRiskLevel(lead: Lead): "good" | "watch" | "critical" {
  if (lead.due_label.startsWith("Overdue") || lead.probability < 40) return "critical";
  if (lead.due_label === "Due today" || lead.due_label === "Due tomorrow" || lead.probability < 60) return "watch";
  return "good";
}

function riskTone(risk: "good" | "watch" | "critical"): string {
  if (risk === "good") return "#22c55e";
  if (risk === "watch") return "#f59e0b";
  return "#ef4444";
}

function parseScriptSections(text: string): { title: string; lines: string[] }[] {
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of text.split("\n")) {
    const heading = line.replace(/^##\s*/, "").trim();
    if (line.startsWith("## ") && heading) {
      if (current) sections.push(current);
      current = { title: heading, lines: [] };
      continue;
    }

    if (current) current.lines.push(line);
  }

  if (current) sections.push(current);
  return sections.length ? sections : [{ title: "Call script", lines: text.split("\n") }];
}

function getSortValue(lead: Lead, key: SortKey): string | number {
  switch (key) {
    case "company": return lead.company;
    case "contact": return lead.contact;
    case "region": return lead.region;
    case "stage": return STAGE_INDEX[lead.stage];
    case "owner": return lead.owner;
    case "probability": return lead.probability;
    case "revenue_potential": return lead.revenue_potential;
    case "due_date": return lead.due_date || "9999-12-31";
    case "last_contact": return lead.last_contact || "9999-12-31";
    default: return lead.company;
  }
}

function getNextStage(stage: StageName): StageName | null {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 && index < STAGE_ORDER.length - 1 ? STAGE_ORDER[index + 1] : null;
}

function resolveDropStage(overId: UniqueIdentifier | undefined, leads: Lead[]): StageName | null {
  if (!overId) return null;
  if (typeof overId === "string" && (STAGE_ORDER as readonly string[]).includes(overId)) return overId as StageName;

  const targetId = Number(overId);
  if (Number.isFinite(targetId)) return leads.find((lead) => lead.id === targetId)?.stage ?? null;
  return null;
}

export default function CRMPage() {
  const { language } = require("@/components/SettingsProvider").useSettings();
  const [tab, setTab] = useState<CrmTab>("killist");
  const [payload, setPayload] = useState<CrmPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [dealTypeFilter, setDealTypeFilter] = useState("All");
  const [productTypeFilter, setProductTypeFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("probability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [routeFilterApplied, setRouteFilterApplied] = useState(false);
  const [aiModal, setAiModal] = useState<AiModalState>({
    open: false,
    leadId: null,
    company: "",
    data: null,
    loading: false,
    error: null,
  });

  const loadPayload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crm/leads");
      if (!response.ok) throw new Error(`CRM feed failed with ${response.status}`);

      const json = normalizePayload((await response.json()) as Partial<CrmPayload>);
      const enriched = { ...json, summary: json.summary ?? buildFallbackSummary(json.leads) };
      setPayload(enriched);
      setSelectedLeadId((current) => current ?? enriched.leads[0]?.id ?? null);
    } catch (fetchError) {
      console.error("Failed to fetch CRM data:", fetchError);
      setError("CRM feed could not be loaded. Check the lead source and sync status.");
      setPayload(EMPTY_PAYLOAD);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayload();
  }, [loadPayload]);

  useEffect(() => {
    if (routeFilterApplied || payload.leads.length === 0) {
      return;
    }

    const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
    const company = params?.get("company");
    const region = params?.get("region");
    const initialQuery = company ?? region ?? "";

    if (!initialQuery) {
      setRouteFilterApplied(true);
      return;
    }

    setQuery(initialQuery);

    const matchedLead = payload.leads.find((lead) => {
      if (company) {
        return lead.company.toLowerCase() === company.toLowerCase();
      }

      if (region) {
        return lead.region.toLowerCase() === region.toLowerCase();
      }

      return false;
    });

    if (matchedLead) {
      setSelectedLeadId(matchedLead.id);
      setTab("killist");
    }

    setRouteFilterApplied(true);
  }, [payload.leads, routeFilterApplied]);

  const updateLeadStage = useCallback(async (leadId: number, newStage: StageName) => {
    setPayload((current) => ({
      ...current,
      leads: current.leads.map((lead) => (lead.id === leadId ? { ...lead, stage: newStage } : lead)),
    }));

    try {
      const response = await fetch("/api/crm/leads/update-stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, stage: newStage }),
      });

      if (!response.ok) throw new Error("Lead stage update failed");
      await loadPayload(true);
    } catch (updateError) {
      console.error(updateError);
      setError("Stage update failed. The board has been refreshed from the live feed.");
      await loadPayload(true);
    }
  }, [loadPayload]);

  const openAiScript = useCallback(async (leadId: number, company: string) => {
    setAiModal({ open: true, leadId, company, data: null, loading: true, error: null });

    try {
      const response = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const json = (await response.json()) as ScoreResult & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "AI score failed");
      setAiModal((current) => ({ ...current, loading: false, data: json }));
    } catch (scriptError) {
      console.error("Failed to generate AI score:", scriptError);
      setAiModal((current) => ({
        ...current,
        loading: false,
        error: "AI script could not be generated. Check the scoring API and Gemini key.",
      }));
    }
  }, []);

  const closeAiScript = useCallback(() => {
    setAiModal((current) => ({ ...current, open: false }));
  }, []);

  const ownerColors = useMemo(() => getOwnerColors(payload.scores), [payload.scores]);
  const summary = payload.summary ?? EMPTY_SUMMARY;

  const filteredLeads = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    const filtered = payload.leads.filter((lead) => {
      const matchesQuery =
        !queryText ||
        [lead.company, lead.contact, lead.region, lead.owner, lead.action, lead.stage].join(" ").toLowerCase().includes(queryText);

      return (
        matchesQuery &&
        (ownerFilter === "All" || lead.owner === ownerFilter) &&
        (stageFilter === "All" || lead.stage === stageFilter) &&
        (dealTypeFilter === "All" || lead.deal_type === dealTypeFilter) &&
        (productTypeFilter === "All" || lead.product_type === productTypeFilter)
      );
    });

    if (!sortDir) return filtered;

    return [...filtered].sort((left, right) => {
      const leftValue = getSortValue(left, sortKey);
      const rightValue = getSortValue(right, sortKey);
      let comparison = 0;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), "en");
      }

      if (sortKey === "stage") {
        comparison = STAGE_INDEX[left.stage] - STAGE_INDEX[right.stage];
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [ownerFilter, payload.leads, query, sortDir, sortKey, stageFilter, dealTypeFilter, productTypeFilter]);

  const selectedLead = useMemo(() => {
    return (
      filteredLeads.find((lead) => lead.id === selectedLeadId) ??
      payload.leads.find((lead) => lead.id === selectedLeadId) ??
      filteredLeads[0] ??
      payload.leads[0] ??
      null
    );
  }, [filteredLeads, payload.leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLeadId && filteredLeads[0]) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLeadId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <Loader2 size={42} className={styles.spinner} />
        </div>
      </div>
    );
  }

  const ownerOptions = ["All", ...Array.from(new Set(payload.leads.map((lead) => lead.owner)))];
  const productTypeOptions = ["All", ...Array.from(new Set(payload.leads.map((lead) => lead.product_type).filter(Boolean))) as string[]];

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>{language === "ko" ? "BD 운영 조종석" : "BD operations cockpit"}</div>
          <h1 className={styles.title}>{language === "ko" ? "CRM 전략" : "CRM Tactics"}</h1>
          <p className={styles.subtitle}>{language === "ko" ? "실시간 CRM 피드에서 가져온 핵심 액션 큐, 스테이지 관리 및 리드 정보입니다." : "High-signal action queues, stage control, and lead context from the live CRM feed."}</p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.heroBadge}>{payload.backend === "supabase" ? (language === "ko" ? "라이브 DB" : "Live DB") : (language === "ko" ? "CSV 폴백" : "CSV fallback")}</span>
          <span className={styles.heroBadge}>{language === "ko" ? `업데이트: ${formatDateTime(payload.generatedAt)}` : `Updated ${formatDateTime(payload.generatedAt)}`}</span>
          <button className={styles.refreshBtn} onClick={() => void loadPayload(true)} type="button">
            <RefreshCw size={14} /> {language === "ko" ? "새로고침" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBanner}>
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className={styles.metricGrid}>
        <MetricCard label={language === "ko" ? "전체 딜" : "Total deals"} value={String(summary.newDeals + summary.renewDeals)} sub={`New ${summary.newDeals} / Renew ${summary.renewDeals}`} />
        <MetricCard label={language === "ko" ? "New 수주" : "New won"} value={formatMoney(summary.newWon)} sub={`${language === "ko" ? "파이프" : "pipe"} ${formatMoney(summary.newPipeline)}`} />
        <MetricCard label={language === "ko" ? "Renew 수주" : "Renew won"} value={formatMoney(summary.renewWon)} sub={`${language === "ko" ? "파이프" : "pipe"} ${formatMoney(summary.renewPipeline)}`} />
        <MetricCard label={language === "ko" ? "가중 파이프라인" : "Weighted pipeline"} value={formatMoney(summary.weightedPipeline)} sub={`${language === "ko" ? "평균 확률" : "Avg"} ${summary.averageProbability}% · ${summary.urgentDeals} ${language === "ko" ? "긴급" : "urgent"}`} tone={summary.urgentDeals > 0 ? "watch" : "neutral"} />
      </div>

      <div className={styles.scoreStrip}>
        {payload.scores.map((score) => {
          const tone = score.score >= 80 ? "good" : score.score >= 55 ? "watch" : "critical";
          const color = tone === "good" ? "#22c55e" : tone === "watch" ? "#f59e0b" : "#ef4444";
          return (
            <div key={score.name} className={styles.scoreCard}>
              <div className={styles.scoreCardTop}>
                <span className={styles.scoreName}>{score.name}</span>
                <span className={styles.scoreLabel} style={{ color }}>{score.label}</span>
              </div>
              <div className={styles.scoreValue} style={{ color }}>{score.score}</div>
              <div className={styles.scoreBar}><div className={styles.scoreBarFill} style={{ width: `${score.score}%`, background: color }} /></div>
              <div className={styles.scoreMeta}>
                <span>{language === "ko" ? `수주 ${formatMoney(score.won)}` : `Won ${formatMoney(score.won)}`}</span>
                <span>{language === "ko" ? `파이프 ${formatMoney(score.pipeline)}` : `Pipe ${formatMoney(score.pipeline)}`}</span>
                <span>{score.deals} {language === "ko" ? "딜" : "deals"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.tabBar}>
        {[
          { id: "killist", label: language === "ko" ? "킬 리스트" : "Kill list", icon: <Crosshair size={14} /> },
          { id: "pipeline", label: language === "ko" ? "파이프라인" : "Pipeline", icon: <Kanban size={14} /> },
          { id: "leads", label: language === "ko" ? "리드" : "Leads", icon: <TableProperties size={14} /> },
        ].map((item) => (
          <button key={item.id} className={`${styles.tabBtn} ${tab === item.id ? styles.tabBtnActive : ""}`} onClick={() => setTab(item.id as CrmTab)} type="button">
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolRow}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === "ko" ? "회사, 담당자, 지역, 스테이지 또는 액션 검색" : "Search company, owner, region, stage, or action"} className={styles.searchInput} />
        </div>
        <div className={styles.filterWrap}>
          <FilterChipGroup label={language === "ko" ? "소유자" : "Owner"} values={ownerOptions} activeValue={ownerFilter} onChange={setOwnerFilter} colorMap={ownerColors} />
          <FilterChipGroup label={language === "ko" ? "스테이지" : "Stage"} values={["All", ...STAGE_ORDER]} activeValue={stageFilter} onChange={(value) => setStageFilter(value as "All" | StageName)} colorMap={Object.fromEntries(Object.entries(STAGE_META).map(([key, value]) => [key, value.color]))} />
          <FilterChipGroup label={language === "ko" ? "딜 유형" : "Type"} values={["All", "New", "Renew"]} activeValue={dealTypeFilter} onChange={setDealTypeFilter} />
          <FilterChipGroup label={language === "ko" ? "제품" : "Product"} values={productTypeOptions} activeValue={productTypeFilter} onChange={setProductTypeFilter} />
        </div>
      </div>

      {tab === "killist" ? (
        <div className={styles.tabLayout}>
          <div className={styles.mainColumn}>
            <Card className={styles.panel} title={language === "ko" ? "우선순위 큐" : "Priority queue"}>
              <div className={styles.panelHeaderMeta}>
                <span>{payload.actions.length} {language === "ko" ? "개 라이브 액션" : "live actions"}</span>
                <span>{summary.overdueDeals} {language === "ko" ? "개 기한 초과" : "overdue"}</span>
                <span>{summary.nextDueLabel}</span>
              </div>
              <div className={styles.actionList}>
                {payload.actions.map((action, index) => {
                  const lead = payload.leads.find((item) => item.company === action.target && item.owner === action.salesRep) ?? null;
                  const ownerColor = ownerColors[action.salesRep] ?? OWNER_COLORS[index % OWNER_COLORS.length];
                  const stageMeta = STAGE_META[action.stage];
                  const risk = lead ? getRiskLevel(lead) : "watch";
                  const nextStage = lead ? getNextStage(lead.stage) : null;

                  return (
                    <div key={`${action.salesRep}-${action.target}-${action.stage}-${action.due}-${index}`} className={`${styles.actionCard} ${selectedLead?.company === action.target ? styles.actionCardActive : ""}`} onClick={() => lead && setSelectedLeadId(lead.id)}>
                      <div className={styles.actionCardLeft}>
                        <div className={styles.badgeRow}>
                          <span className={styles.ownerBadge} style={{ color: ownerColor, borderColor: `${ownerColor}44`, background: `${ownerColor}12` }}>{action.salesRep}</span>
                          <span className={styles.stageBadge} style={{ color: stageMeta.color, borderColor: `${stageMeta.color}44`, background: stageMeta.soft }}>{stageMeta.label}</span>
                          {action.deal_type ? <span className={styles.riskBadge} style={{ color: action.deal_type === "Renew" ? "#06b6d4" : "#8b5cf6", borderColor: action.deal_type === "Renew" ? "#06b6d433" : "#8b5cf633" }}>{action.deal_type}</span> : null}
                          {action.importance === "KA" ? <span className={styles.riskBadge} style={{ color: "#f59e0b", borderColor: "#f59e0b33" }}>KA</span> : null}
                          <span className={styles.regionTag}>{action.region}</span>
                        </div>
                        <div className={styles.actionTitleRow}>
                          <div>
                            <div className={styles.actionTitle}>
                              {action.target}
                              {action.product_type ? <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", fontWeight: 400 }}>· {action.product_type}</span> : null}
                            </div>
                            <div className={styles.actionMeta}>{action.action}</div>
                          </div>
                          <div className={styles.actionScore}>
                            <span className={styles.actionScoreValue} style={{ color: getLeadTone(Number.parseInt(action.prob, 10) || 0) }}>{action.prob}</span>
                            <span className={styles.actionScoreLabel}>confidence</span>
                          </div>
                        </div>
                        <div className={styles.actionFooter}>
                          <div className={styles.actionBadges}>
                            <span className={styles.actionPill}><Clock3 size={12} />{action.due}</span>
                            {lead ? <span className={styles.actionPill}><UserRound size={12} />{lead.contact}</span> : null}
                          </div>
                          <div className={styles.actionButtons}>
                            <button className={styles.secondaryBtn} type="button" onClick={(event) => { event.stopPropagation(); if (lead) void openAiScript(lead.id, lead.company); }} disabled={!lead}><Brain size={13} /> {language === "ko" ? "AI 스크립트" : "AI script"}</button>
                            <button className={styles.primaryBtn} type="button" onClick={(event) => { event.stopPropagation(); if (lead) setSelectedLeadId(lead.id); }} disabled={!lead}>{language === "ko" ? "브리프 열기" : "Open brief"} <ArrowRight size={13} /></button>
                            <button className={styles.iconBtn} type="button" title={nextStage ? `Advance to ${nextStage}` : "Closed"} onClick={(event) => { event.stopPropagation(); if (lead && nextStage) void updateLeadStage(lead.id, nextStage); }} disabled={!lead || !nextStage}><CheckCircle2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
          <div className={styles.railColumn}>
            <Card className={styles.panel} title={language === "ko" ? "딜 브리프" : "Deal brief"}>
              {selectedLead ? <LeadDetailPanel lead={selectedLead} ownerColor={ownerColors[selectedLead.owner] ?? "#818cf8"} onAi={(lead) => void openAiScript(lead.id, lead.company)} onAdvance={(lead) => { const nextStage = getNextStage(lead.stage); if (nextStage) void updateLeadStage(lead.id, nextStage); }} language={language} /> : <p className={styles.emptyState}>{language === "ko" ? "리드를 선택하면 운영 컨텍스트를 확인할 수 있습니다." : "Select a lead to see the operating context."}</p>}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "pipeline" ? <PipelineBoard leads={filteredLeads} summary={summary} ownerColors={ownerColors} selectedLeadId={selectedLeadId} onOpenLead={(leadId) => setSelectedLeadId(leadId)} onUpdateStage={updateLeadStage} language={language} /> : null}

      {tab === "leads" ? (
        <div className={styles.tabLayout}>
          <div className={styles.mainColumn}>
            <Card className={styles.panel} title={language === "ko" ? "리드 테이블" : "Lead table"}>
              <div className={styles.panelHeaderMeta}>
                <span>{filteredLeads.length} {language === "ko" ? "개 리드" : "leads shown"}</span>
                <span>{formatMoney(filteredLeads.reduce((sum, lead) => sum + lead.revenue_potential, 0))}</span>
                <span>{summary.openDeals} {language === "ko" ? "진행 /" : "open /"} {summary.wonDeals} {language === "ko" ? "완료" : "won"}</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {(([["company", language === "ko" ? "회사" : "Company"], ["contact", language === "ko" ? "담당자" : "Contact"], ["region", language === "ko" ? "지역" : "Region"], ["stage", language === "ko" ? "스테이지" : "Stage"], ["owner", language === "ko" ? "소유자" : "Owner"], ["probability", language === "ko" ? "확률" : "Conf."], ["revenue_potential", language === "ko" ? "잠재 매출" : "Potential"], ["due_date", language === "ko" ? "마감일" : "Due"]]) as [SortKey, string][]).map(([key, label]) => (
                        <th key={key} className={styles.th} onClick={() => { if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : current === "desc" ? null : "asc")); else { setSortKey(key); setSortDir("desc"); } }}>
                          <span className={styles.thInner}>{label}<SortIcon activeKey={sortKey} activeDir={sortDir} thisKey={key} /></span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const stageMeta = STAGE_META[lead.stage];
                      const ownerColor = ownerColors[lead.owner] ?? "#818cf8";
                      return (
                        <tr key={lead.id} className={`${styles.tr} ${selectedLead?.id === lead.id ? styles.trActive : ""}`} onClick={() => setSelectedLeadId(lead.id)}>
                          <td className={styles.td}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span>{lead.company}</span>
                              {lead.importance === "KA" ? <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>KA</span> : null}
                            </div>
                          </td>
                          <td className={styles.td}>{lead.contact}</td>
                          <td className={styles.td}>{lead.region}</td>
                          <td className={styles.td}><span className={styles.stageTag} style={{ color: stageMeta.color, background: stageMeta.soft, borderColor: `${stageMeta.color}44` }}>{stageMeta.label}</span></td>
                          <td className={styles.td}><span style={{ color: ownerColor, fontWeight: 700 }}>{lead.owner}</span></td>
                          <td className={styles.td}><div className={styles.probCell}><span style={{ color: getLeadTone(lead.probability), fontWeight: 700, width: 42, display: "inline-block", textAlign: "right" }}>{lead.probability}%</span><div className={styles.miniBar}><div style={{ width: `${lead.probability}%`, height: "100%", borderRadius: 999, background: stageMeta.color }} /></div></div></td>
                          <td className={styles.td}>{formatMoney(lead.revenue_potential)}</td>
                          <td className={styles.td}><div className={styles.dateStack}><span className={styles.dueText}>{lead.due_label}</span><span className={styles.contactText}>{lead.deal_type ?? "-"} · {lead.product_type ?? "-"}</span></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div className={styles.railColumn}>
            <Card className={styles.panel} title={language === "ko" ? "리드 상세" : "Lead detail"}>
              {selectedLead ? <LeadDetailPanel lead={selectedLead} ownerColor={ownerColors[selectedLead.owner] ?? "#818cf8"} onAi={(lead) => void openAiScript(lead.id, lead.company)} onAdvance={(lead) => { const nextStage = getNextStage(lead.stage); if (nextStage) void updateLeadStage(lead.id, nextStage); }} language={language} /> : <p className={styles.emptyState}>{language === "ko" ? "행을 선택하면 딜 컨텍스트를 확인할 수 있습니다." : "Select a row to inspect the deal context."}</p>}
            </Card>
          </div>
        </div>
      ) : null}

      {aiModal.open ? <AIScriptModal modal={aiModal} onClose={closeAiScript} language={language} /> : null}
    </div>
  );
}

function MetricCard({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub: string; tone?: "neutral" | "good" | "watch" | "critical"; }) {
  const color = tone === "good" ? "#22c55e" : tone === "watch" ? "#f59e0b" : tone === "critical" ? "#ef4444" : "#94a3b8";
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={{ color }}>{value}</div>
      <div className={styles.metricSub}>{sub}</div>
    </div>
  );
}

function FilterChipGroup({ label, values, activeValue, onChange, colorMap }: { label: string; values: string[]; activeValue: string; onChange: (value: string) => void; colorMap?: Record<string, string>; }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      {values.map((value) => {
        const activeColor = colorMap?.[value];
        const isActive = activeValue === value;
        return (
          <button key={value} className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`} style={isActive && activeColor ? { color: activeColor, borderColor: `${activeColor}55`, background: `${activeColor}12` } : undefined} onClick={() => onChange(value)} type="button">
            {value}
          </button>
        );
      })}
    </div>
  );
}

function SortIcon({ activeKey, activeDir, thisKey }: { activeKey: SortKey; activeDir: SortDir; thisKey: SortKey; }) {
  if (activeKey !== thisKey || !activeDir) return <ChevronsUpDown size={11} className={styles.sortIcon} />;
  return activeDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
}

function LeadDetailPanel({ lead, ownerColor, onAi, onAdvance, language = "en" }: { lead: Lead; ownerColor: string; onAi: (lead: Lead) => void; onAdvance: (lead: Lead) => void; language?: string; }) {
  const risk = getRiskLevel(lead);
  const nextStage = getNextStage(lead.stage);

  return (
    <div className={styles.detailCard}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.detailName}>{lead.company}</div>
          <div className={styles.detailMeta}><span style={{ color: ownerColor, fontWeight: 700 }}>{lead.owner}</span><span>•</span><span>{lead.region}</span></div>
        </div>
        <div className={styles.detailScoreWrap}><span className={styles.detailScore}>{lead.probability}%</span><span className={styles.detailRisk} style={{ color: riskTone(risk) }}>{risk.toUpperCase()}</span></div>
      </div>

      <div className={styles.detailList}>
        <div className={styles.detailRow}><span>{language === "ko" ? "스테이지" : "Stage"}</span><strong>{lead.stage}</strong></div>
        <div className={styles.detailRow}><span>{language === "ko" ? "담당자" : "Contact"}</span><strong>{lead.contact}</strong></div>
        <div className={styles.detailRow}><span>{language === "ko" ? "잠재 매출" : "Potential"}</span><strong>{formatMoney(lead.revenue_potential)}</strong></div>
        <div className={styles.detailRow}><span>{language === "ko" ? "마감일" : "Due"}</span><strong>{lead.due_label}</strong></div>
        <div className={styles.detailRow}><span>{language === "ko" ? "최근 연락" : "Last contact"}</span><strong>{formatDateTime(lead.last_contact)}</strong></div>
      </div>

      <div className={styles.detailAction}>{lead.action}</div>
      <div className={styles.detailButtons}>
        <button className={styles.secondaryBtn} type="button" onClick={() => onAi(lead)}><Brain size={13} /> {language === "ko" ? "AI 스크립트" : "AI script"}</button>
        <button className={styles.primaryBtn} type="button" onClick={() => onAdvance(lead)} disabled={!nextStage}>{nextStage ? `${language === "ko" ? `${nextStage}(으)로 진행` : `Advance to ${nextStage}`}` : (language === "ko" ? "완료" : "Closed")}<ArrowRight size={13} /></button>
      </div>
      {lead.notes ? <div className={styles.noteItem}>{lead.notes}</div> : null}
    </div>
  );
}

function PipelineBoard({ leads, summary, ownerColors, selectedLeadId, onOpenLead, onUpdateStage, language = "en" }: { leads: Lead[]; summary: CrmSummary; ownerColors: Record<string, string>; selectedLeadId: number | null; onOpenLead: (leadId: number) => void; onUpdateStage: (leadId: number, stage: StageName) => void; language?: string; }) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byStage = useMemo(() => {
    const map = new Map<StageName, Lead[]>();
    STAGE_ORDER.forEach((stage) => map.set(stage, []));
    leads.forEach((lead) => map.get(lead.stage)?.push(lead));
    return map;
  }, [leads]);

  const byId = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const sourceLead = byId.get(Number(event.active.id));
    const targetStage = resolveDropStage(event.over?.id, leads);
    if (sourceLead && targetStage && targetStage !== sourceLead.stage) {
      void onUpdateStage(sourceLead.id, targetStage);
    }
    setActiveLead(null);
  }, [byId, leads, onUpdateStage]);

  return (
    <div className={styles.pipelineWrap}>
      <Card className={styles.panel} title={language === "ko" ? "파이프라인 보드" : "Pipeline board"}>
        <div className={styles.panelHeaderMeta}><span>{summary.openDeals} {language === "ko" ? "개 진행 딜" : "open deals"}</span><span>{summary.urgentDeals} {language === "ko" ? "개 긴급" : "urgent"}</span><span>{summary.nextDueLabel}</span></div>
        <div className={styles.pipelineIntro}>
          <div className={styles.pipelineIntroText}>{language === "ko" ? "다음 액션이 명확할 때만 카드를 드래그하세요." : "Drag cards only when the next action is clear."}</div>
          <div className={styles.pipelineIntroStats}>{STAGE_ORDER.map((stage) => <span key={stage} className={styles.pipelineStat}><strong>{summary.stageCounts[stage]}</strong><span>{stage}</span></span>)}</div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(event: DragStartEvent) => setActiveLead(byId.get(Number(event.active.id)) ?? null)}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.kanban}>
            {STAGE_ORDER.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={byStage.get(stage) ?? []}
                ownerColors={ownerColors}
                onOpenLead={onOpenLead}
                selectedLeadId={selectedLeadId}
                language={language}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.45" } } }) }}>
            {activeLead ? <PipelineCard lead={activeLead} ownerColor={ownerColors[activeLead.owner] ?? "#818cf8"} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </Card>
    </div>
  );
}

function PipelineColumn({ stage, leads, ownerColors, onOpenLead, selectedLeadId, language = "en" }: { stage: StageName; leads: Lead[]; ownerColors: Record<string, string>; onOpenLead: (leadId: number) => void; selectedLeadId: number | null; language?: string; }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const stageMeta = STAGE_META[stage];
  const totalRevenue = leads.reduce((sum, lead) => sum + lead.revenue_potential, 0);
  const averageProbability = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.probability, 0) / leads.length) : 0;

  return (
    <div ref={setNodeRef} className={`${styles.kanbanCol} ${isOver ? styles.kanbanColHover : ""}`}>
      <div className={styles.kanbanHeader} style={{ borderTopColor: stageMeta.color }}>
        <div className={styles.kanbanHeaderTop}><span className={styles.kanbanStage} style={{ color: stageMeta.color }}>{stageMeta.label}</span><span className={styles.kanbanCount} style={{ background: `${stageMeta.color}22`, color: stageMeta.color }}>{leads.length}</span></div>
        <div className={styles.kanbanHeaderMeta}><span>{formatMoney(totalRevenue)}</span><span>{averageProbability}% {language === "ko" ? "평균" : "avg"}</span></div>
      </div>
      <div className={styles.kanbanCards}>
        <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => <PipelineCard key={lead.id} lead={lead} ownerColor={ownerColors[lead.owner] ?? "#818cf8"} selected={selectedLeadId === lead.id} onOpenLead={onOpenLead} />)}
        </SortableContext>
        {leads.length === 0 ? <div className={styles.emptyCol}>{language === "ko" ? "이 스테이지에 딜이 없습니다." : "No deals in this stage."}</div> : null}
      </div>
    </div>
  );
}

function PipelineCard({ lead, ownerColor, selected = false, dragging = false, onOpenLead }: { lead: Lead; ownerColor: string; selected?: boolean; dragging?: boolean; onOpenLead?: (leadId: number) => void; }) {
  const stageMeta = STAGE_META[lead.stage];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { lead } });
  const dragState = dragging || isDragging;

  return (
    <div ref={setNodeRef} className={`${styles.dealCard} ${selected ? styles.dealCardSelected : ""} ${dragState ? styles.dealCardDragging : ""}`} style={{ transform: CSS.Transform.toString(transform), transition, borderLeftColor: stageMeta.color }} {...attributes} {...listeners}>
      <button className={styles.dealCardButton} type="button" onClick={() => onOpenLead?.(lead.id)}>
        <div className={styles.dealTop}><span className={styles.dealCompany}>{lead.company}</span><span className={styles.dealProb} style={{ color: getLeadTone(lead.probability) }}>{lead.probability}%</span></div>
        <div className={styles.dealContact}>{lead.contact} • {lead.region}</div>
        <div className={styles.dealProbBar}><div style={{ width: `${lead.probability}%`, height: "100%", borderRadius: 999, background: stageMeta.color }} /></div>
        <div className={styles.dealBottom}><span className={styles.dealRev}>{formatMoney(lead.revenue_potential)}</span><span className={styles.dealOwner} style={{ color: ownerColor }}>{lead.owner}</span><span className={styles.dealDue}>{lead.due_label}</span></div>
      </button>
    </div>
  );
}

function AIScriptModal({ modal, onClose, language = "en" }: { modal: AiModalState; onClose: () => void; language?: string; }) {
  const sections = modal.data?.callScript ? parseScriptSections(modal.data.callScript) : [];

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalEyebrow}>{language === "ko" ? "AI 콜 브리핑" : "AI call brief"}</div>
            <h3 className={styles.modalTitle}>{modal.company}</h3>
          </div>
          <button className={styles.iconBtn} type="button" onClick={onClose}><X size={14} /></button>
        </div>

        {modal.loading ? (
          <div className={styles.modalLoading}>
            <Loader2 size={28} className={styles.spinner} />
            <span>{language === "ko" ? "라이브 점수에서 스크립트를 생성 중..." : "Generating a sharper script from the live score..."}</span>
          </div>
        ) : modal.error ? (
          <div className={styles.errorBanner}><AlertTriangle size={15} /><span>{modal.error}</span></div>
        ) : modal.data ? (
          <>
            <div className={styles.aiScoreGrid}>
              <div className={styles.aiScoreItem}><span>{language === "ko" ? "긴급도" : "Urgency"}</span><strong>{modal.data.score.urgencyScore}/100</strong></div>
              <div className={styles.aiScoreItem}><span>{language === "ko" ? "리스크" : "Risk"}</span><strong>{modal.data.score.riskLevel}</strong></div>
              <div className={styles.aiScoreItem}><span>{language === "ko" ? "기대 가치" : "Expected value"}</span><strong>{formatMoney(modal.data.score.expectedValue)}</strong></div>
              <div className={styles.aiScoreItem}><span>{language === "ko" ? "마감일" : "Due"}</span><strong>{modal.data.score.dueLabel}</strong></div>
            </div>
            <div className={styles.scriptSections}>
              {sections.map((section) => (
                <div key={section.title} className={styles.scriptSection}>
                  <div className={styles.scriptSectionTitle}>{section.title}</div>
                  <div className={styles.scriptSectionBody}>
                    {section.lines.filter((line) => line.trim().length > 0).map((line) => <p key={line}>{line}</p>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
