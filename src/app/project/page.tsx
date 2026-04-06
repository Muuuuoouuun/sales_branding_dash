"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Waypoints,
} from "lucide-react";
import Card from "@/components/Card";
import { formatRevenue } from "@/lib/formatCurrency";
import PipelineKanban from "@/components/PipelineKanban";
import type { DashboardPayload, IndividualData, RegionData } from "@/types/dashboard";
import styles from "./page.module.css";

type Tab = "okr" | "pipeline" | "methodology" | "ai";
type MethodologyId = "Challenger" | "SPIN" | "MEDDIC" | "Sandler";

interface CrmLead {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: "Lead" | "Proposal" | "Negotiation" | "Contract";
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  due_label: string;
  action: string;
}

interface CrmScore {
  name: string;
  score: number;
  label: string;
  won: number;
  pipeline: number;
  deals: number;
}

interface CrmAction {
  salesRep: string;
  target: string;
  prob: string;
  action: string;
  due: string;
  region: string;
  stage: string;
}

interface CrmPayload {
  scores: CrmScore[];
  actions: CrmAction[];
  leads: CrmLead[];
}

const EMPTY_DASHBOARD: DashboardPayload = {
  stats: [],
  regional: [],
  bottleneck: [],
  individuals: [],
  focusAccounts: [],
  topAccounts: [],
  hotDeals: [],
  teamSummary: {
    targetRevenue: 0,
    actualRevenue: 0,
    gapRevenue: 0,
    attainment: 0,
    accountCount: 0,
    activatedCount: 0,
    newRevenue: 0,
    renewRevenue: 0,
    directRevenue: 0,
    channelRevenue: 0,
    activityGoal: 0,
    activityActual: 0,
    activityCompletion: 0,
    topManager: "TBD",
    criticalRegionCount: 0,
  },
  pacing: [],
  aging: [],
  periodLabel: "BD Team",
  dataSource: "fallback",
  lastUpdated: "",
};

const EMPTY_DATA = {
  dashboard: EMPTY_DASHBOARD,
  crm: { scores: [], actions: [], leads: [] } as CrmPayload,
};

const METHOD_COPY: Record<MethodologyId, {
  label: string;
  summary: string;
  bestFor: string;
  whenToUse: string;
  tip: string;
  quote: string;
  color: string;
  stages: { label: string; desc: string }[];
  principles: string[];
}> = {
  Challenger: {
    label: "Challenger",
    summary: "문제 정의를 바꾸는 통찰형 세일즈.",
    bestFor: "문제 인식이 약한 고객, 차별화가 필요한 딜",
    whenToUse: "고객이 스스로 urgency를 못 느낄 때",
    tip: "설명보다 먼저 '왜 지금 바꿔야 하는가'를 보여주세요.",
    quote: "Teach something useful before you ask for action.",
    color: "#6366f1",
    stages: [
      { label: "Warm-up", desc: "대화 권한 확보" },
      { label: "Reframe", desc: "가정 뒤집기" },
      { label: "Impact", desc: "비용/기회 수치화" },
      { label: "New way", desc: "새 접근법 제시" },
      { label: "Solution", desc: "실행안 연결" },
    ],
    principles: ["Teach with a commercial point of view.", "Tailor the story to the buyer's context.", "Control the next step.", "Back claims with evidence."],
  },
  SPIN: {
    label: "SPIN",
    summary: "질문으로 니즈를 명확히 만드는 구조.",
    bestFor: "복합 니즈, 내부 합의가 필요한 딜",
    whenToUse: "고객의 pain point가 흐릿할 때",
    tip: "문제-영향-해결의 순서로 대화를 끌고 가세요.",
    quote: "Great questions make the buyer do part of the selling.",
    color: "#22c55e",
    stages: [
      { label: "Situation", desc: "현재 상황" },
      { label: "Problem", desc: "문제 인식" },
      { label: "Implication", desc: "확대되는 비용" },
      { label: "Need-payoff", desc: "해결의 가치" },
    ],
    principles: ["Ask before you explain.", "Move from symptom to consequence.", "Connect pain to business impact.", "Close with a payoff the buyer can repeat."],
  },
  MEDDIC: {
    label: "MEDDIC",
    summary: "대형 딜의 검증 프레임.",
    bestFor: "승인 구조가 복잡한 enterprise deal",
    whenToUse: "의사결정 경로가 길고 리스크가 높을 때",
    tip: "Economic Buyer와 Champion을 분리해서 보세요.",
    quote: "If you cannot map the process, you cannot forecast the deal.",
    color: "#f59e0b",
    stages: [
      { label: "Metrics", desc: "정량 성과" },
      { label: "Economic Buyer", desc: "최종 승인자" },
      { label: "Criteria", desc: "선정 기준" },
      { label: "Process", desc: "의사결정 절차" },
      { label: "Pain", desc: "고통 지점" },
      { label: "Champion", desc: "내부 우군" },
    ],
    principles: ["No metrics, no conviction.", "Champion 없는 딜은 길어집니다.", "Decision process is a map.", "Competition should be visible early."],
  },
  Sandler: {
    label: "Sandler",
    summary: "자격 검증과 상담 구조를 분명히 하는 방식.",
    bestFor: "짧은 사이클, 직접 판매, 빠른 자격 판별",
    whenToUse: "예산/결정 구조를 먼저 확인해야 할 때",
    tip: "Pain, budget, decision을 빠르게 확인하세요.",
    quote: "The best sales conversations are honest conversations.",
    color: "#ef4444",
    stages: [
      { label: "Bonding", desc: "관계/계약 범위" },
      { label: "Pain", desc: "핵심 불편" },
      { label: "Budget", desc: "예산 존재 여부" },
      { label: "Decision", desc: "승인 경로" },
      { label: "Fulfillment", desc: "해결 범위" },
      { label: "Post-sell", desc: "확장 준비" },
    ],
    principles: ["Up-front contract first.", "Qualification is a service.", "A clean no is better than a fuzzy maybe.", "Pain without budget is a weak forecast."],
  },
};

type MethodologyCardCopy = {
  label: string;
  summary: string;
  bestFor: string;
  whenToUse: string;
  tip: string;
  quote: string;
  color: string;
  stages: { label: string; desc: string }[];
  principles: string[];
};

const PROJECT_METHOD_COPY: Record<MethodologyId, MethodologyCardCopy> = {
  Challenger: {
    label: "Challenger",
    summary: "Frame the business problem before you pitch the product.",
    bestFor: "Complex deals where the buyer needs a sharper commercial point of view.",
    whenToUse: "Use when the customer sees symptoms but has not named the cost.",
    tip: "Teach first, then tailor the solution.",
    quote: "Insight earns attention before features do.",
    color: "#6366f1",
    stages: [
      { label: "Warm-up", desc: "Establish context and credibility." },
      { label: "Reframe", desc: "Name the missed cost of staying put." },
      { label: "Impact", desc: "Show the business consequence." },
      { label: "New path", desc: "Offer a better operating model." },
      { label: "Solution", desc: "Connect the new path to our offer." },
    ],
    principles: [
      "Lead with a commercial point of view.",
      "Tailor the message to the buyer's reality.",
      "Control the next step with purpose.",
      "Support claims with evidence from the sheet.",
    ],
  },
  SPIN: {
    label: "SPIN",
    summary: "Use structured questions to uncover need, urgency, and impact.",
    bestFor: "Discovery-heavy conversations and early-stage deals.",
    whenToUse: "Use when the buyer understands the symptom but not the consequence.",
    tip: "Let the buyer name the pain in their own words.",
    quote: "Great questions make the buyer do part of the selling.",
    color: "#22c55e",
    stages: [
      { label: "Situation", desc: "Set the operating context." },
      { label: "Problem", desc: "Surface the real friction." },
      { label: "Implication", desc: "Quantify the cost of inaction." },
      { label: "Need-payoff", desc: "Show why change is worth it." },
    ],
    principles: [
      "Ask before you explain.",
      "Move from symptom to consequence.",
      "Connect pain to business impact.",
      "Close with a payoff the buyer can repeat.",
    ],
  },
  MEDDIC: {
    label: "MEDDIC",
    summary: "Qualify complex deals with metrics, process, and buyer clarity.",
    bestFor: "Enterprise pursuits with multiple stakeholders and longer cycles.",
    whenToUse: "Use when the decision path is unclear or the forecast is at risk.",
    tip: "Map the economic buyer, criteria, and process early.",
    quote: "If you cannot map the process, you cannot forecast the deal.",
    color: "#f59e0b",
    stages: [
      { label: "Metrics", desc: "Tie the deal to measurable outcomes." },
      { label: "Economic buyer", desc: "Confirm who can approve the change." },
      { label: "Criteria", desc: "Understand the decision standard." },
      { label: "Process", desc: "Map the path to signature." },
      { label: "Pain", desc: "Clarify the business problem." },
      { label: "Champion", desc: "Identify the internal driver." },
    ],
    principles: [
      "No metrics, no conviction.",
      "No champion means the deal is still fragile.",
      "Decision process is a map, not a guess.",
      "Competition should be visible early.",
    ],
  },
  Sandler: {
    label: "Sandler",
    summary: "Qualify fit early and keep the conversation mutually honest.",
    bestFor: "Direct selling, renewals, and pipeline clean-up.",
    whenToUse: "Use when budget, pain, or decision clarity are weak.",
    tip: "Make pain, budget, and decision criteria explicit.",
    quote: "The best sales conversations are honest conversations.",
    color: "#ef4444",
    stages: [
      { label: "Bonding", desc: "Create a practical working tone." },
      { label: "Pain", desc: "Surface the actual discomfort." },
      { label: "Budget", desc: "Check whether the deal can be funded." },
      { label: "Decision", desc: "Confirm the path to a decision." },
      { label: "Fulfillment", desc: "Lock the expected outcome." },
      { label: "Post-sell", desc: "Set the handoff and next steps." },
    ],
    principles: [
      "Set the contract up front.",
      "Qualification is a service, not a gate.",
      "A clean no is better than a fuzzy maybe.",
      "Pain without budget is a weak forecast.",
    ],
  },
};

void METHOD_COPY;

function normalizeDashboard(payload: Partial<DashboardPayload> | null | undefined): DashboardPayload {
  return {
    ...EMPTY_DASHBOARD,
    ...(payload ?? {}),
    stats: payload?.stats ?? [],
    regional: payload?.regional ?? [],
    bottleneck: payload?.bottleneck ?? [],
    individuals: payload?.individuals ?? [],
    focusAccounts: payload?.focusAccounts ?? [],
    topAccounts: payload?.topAccounts ?? [],
    hotDeals: payload?.hotDeals ?? [],
    pacing: payload?.pacing ?? [],
    aging: payload?.aging ?? [],
    teamSummary: { ...EMPTY_DASHBOARD.teamSummary, ...(payload?.teamSummary ?? {}) },
  };
}

function normalizeCrm(payload: Partial<CrmPayload> | null | undefined): CrmPayload {
  return {
    scores: payload?.scores ?? [],
    actions: payload?.actions ?? [],
    leads: payload?.leads ?? [],
  };
}


function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getRegionSummary(regions: RegionData[]) {
  const sorted = [...regions].sort((a, b) => b.progress - a.progress);
  return {
    strongest: sorted[0] ?? null,
    weakest: sorted[sorted.length - 1] ?? null,
  };
}

function parseAiResponse(text: string): { title: string; body: string }[] {
  const lines = text.split("\n");
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("##")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s*/, "").trim() || "Insight", body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }

  if (current) sections.push(current);
  return sections.length ? sections.map((section) => ({ title: section.title, body: section.body.join("\n").trim() })) : [{ title: "Insight", body: text.trim() }];
}

function buildAiContext(dashboard: DashboardPayload, crm: CrmPayload, methodology: MethodologyId) {
  const method = PROJECT_METHOD_COPY[methodology];
  const sortedRegions = [...dashboard.regional].sort((a, b) => b.progress - a.progress);
  const { strongest, weakest } = getRegionSummary(dashboard.regional);
  const bottleneck = dashboard.bottleneck.reduce<DashboardPayload["bottleneck"][number] | null>((lowest, stage) => {
    if (!lowest || (stage.progress ?? 0) < (lowest.progress ?? 0)) return stage;
    return lowest;
  }, null);
  const openLeads = crm.leads.filter((lead) => lead.stage !== "Contract").sort((a, b) => b.probability - a.probability);
  const weightedPipeline = crm.leads.reduce((sum, lead) => sum + lead.revenue_potential * (lead.probability / 100), 0);

  return {
    periodLabel: dashboard.periodLabel,
    dataSource: dashboard.dataSource,
    teamSummary: {
      attainment: formatPercent(dashboard.teamSummary.attainment),
      gapRevenue: formatRevenue(dashboard.teamSummary.gapRevenue),
      targetRevenue: formatRevenue(dashboard.teamSummary.targetRevenue),
      actualRevenue: formatRevenue(dashboard.teamSummary.actualRevenue),
      activityCompletion: formatPercent(dashboard.teamSummary.activityCompletion),
      criticalRegionCount: dashboard.teamSummary.criticalRegionCount,
      accountCount: dashboard.teamSummary.accountCount,
      activatedCount: dashboard.teamSummary.activatedCount,
      topManager: dashboard.teamSummary.topManager,
    },
    regions: {
      strongest: strongest ? { name: strongest.name, progress: strongest.progress, revenue: formatRevenue(strongest.revenue), target: formatRevenue(strongest.target) } : null,
      weakest: weakest ? { name: weakest.name, progress: weakest.progress, revenue: formatRevenue(weakest.revenue), target: formatRevenue(weakest.target) } : null,
      watchlist: sortedRegions.slice(0, 3).map((region) => ({
        name: region.name,
        progress: region.progress,
        revenue: formatRevenue(region.revenue),
        target: formatRevenue(region.target),
      })),
    },
    execution: {
      weakestStage: bottleneck ? { stage: bottleneck.stage, progress: bottleneck.progress ?? 0 } : null,
      topRep: dashboard.individuals[0]
        ? {
            name: dashboard.individuals[0].name,
            progress: dashboard.individuals[0].progress,
            wonRevenue: formatRevenue(dashboard.individuals[0].wonRevenue),
            pipelineRevenue: formatRevenue(dashboard.individuals[0].pipelineRevenue),
          }
        : null,
    },
    pipeline: {
      openLeadCount: openLeads.length,
      weightedPipeline: formatRevenue(weightedPipeline),
      topLead: openLeads[0]
        ? {
            company: openLeads[0].company,
            contact: openLeads[0].contact,
            region: openLeads[0].region,
            stage: openLeads[0].stage,
            probability: openLeads[0].probability,
            revenuePotential: formatRevenue(openLeads[0].revenue_potential),
            owner: openLeads[0].owner,
            dueDate: openLeads[0].due_date,
            dueLabel: openLeads[0].due_label,
            action: openLeads[0].action,
          }
        : null,
      urgentActions: crm.actions.slice(0, 3).map((action) => ({
        salesRep: action.salesRep,
        target: action.target,
        prob: action.prob,
        action: action.action,
        due: action.due,
        region: action.region,
        stage: action.stage,
      })),
    },
    reps: dashboard.individuals.slice(0, 5).map((rep) => ({
      name: rep.name,
      progress: rep.progress,
      wonRevenue: formatRevenue(rep.wonRevenue),
      pipelineRevenue: formatRevenue(rep.pipelineRevenue),
      activityActual: rep.activityActual ?? 0,
      activityGoal: rep.activityGoal ?? 0,
    })),
    methodology: {
      id: methodology,
      label: method.label,
      summary: method.summary,
      bestFor: method.bestFor,
      whenToUse: method.whenToUse,
      quote: method.quote,
      stages: method.stages.map((stage) => stage.label),
      principles: method.principles,
    },
  };
}

function buildAiPreview(dashboard: DashboardPayload, crm: CrmPayload, methodology: MethodologyId): string {
  const context = buildAiContext(dashboard, crm, methodology);

  return [
    `Data source: ${context.dataSource}`,
    `Period: ${context.periodLabel}`,
    `Attainment: ${context.teamSummary.attainment}`,
    `Gap: ${context.teamSummary.gapRevenue}`,
    `Weakest region: ${context.regions.weakest ? `${context.regions.weakest.name} (${context.regions.weakest.progress}%)` : "n/a"}`,
    `Weakest stage: ${context.execution.weakestStage ? `${context.execution.weakestStage.stage} (${context.execution.weakestStage.progress}%)` : "n/a"}`,
    `Top lead: ${context.pipeline.topLead ? `${context.pipeline.topLead.company} (${context.pipeline.topLead.probability}%)` : "n/a"}`,
    `Priority action: ${context.pipeline.urgentActions[0] ? context.pipeline.urgentActions[0].action : "n/a"}`,
  ].join("\n");
}

export default function ProjectPage() {
  const [tab, setTab] = useState<Tab>("okr");
  const [methodology, setMethodology] = useState<MethodologyId>("Challenger");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(EMPTY_DATA);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    (async () => {
      try {
        const [dashboardRes, crmRes] = await Promise.all([
          fetch("/api/dashboard/regions", { signal: controller.signal }),
          fetch("/api/crm/leads", { signal: controller.signal }),
        ]);

        if (!dashboardRes.ok) throw new Error(`Dashboard request failed (${dashboardRes.status})`);
        if (!crmRes.ok) throw new Error(`CRM request failed (${crmRes.status})`);

        const dashboard = normalizeDashboard((await dashboardRes.json()) as DashboardPayload);
        const crm = normalizeCrm((await crmRes.json()) as CrmPayload);

        if (active) {
          setData({ dashboard, crm });
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("Failed to load project data:", error);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const dashboard = data.dashboard;
  const crm = data.crm;
  const { strongest, weakest } = getRegionSummary(dashboard.regional);
  const executionWeakest = dashboard.bottleneck.reduce<DashboardPayload["bottleneck"][number] | null>((lowest, stage) => {
    if (!lowest || (stage.progress ?? 0) < (lowest.progress ?? 0)) return stage;
    return lowest;
  }, null);
  const topRep = dashboard.individuals[0] ?? null;
  const openLeads = crm.leads.filter((lead) => lead.stage !== "Contract");
  const weightedPipeline = crm.leads.reduce((sum, lead) => sum + lead.revenue_potential * (lead.probability / 100), 0);
  const highPriorityLeads = openLeads.slice().sort((a, b) => b.probability - a.probability).slice(0, 4);

  const generateAI = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionalData: dashboard.regional,
          individuals: dashboard.individuals,
          methodology,
          context: buildAiContext(dashboard, crm, methodology),
        }),
      });
      const json = (await res.json()) as { insight?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "failed");
      setAiInsight(json.insight ?? "");
    } catch (error) {
      console.error("Failed to generate AI insight:", error);
      setAiInsight("");
      setAiError("AI insight could not be generated. Check Gemini and sheet connectivity.");
    } finally {
      setAiLoading(false);
    }
  };

  const moveLead = async (leadId: number, stage: CrmLead["stage"]) => {
    const previous = data.crm.leads;
    const next = previous.map((lead) => (lead.id === leadId ? { ...lead, stage } : lead));

    setData((current) => ({ ...current, crm: { ...current.crm, leads: next } }));

    try {
      const res = await fetch("/api/crm/leads/update-stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, stage }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch (error) {
      console.error("Failed to update lead stage:", error);
      setData((current) => ({ ...current, crm: { ...current.crm, leads: previous } }));
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingShell}>
        <Loader2 size={40} className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>Project Strategy</div>
          <h1 className={styles.title}>BD execution cockpit</h1>
          <p className={styles.subtitle}>Live sheet data, CRM pipeline, and operating methodology in one place.</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.liveBadge}>{dashboard.dataSource === "google-sheets" ? "Live Sheet" : "Fallback"}</span>
          <span className={styles.quarterBadge}>{dashboard.periodLabel}</span>
        </div>
      </header>

      <div className={styles.metricGrid}>
        <MetricCard label="Revenue attainment" value={formatPercent(dashboard.teamSummary.attainment)} hint={`${formatRevenue(dashboard.teamSummary.actualRevenue)} of ${formatRevenue(dashboard.teamSummary.targetRevenue)}`} icon={<TrendingUp size={16} />} tone={dashboard.teamSummary.attainment >= 100 ? "good" : dashboard.teamSummary.attainment >= 80 ? "warn" : "bad"} />
        <MetricCard label="Target gap" value={dashboard.teamSummary.gapRevenue > 0 ? formatRevenue(dashboard.teamSummary.gapRevenue) : "On plan"} hint="Quarter remainder" icon={<Target size={16} />} tone={dashboard.teamSummary.gapRevenue > 0 ? "warn" : "good"} />
        <MetricCard label="Open leads" value={String(openLeads.length)} hint={`${crm.actions.length} priority actions`} icon={<Users size={16} />} tone="neutral" />
        <MetricCard label="Execution completion" value={formatPercent(dashboard.teamSummary.activityCompletion)} hint={executionWeakest ? `${executionWeakest.stage} is the bottleneck` : "KPI data not ready"} icon={<Waypoints size={16} />} tone={dashboard.teamSummary.activityCompletion >= 60 ? "good" : dashboard.teamSummary.activityCompletion >= 30 ? "warn" : "bad"} />
      </div>

      <div className={styles.tabBar}>
        {[
          { id: "okr", label: "OKR / KPI" },
          { id: "pipeline", label: "Pipeline" },
          { id: "methodology", label: "Methodology" },
          { id: "ai", label: "AI Readout" },
        ].map((item) => (
          <button key={item.id} className={`${styles.tabBtn} ${tab === item.id ? styles.tabBtnActive : ""}`} onClick={() => setTab(item.id as Tab)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      {tab === "okr" ? (
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            <Card title="Quarter control" action={<span className={styles.cardPill}>Live sheet</span>}>
              <div className={styles.heroBlock}>
                <div>
                  <div className={styles.sectionLabel}>Current operating objective</div>
                  <div className={styles.heroTitle}>{dashboard.periodLabel}</div>
                  <p className={styles.heroCopy}>Close the revenue gap, stabilize weak regions, and keep the next stage handoff tight.</p>
                </div>
                <div className={styles.heroAside}>
                  <div className={styles.asideLabel}>Top region</div>
                  <div className={styles.asideValue}>{strongest?.name ?? "TBD"}</div>
                  <div className={styles.asideMeta}>{strongest ? `${strongest.progress}% attainment` : "No regional data"}</div>
                </div>
              </div>
            </Card>

            <div className={styles.objectiveGrid}>
              <ObjectiveCard
                accent="#6366f1"
                title="Revenue coverage"
                summary={`Protect the quarter while closing the ${formatRevenue(dashboard.teamSummary.gapRevenue)} gap.`}
                keyResults={[
                  { label: "Attainment", value: formatPercent(dashboard.teamSummary.attainment), target: "100%" },
                  { label: "Top rep", value: topRep?.name ?? "TBD", target: topRep ? formatRevenue(topRep.wonRevenue) : "n/a" },
                  { label: "Risk region", value: weakest?.name ?? "n/a", target: weakest ? `${weakest.progress}%` : "n/a" },
                  { label: "Critical regions", value: String(dashboard.teamSummary.criticalRegionCount), target: "< 2" },
                ]}
              />
              <ObjectiveCard
                accent="#22c55e"
                title="Execution discipline"
                summary="Keep stage conversion and activity completion from leaking on the way to contract."
                keyResults={[
                  { label: "Activity completion", value: formatPercent(dashboard.teamSummary.activityCompletion), target: "70%" },
                  { label: "Weakest stage", value: executionWeakest?.stage ?? "n/a", target: executionWeakest ? `${executionWeakest.progress ?? 0}%` : "n/a" },
                  { label: "Active accounts", value: String(dashboard.teamSummary.accountCount), target: "steady" },
                  { label: "Activated accounts", value: String(dashboard.teamSummary.activatedCount), target: "up" },
                ]}
              />
              <ObjectiveCard
                accent="#f59e0b"
                title="Pipeline momentum"
                summary="Keep the next 7 days warm with visible actions, not just probability."
                keyResults={[
                  { label: "Open leads", value: String(openLeads.length), target: "sorted" },
                  { label: "Weighted pipeline", value: formatRevenue(weightedPipeline), target: "growing" },
                  { label: "Next action", value: crm.actions[0]?.target ?? "n/a", target: crm.actions[0]?.due ?? "n/a" },
                  { label: "High-priority", value: crm.actions[0]?.prob ?? "n/a", target: "Urgent" },
                ]}
              />
            </div>
          </div>

          <div className={styles.sideCol}>
            <Card title="Rep scoreboard" action={<span className={styles.cardPill}>Live</span>}>
              <div className={styles.repList}>
                {dashboard.individuals.slice(0, 5).map((rep, index) => (
                  <RepRow key={rep.name} rep={rep} rank={index + 1} />
                ))}
              </div>
            </Card>

            <Card title="Region watchlist">
              <div className={styles.regionList}>
                {[...dashboard.regional].sort((a, b) => b.progress - a.progress).slice(0, 5).map((region) => (
                  <div key={region.name} className={styles.regionRow}>
                    <div>
                      <div className={styles.regionName}>{region.name}</div>
                      <div className={styles.regionMeta}>{formatRevenue(region.revenue)} of {formatRevenue(region.target)}</div>
                    </div>
                    <div className={styles.regionProgress}>{region.progress}%</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "pipeline" ? (
        <div className={styles.pipelineShell}>
          <div className={styles.pipelineTopRow}>
            <Card title="Pipeline pressure" className={styles.pipelineMetric}><div className={styles.pipelineMetricValue}>{openLeads.length}</div><div className={styles.pipelineMetricHint}>open leads in motion</div></Card>
            <Card title="Weighted value" className={styles.pipelineMetric}><div className={styles.pipelineMetricValue}>{formatRevenue(weightedPipeline)}</div><div className={styles.pipelineMetricHint}>probability-adjusted</div></Card>
            <Card title="Priority actions" className={styles.pipelineMetric}><div className={styles.pipelineMetricValue}>{crm.actions.length}</div><div className={styles.pipelineMetricHint}>{highPriorityLeads[0]?.company ?? "No urgent leads"}</div></Card>
          </div>

          <PipelineKanban leads={crm.leads} scores={crm.scores} actions={crm.actions} onMoveLead={moveLead} />
        </div>
      ) : null}

      {tab === "methodology" ? (
        <div className={styles.methodLayout}>
          <div className={styles.methodPicker}>
            {(Object.keys(PROJECT_METHOD_COPY) as MethodologyId[]).map((id) => (
              <button key={id} className={`${styles.methodBtn} ${methodology === id ? styles.methodBtnActive : ""}`} onClick={() => setMethodology(id)} type="button">
                {PROJECT_METHOD_COPY[id].label}
              </button>
            ))}
          </div>

          <div className={styles.methodHero} style={{ borderColor: `${PROJECT_METHOD_COPY[methodology].color}33` }}>
            <div>
              <div className={styles.sectionLabel}>Playbook</div>
              <div className={styles.methodTitle}>{PROJECT_METHOD_COPY[methodology].label}</div>
              <p className={styles.methodSummary}>{PROJECT_METHOD_COPY[methodology].summary}</p>
            </div>
            <div className={styles.methodAside}>
              <div className={styles.asideLabel}>Best for</div>
              <div className={styles.asideValue}>{PROJECT_METHOD_COPY[methodology].bestFor}</div>
              <div className={styles.asideMeta}>{PROJECT_METHOD_COPY[methodology].whenToUse}</div>
            </div>
          </div>

          <div className={styles.methodGrid}>
            <Card title="Stage flow">
              <div className={styles.timeline}>
                {PROJECT_METHOD_COPY[methodology].stages.map((stage, index) => (
                  <div key={stage.label} className={styles.timelineItem}>
                    <div className={styles.timelineIndex}>{index + 1}</div>
                    <div>
                      <div className={styles.timelineTitle}>{stage.label}</div>
                      <div className={styles.timelineCopy}>{stage.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Operating principles">
              <div className={styles.principleList}>
                {PROJECT_METHOD_COPY[methodology].principles.map((principle) => (
                  <div key={principle} className={styles.principleRow}>
                    <Sparkles size={13} />
                    <span>{principle}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Coach note" className={styles.quoteCard}>
            <div className={styles.quoteText}>&ldquo;{PROJECT_METHOD_COPY[methodology].quote}&rdquo;</div>
            <div className={styles.quoteTip}>
              <AlertTriangle size={13} />
              <span>{PROJECT_METHOD_COPY[methodology].tip}</span>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "ai" ? (
        <div className={styles.aiLayout}>
          <div className={styles.aiHeader}>
            <div>
              <div className={styles.sectionLabel}>AI readout</div>
              <div className={styles.aiTitle}>Live BD commentary</div>
              <p className={styles.aiSubtitle}>The model reads the current BD sheet, regional pressure, and rep execution signals.</p>
            </div>
            <button className={styles.aiButton} onClick={generateAI} disabled={aiLoading} type="button">
              {aiLoading ? <Loader2 size={14} className={styles.spinner} /> : <Brain size={14} />}
              Generate
            </button>
          </div>

          <div className={styles.aiGrid}>
            <Card title="What the AI sees">
              <div className={styles.aiAnchorList}>
                <div className={styles.aiAnchor}><span>Data source</span><strong>{dashboard.dataSource === "google-sheets" ? "Live sheet" : "Fallback"}</strong></div>
                <div className={styles.aiAnchor}><span>Period</span><strong>{dashboard.periodLabel}</strong></div>
                <div className={styles.aiAnchor}><span>Attainment</span><strong>{formatPercent(dashboard.teamSummary.attainment)}</strong></div>
                <div className={styles.aiAnchor}><span>Risk region</span><strong>{weakest ? `${weakest.name} (${weakest.progress}%)` : "n/a"}</strong></div>
                <div className={styles.aiAnchor}><span>Weakest stage</span><strong>{executionWeakest ? `${executionWeakest.stage} (${executionWeakest.progress ?? 0}%)` : "n/a"}</strong></div>
                <div className={styles.aiAnchor}><span>Top lead</span><strong>{crm.leads[0]?.company ?? "n/a"}</strong></div>
                <div className={styles.aiAnchor}><span>Priority action</span><strong>{crm.actions[0]?.action ?? "n/a"}</strong></div>
              </div>
              <pre className={styles.aiPreview}>{buildAiPreview(dashboard, crm, methodology)}</pre>
            </Card>

            <Card title="Generated response">
              {aiError ? <div className={styles.aiError}>{aiError}</div> : null}
              {!aiInsight && !aiLoading ? (
                <div className={styles.aiEmpty}>
                  <Brain size={40} />
                  <p>Press Generate to produce a live operating summary.</p>
                </div>
              ) : null}
              {aiLoading ? (
                <div className={styles.aiEmpty}>
                  <Loader2 size={32} className={styles.spinner} />
                  <p>Building the summary from live sheet signals...</p>
                </div>
              ) : null}
              {aiInsight ? (
                <div className={styles.aiResponse}>
                  {parseAiResponse(aiInsight).map((section) => (
                    <div key={section.title} className={styles.aiSection}>
                      <div className={styles.aiSectionTitle}>{section.title}</div>
                      <div className={styles.aiSectionBody}>{section.body}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <Card className={styles.metricCard}>
      <div className={styles.metricTop}>
        <div className={styles.metricIcon}>{icon}</div>
        <span className={`${styles.metricTone} ${styles[`tone_${tone}`]}`}>{tone === "neutral" ? "live" : tone}</span>
      </div>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricHint}>{hint}</div>
    </Card>
  );
}

function ObjectiveCard({
  title,
  accent,
  summary,
  keyResults,
}: {
  title: string;
  accent: string;
  summary: string;
  keyResults: { label: string; value: string; target: string }[];
}) {
  return (
    <Card className={styles.objectiveCard}>
      <div className={styles.objectiveCardHeader} style={{ borderColor: accent }}>
        <div>
          <div className={styles.objectiveCardTitle}>{title}</div>
          <div className={styles.objectiveCardSummary}>{summary}</div>
        </div>
        <span className={styles.objectiveCardTag} style={{ background: `${accent}18`, color: accent }}>live</span>
      </div>

      <div className={styles.krList}>
        {keyResults.map((kr) => (
          <div key={kr.label} className={styles.krRow}>
            <div>
              <div className={styles.krLabel}>{kr.label}</div>
              <div className={styles.krTarget}>target {kr.target}</div>
            </div>
            <div className={styles.krValue}>{kr.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RepRow({ rep, rank }: { rep: IndividualData; rank: number }) {
  const tone = rep.progress >= 100 ? "good" : rep.progress >= 75 ? "warn" : "bad";

  return (
    <div className={styles.repRow}>
      <div className={styles.repRank}>#{rank}</div>
      <div className={styles.repBody}>
        <div className={styles.repHead}>
          <div className={styles.repName}>{rep.name}</div>
          <div className={`${styles.repTone} ${styles[`tone_${tone}`]}`}>{formatPercent(rep.progress)}</div>
        </div>
        <div className={styles.repMeta}>{formatRevenue(rep.wonRevenue)} won | {formatRevenue(rep.pipelineRevenue)} pipeline</div>
        <div className={styles.repFoot}>{rep.activityActual ?? 0}/{rep.activityGoal ?? 0} activities</div>
      </div>
    </div>
  );
}
