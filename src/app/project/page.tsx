"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Clock,
  Crown,
  Diamond,
  Flame,
  Loader2,
  MessageSquare,
  Search,
  Snowflake,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Waypoints,
  Zap,
} from "lucide-react";
import Card from "@/components/Card";
import { formatRevenue } from "@/lib/formatCurrency";
import PipelineKanban from "@/components/PipelineKanban";
import type { DashboardPayload, IndividualData, RegionData } from "@/types/dashboard";
import styles from "./page.module.css";

type Tab = "strategy" | "pipeline" | "methodology" | "ai";

type DealHealth = "whale" | "cooking" | "active" | "watch" | "stale" | "won";

interface DealHealthMeta {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  desc: string;
}

const DEAL_HEALTH_META: Record<DealHealth, DealHealthMeta> = {
  whale: {
    label: "Whale",
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.12)",
    icon: <Crown size={12} />,
    desc: "초대형 전략 딜 — 최우선 관리",
  },
  cooking: {
    label: "Cooking",
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.12)",
    icon: <Flame size={12} />,
    desc: "고확률 진행 중 — 마무리 단계",
  },
  active: {
    label: "Active",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
    icon: <Zap size={12} />,
    desc: "정상 진행 — 페이스 유지",
  },
  watch: {
    label: "Watch",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    icon: <AlertTriangle size={12} />,
    desc: "주의 필요 — 후속 조치",
  },
  stale: {
    label: "Stale",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    icon: <Snowflake size={12} />,
    desc: "정체 중 — 즉시 개입",
  },
  won: {
    label: "Won",
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.12)",
    icon: <Diamond size={12} />,
    desc: "확정 — 활성화 관리",
  },
};

const WHALE_THRESHOLD = 100_000; // 10만 이상 = whale

// ─────────────────────────────────────────────────────────────────
// Deal Doctor — 12-question diagnostic
// ─────────────────────────────────────────────────────────────────

interface DiagnosticQuestion {
  id: string;
  category: "Champion" | "Pain" | "Process" | "Forecast";
  question: string;
  hint: string;
}

const DEAL_DOCTOR_QUESTIONS: DiagnosticQuestion[] = [
  // Champion (3)
  {
    id: "q1",
    category: "Champion",
    question: "내부 챔피언 이름을 1초 안에 댈 수 있나?",
    hint: "이름이 안 떠오르면 = 챔피언 없음. 가장 큰 적신호.",
  },
  {
    id: "q2",
    category: "Champion",
    question: "그 챔피언이 우리 대신 회의에서 발언한 적이 있나?",
    hint: "단순 호의 ≠ 챔피언. ‘대신 싸워주는 사람’이 진짜.",
  },
  {
    id: "q3",
    category: "Champion",
    question: "Economic Buyer (예산 결정자)와 직접 만났나?",
    hint: "EB를 못 만났으면 forecast 신뢰도 50% 이하.",
  },
  // Pain (3)
  {
    id: "q4",
    category: "Pain",
    question: "고객이 자기 입으로 ‘이 문제 때문에 얼마 손해본다’를 말했나?",
    hint: "내가 말한 숫자는 0점, 고객이 말한 숫자는 100점.",
  },
  {
    id: "q5",
    category: "Pain",
    question: "‘아무것도 안 하면’ 그 고객에게 무슨 일이 생기는가?",
    hint: "답이 ‘별 일 없음’이면 = 우선순위 낮음 = lost 가능성 높음.",
  },
  {
    id: "q6",
    category: "Pain",
    question: "이 문제 해결이 고객 회사의 ‘올해 OKR’ 중 하나에 직접 연결되는가?",
    hint: "OKR과 연결되지 않은 딜은 ‘있으면 좋고’ 카테고리. 위험.",
  },
  // Process (3)
  {
    id: "q7",
    category: "Process",
    question: "구매 프로세스 단계를 종이에 그릴 수 있나? (몇 단계, 누구 승인)",
    hint: "그릴 수 없으면 모르는 것이고, 모르면 forecast 못 한다.",
  },
  {
    id: "q8",
    category: "Process",
    question: "법무 / 보안 / 구매팀 검토 일정이 정해져 있나?",
    hint: "이 셋이 하나라도 빠지면 평균 30-60일 지연.",
  },
  {
    id: "q9",
    category: "Process",
    question: "Mutual Action Plan에 양쪽 사인 받은 일정이 있나?",
    hint: "MAP 없으면 ‘영업 추측’이지 ‘약속’이 아니다.",
  },
  // Forecast (3)
  {
    id: "q10",
    category: "Forecast",
    question: "지난 30일 안에 의미 있는 진전이 있었나?",
    hint: "30일 무진전 = stale = forecast에서 빼야.",
  },
  {
    id: "q11",
    category: "Forecast",
    question: "경쟁사가 누구인지, 어떤 위치에 있는지 안다?",
    hint: "‘경쟁 없음’ 답변은 거짓말. 항상 누군가는 있다 (보류 포함).",
  },
  {
    id: "q12",
    category: "Forecast",
    question: "이 딜이 lost 됐다면 그 이유가 무엇일지 5가지 적을 수 있나?",
    hint: "Pre-mortem — 적을 수 없으면 위험을 모르는 것.",
  },
];

const DEAL_DOCTOR_KEY = "strategy-room-doctor-v1";

function readDoctor(): Record<number, Record<string, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DEAL_DOCTOR_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDoctor(data: Record<number, Record<string, boolean>>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEAL_DOCTOR_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

function computeDoctorScore(answers: Record<string, boolean>): {
  score: number;
  total: number;
  byCategory: Record<string, { yes: number; total: number }>;
} {
  const byCategory: Record<string, { yes: number; total: number }> = {
    Champion: { yes: 0, total: 0 },
    Pain: { yes: 0, total: 0 },
    Process: { yes: 0, total: 0 },
    Forecast: { yes: 0, total: 0 },
  };
  for (const q of DEAL_DOCTOR_QUESTIONS) {
    byCategory[q.category].total += 1;
    if (answers[q.id]) byCategory[q.category].yes += 1;
  }
  const yes = Object.values(byCategory).reduce((s, c) => s + c.yes, 0);
  const total = DEAL_DOCTOR_QUESTIONS.length;
  return { score: Math.round((yes / total) * 100), total, byCategory };
}

// Talk Track 매칭: health + stage 기반으로 가장 적합한 트랙 추천
interface TrackSuggestion {
  id: string;
  title: string;
  why: string;
  color: string;
}

function suggestTalkTrack(bet: BigBet): TrackSuggestion {
  // Whale → C-suite 트랙
  if (bet.health === "whale") {
    return {
      id: "ceo-cold",
      title: "C-Suite 콜드 어프로치",
      why: "초대형 딜 — 의사결정자 직접 공략 필요",
      color: "#a855f7",
    };
  }
  // Stale → 챔피언 양성 (내부에서 우리 대신 푸시)
  if (bet.health === "stale") {
    return {
      id: "champion-internal",
      title: "내부 챔피언 양성",
      why: `${bet.daysSinceContact ?? 21}일 정체 — 직접 푸시보다 챔피언이 효과적`,
      color: "#22c55e",
    };
  }
  // Cooking + Negotiation → 챔피언 (마무리 단계 내부 푸시)
  if (bet.health === "cooking" && bet.stage === "Negotiation") {
    return {
      id: "champion-internal",
      title: "내부 챔피언 양성",
      why: "마무리 단계 — 회의실 안에서 우리를 대신 팔아주는 사람 필요",
      color: "#22c55e",
    };
  }
  // Watch → 매니저/실무 (먼저 신뢰 빌드)
  if (bet.health === "watch") {
    return {
      id: "manager-frustrated",
      title: "실무 매니저 신뢰 빌드",
      why: "관심도 낮음 — 가치 검증 후 상부로 에스컬레이션",
      color: "#0ea5e9",
    };
  }
  // Default: Active → 매니저
  return {
    id: "manager-frustrated",
    title: "실무 매니저 신뢰 빌드",
    why: "정상 진행 — 페이스 유지하며 다음 단계 준비",
    color: "#0ea5e9",
  };
}
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

interface BigBet {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue: number;
  weighted: number;
  owner: string;
  due: string;
  action: string;
  health: DealHealth;
  daysSinceContact: number | null;
}

function daysAgo(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return null;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

function classifyHealth(lead: CrmLead): DealHealth {
  if (lead.stage === "Contract") return "won";
  const stale = daysAgo(lead.last_contact);
  if (stale !== null && stale > 21) return "stale";
  if (lead.revenue_potential >= WHALE_THRESHOLD) return "whale";
  if (lead.probability >= 75 && (lead.stage === "Negotiation" || lead.stage === "Proposal")) return "cooking";
  if (lead.probability >= 50) return "active";
  return "watch";
}

function deriveBigBets(leads: CrmLead[], limit = 8): BigBet[] {
  return leads
    .filter((lead) => lead.stage !== "Contract")
    .map((lead) => ({
      id: lead.id,
      company: lead.company,
      contact: lead.contact,
      region: lead.region,
      stage: lead.stage,
      probability: lead.probability,
      revenue: lead.revenue_potential,
      weighted: Math.round(lead.revenue_potential * (lead.probability / 100)),
      owner: lead.owner,
      due: lead.due_label || lead.due_date,
      action: lead.action,
      health: classifyHealth(lead),
      daysSinceContact: daysAgo(lead.last_contact),
    }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, limit);
}

interface IntelEntry {
  id: string;
  icon: React.ReactNode;
  tone: "info" | "warn" | "good" | "danger";
  headline: string;
  detail: string;
  meta: string;
}

function deriveIntelFeed(dashboard: DashboardPayload, crm: CrmPayload, bets: BigBet[]): IntelEntry[] {
  const feed: IntelEntry[] = [];

  // 1. Whale alerts
  const whales = bets.filter((b) => b.health === "whale");
  if (whales.length > 0) {
    feed.push({
      id: "whale-alert",
      icon: <Crown size={14} />,
      tone: "info",
      headline: `초대형 딜 ${whales.length}건이 큐에 있습니다`,
      detail: whales.slice(0, 2).map((w) => `${w.company} (${formatRevenue(w.revenue)})`).join(" · "),
      meta: "Big Bet Watch",
    });
  }

  // 2. Stale deals warning
  const staleBets = bets.filter((b) => b.health === "stale");
  if (staleBets.length > 0) {
    feed.push({
      id: "stale-warn",
      icon: <Snowflake size={14} />,
      tone: "danger",
      headline: `${staleBets.length}건이 21일 이상 정체`,
      detail: staleBets.slice(0, 2).map((s) => s.company).join(", ") + " — 즉시 컨택 필요",
      meta: "Risk Signal",
    });
  }

  // 3. Cooking high momentum
  const cooking = bets.filter((b) => b.health === "cooking");
  if (cooking.length > 0) {
    feed.push({
      id: "cooking-momentum",
      icon: <Flame size={14} />,
      tone: "good",
      headline: `${cooking.length}건의 딜이 마무리 단계`,
      detail: cooking.slice(0, 2).map((c) => `${c.company} ${c.probability}%`).join(" · "),
      meta: "Closing Window",
    });
  }

  // 4. Critical region pressure
  const criticalRegions = dashboard.regional.filter((r) => r.status === "critical");
  if (criticalRegions.length > 0) {
    feed.push({
      id: "region-critical",
      icon: <AlertTriangle size={14} />,
      tone: "danger",
      headline: `${criticalRegions.length}개 지역 위험 신호`,
      detail: criticalRegions.slice(0, 3).map((r) => `${r.name} ${r.progress}%`).join(" · "),
      meta: "Regional Risk",
    });
  }

  // 5. Top performer momentum
  const topRep = dashboard.individuals[0];
  if (topRep && topRep.progress >= 80) {
    feed.push({
      id: "top-rep",
      icon: <TrendingUp size={14} />,
      tone: "good",
      headline: `${topRep.name} ${topRep.progress.toFixed(0)}% 달성`,
      detail: `${formatRevenue(topRep.wonRevenue)} 확정 / 파이프 ${formatRevenue(topRep.pipelineRevenue)}`,
      meta: "Top Performer",
    });
  }

  // 6. Bottleneck stage
  const stages = [...dashboard.bottleneck].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
  const weakest = stages[0];
  if (weakest && (weakest.progress ?? 0) < 50) {
    feed.push({
      id: "bottleneck",
      icon: <TrendingDown size={14} />,
      tone: "warn",
      headline: `${weakest.stage} 단계 병목`,
      detail: `달성률 ${(weakest.progress ?? 0).toFixed(0)}% — 코칭 또는 리소스 재배치 필요`,
      meta: "Execution Gap",
    });
  }

  return feed;
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

const NOTES_STORAGE_KEY = "strategy-room-notes-v1";

function readNotes(): Record<number, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeNotes(notes: Record<number, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* quota — ignore */
  }
}

export default function ProjectPage() {
  const [tab, setTab] = useState<Tab>("strategy");
  const [methodology, setMethodology] = useState<MethodologyId>("Challenger");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(EMPTY_DATA);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [healthFilter, setHealthFilter] = useState<DealHealth | "all">("all");
  const [expandedBet, setExpandedBet] = useState<number | null>(null);
  const [strategyNotes, setStrategyNotes] = useState<Record<number, string>>({});
  const [visibleBetCount, setVisibleBetCount] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorAnswers, setDoctorAnswers] = useState<Record<number, Record<string, boolean>>>({});

  // Load doctor answers on mount
  useEffect(() => {
    setDoctorAnswers(readDoctor());
  }, []);

  const updateDoctor = (betId: number, qId: string, value: boolean) => {
    const next = {
      ...doctorAnswers,
      [betId]: { ...(doctorAnswers[betId] ?? {}), [qId]: value },
    };
    setDoctorAnswers(next);
    writeDoctor(next);
  };

  // Load notes from localStorage on mount
  useEffect(() => {
    setStrategyNotes(readNotes());
  }, []);

  const updateNote = (id: number, note: string) => {
    const next = { ...strategyNotes, [id]: note };
    setStrategyNotes(next);
    writeNotes(next);
  };

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

  // ── Strategy Room derived data ──
  const allBets = useMemo(() => deriveBigBets(crm.leads, 50), [crm.leads]);
  const bets = useMemo(() => {
    let filtered = healthFilter === "all" ? allBets : allBets.filter((b) => b.health === healthFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((b) => {
        const note = (strategyNotes[b.id] ?? "").toLowerCase();
        return (
          b.company.toLowerCase().includes(q) ||
          b.contact.toLowerCase().includes(q) ||
          b.region.toLowerCase().includes(q) ||
          b.owner.toLowerCase().includes(q) ||
          b.stage.toLowerCase().includes(q) ||
          note.includes(q)
        );
      });
    }
    return filtered;
  }, [allBets, healthFilter, searchQuery, strategyNotes]);
  const visibleBets = bets.slice(0, visibleBetCount);
  const intelFeed = useMemo(() => deriveIntelFeed(dashboard, crm, allBets), [dashboard, crm, allBets]);
  const healthCounts = useMemo(() => {
    const counts: Record<DealHealth, number> = { whale: 0, cooking: 0, active: 0, watch: 0, stale: 0, won: 0 };
    for (const b of allBets) counts[b.health] += 1;
    return counts;
  }, [allBets]);
  const totalBigBetValue = useMemo(
    () => allBets.reduce((s, b) => s + b.weighted, 0),
    [allBets],
  );
  const annotatedCount = useMemo(
    () => allBets.filter((b) => (strategyNotes[b.id] ?? "").trim().length > 0).length,
    [allBets, strategyNotes],
  );

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
          <div className={styles.kicker}>Strategy Room</div>
          <h1 className={styles.title}>큰 건이 끓고 있는 곳</h1>
          <p className={styles.subtitle}>지금 진행 중인 핵심 딜과 전략, 팀의 실시간 신호를 한 화면에서.</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.liveBadge}>{dashboard.dataSource === "google-sheets" ? "Live Sheet" : "Fallback"}</span>
          <span className={styles.quarterBadge}>{dashboard.periodLabel}</span>
        </div>
      </header>

      <div className={styles.metricGrid}>
        <MetricCard label="가중 파이프라인" value={formatRevenue(weightedPipeline)} hint={`${openLeads.length}건 진행 중`} icon={<TrendingUp size={16} />} tone="neutral" />
        <MetricCard label="달성률" value={formatPercent(dashboard.teamSummary.attainment)} hint={`목표까지 ${formatRevenue(dashboard.teamSummary.gapRevenue)}`} icon={<Target size={16} />} tone={dashboard.teamSummary.attainment >= 100 ? "good" : dashboard.teamSummary.attainment >= 80 ? "warn" : "bad"} />
        <MetricCard label="Big Bets" value={String(allBets.length)} hint={`전략 노트 ${annotatedCount}건`} icon={<Crown size={16} />} tone="neutral" />
        <MetricCard label="실행 진행률" value={formatPercent(dashboard.teamSummary.activityCompletion)} hint={executionWeakest ? `${executionWeakest.stage} 병목` : "KPI 미연결"} icon={<Waypoints size={16} />} tone={dashboard.teamSummary.activityCompletion >= 60 ? "good" : dashboard.teamSummary.activityCompletion >= 30 ? "warn" : "bad"} />
      </div>

      <div className={styles.tabBar}>
        {[
          { id: "strategy", label: "전략 룸" },
          { id: "pipeline", label: "파이프라인" },
          { id: "methodology", label: "방법론" },
          { id: "ai", label: "AI 리드아웃" },
        ].map((item) => (
          <button key={item.id} className={`${styles.tabBtn} ${tab === item.id ? styles.tabBtnActive : ""}`} onClick={() => setTab(item.id as Tab)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      {tab === "strategy" ? (
        <StrategyRoom
          bets={visibleBets}
          totalBets={bets.length}
          allCount={allBets.length}
          totalValue={totalBigBetValue}
          healthCounts={healthCounts}
          healthFilter={healthFilter}
          setHealthFilter={(h) => { setHealthFilter(h); setVisibleBetCount(6); }}
          intelFeed={intelFeed}
          actions={crm.actions}
          notes={strategyNotes}
          updateNote={updateNote}
          expandedBet={expandedBet}
          setExpandedBet={setExpandedBet}
          onLoadMore={() => setVisibleBetCount((c) => c + 6)}
          hasMore={visibleBetCount < bets.length}
          weakestRegion={weakest}
          strongestRegion={strongest}
          searchQuery={searchQuery}
          setSearchQuery={(v) => { setSearchQuery(v); setVisibleBetCount(6); }}
          doctorAnswers={doctorAnswers}
          updateDoctor={updateDoctor}
        />
      ) : null}

      {false ? (
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

// ─────────────────────────────────────────────────────────────────
// Strategy Room
// ─────────────────────────────────────────────────────────────────

interface StrategyRoomProps {
  bets: BigBet[];
  totalBets: number;
  allCount: number;
  totalValue: number;
  healthCounts: Record<DealHealth, number>;
  healthFilter: DealHealth | "all";
  setHealthFilter: (h: DealHealth | "all") => void;
  intelFeed: IntelEntry[];
  actions: CrmAction[];
  notes: Record<number, string>;
  updateNote: (id: number, note: string) => void;
  expandedBet: number | null;
  setExpandedBet: (id: number | null) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  weakestRegion: RegionData | null;
  strongestRegion: RegionData | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  doctorAnswers: Record<number, Record<string, boolean>>;
  updateDoctor: (betId: number, qId: string, value: boolean) => void;
}

function StrategyRoom({
  bets,
  totalBets,
  allCount,
  totalValue,
  healthCounts,
  healthFilter,
  setHealthFilter,
  intelFeed,
  actions,
  notes,
  updateNote,
  expandedBet,
  setExpandedBet,
  onLoadMore,
  hasMore,
  weakestRegion,
  searchQuery,
  setSearchQuery,
  doctorAnswers,
  updateDoctor,
}: StrategyRoomProps) {
  // Infinite scroll sentinel — auto-load when bottom comes into view
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }, // start loading 200px before reaching the sentinel
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  const filterChips: { id: DealHealth | "all"; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "whale", label: DEAL_HEALTH_META.whale.label },
    { id: "cooking", label: DEAL_HEALTH_META.cooking.label },
    { id: "active", label: DEAL_HEALTH_META.active.label },
    { id: "watch", label: DEAL_HEALTH_META.watch.label },
    { id: "stale", label: DEAL_HEALTH_META.stale.label },
  ];

  // Auto-extract tag chips from notes (#hashtags)
  const allTags = React.useMemo(() => {
    const tagSet = new Map<string, number>();
    Object.values(notes).forEach((note) => {
      const matches = note.match(/#[\w가-힣]+/g) ?? [];
      matches.forEach((t) => tagSet.set(t, (tagSet.get(t) ?? 0) + 1));
    });
    return Array.from(tagSet.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [notes]);

  return (
    <div className={styles.strategyRoom}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="회사·담당자·지역·노트 검색  (#태그 검색 가능)"
        />
        {searchQuery && (
          <button type="button" className={styles.searchClear} onClick={() => setSearchQuery("")}>
            ✕
          </button>
        )}
      </div>

      {/* Tag chips (auto-extracted from notes) */}
      {allTags.length > 0 && (
        <div className={styles.tagStrip}>
          <span className={styles.tagStripLabel}># 태그</span>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`${styles.tagChip} ${searchQuery === tag ? styles.tagChipActive : ""}`}
              onClick={() => setSearchQuery(searchQuery === tag ? "" : tag)}
            >
              {tag} <span className={styles.tagCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Health filter strip with counts */}
      <div className={styles.healthStrip}>
        {filterChips.map((chip) => {
          const meta = chip.id === "all" ? null : DEAL_HEALTH_META[chip.id];
          const count = chip.id === "all" ? allCount : healthCounts[chip.id];
          const active = healthFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              className={`${styles.healthChip} ${active ? styles.healthChipActive : ""}`}
              onClick={() => setHealthFilter(chip.id)}
              style={
                active && meta
                  ? { background: meta.bg, color: meta.color, borderColor: `${meta.color}55` }
                  : undefined
              }
            >
              {meta?.icon}
              <span>{chip.label}</span>
              <span className={styles.healthChipCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.strategyLayout}>
        {/* Main: Big Bets grid */}
        <div className={styles.strategyMain}>
          <div className={styles.strategySectionHeader}>
            <div>
              <div className={styles.sectionLabel}>Big Bets</div>
              <h3 className={styles.strategySectionTitle}>지금 끓고 있는 딜</h3>
            </div>
            <div className={styles.strategySectionMeta}>
              {totalBets}건 · 가중합 {formatRevenue(totalValue)}
            </div>
          </div>

          {bets.length === 0 ? (
            <div className={styles.strategyEmpty}>
              <Target size={28} />
              <p className={styles.strategyEmptyTitle}>해당 상태의 딜이 없습니다</p>
              <p className={styles.strategyEmptyDesc}>다른 필터를 선택하거나 CRM에서 새 리드를 추가해 보세요.</p>
            </div>
          ) : (
            <div className={styles.bigBetGrid}>
              {bets.map((bet) => (
                <BigBetCard
                  key={bet.id}
                  bet={bet}
                  expanded={expandedBet === bet.id}
                  onToggle={() => setExpandedBet(expandedBet === bet.id ? null : bet.id)}
                  note={notes[bet.id] ?? ""}
                  onNoteChange={(v) => updateNote(bet.id, v)}
                  doctorAnswers={doctorAnswers[bet.id] ?? {}}
                  onDoctorChange={(qId, value) => updateDoctor(bet.id, qId, value)}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <>
              {/* Invisible sentinel for IntersectionObserver — also serves as fallback button */}
              <div ref={sentinelRef} className={styles.scrollSentinel}>
                <Loader2 size={14} className={styles.spinner} />
                <span>더 불러오는 중…</span>
              </div>
            </>
          )}
        </div>

        {/* Sidebar: Intel feed + Moves */}
        <aside className={styles.strategySide}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <Sparkles size={14} className={styles.sideCardIcon} />
              <span className={styles.sideCardTitle}>Intel Feed</span>
            </div>
            <div className={styles.intelList}>
              {intelFeed.length === 0 ? (
                <p className={styles.intelEmpty}>현재 전달할 신호가 없습니다.</p>
              ) : (
                intelFeed.map((entry) => (
                  <div key={entry.id} className={`${styles.intelItem} ${styles[`intelTone_${entry.tone}`]}`}>
                    <div className={styles.intelIcon}>{entry.icon}</div>
                    <div className={styles.intelBody}>
                      <div className={styles.intelHeadline}>{entry.headline}</div>
                      <div className={styles.intelDetail}>{entry.detail}</div>
                      <div className={styles.intelMeta}>{entry.meta}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <Zap size={14} className={styles.sideCardIcon} />
              <span className={styles.sideCardTitle}>오늘의 Moves</span>
            </div>
            <div className={styles.moveList}>
              {actions.length === 0 ? (
                <p className={styles.intelEmpty}>등록된 액션이 없습니다.</p>
              ) : (
                actions.slice(0, 5).map((action, idx) => (
                  <div key={`${action.target}-${idx}`} className={styles.moveItem}>
                    <div className={styles.moveOwner}>{action.salesRep}</div>
                    <div className={styles.moveTarget}>{action.target}</div>
                    <div className={styles.moveAction}>{action.action}</div>
                    <div className={styles.moveFoot}>
                      <span>{action.region}</span>
                      <span>·</span>
                      <span>{action.due}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {weakestRegion ? (
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <AlertTriangle size={14} className={styles.sideCardIcon} />
                <span className={styles.sideCardTitle}>주의 지역</span>
              </div>
              <div className={styles.weakRegion}>
                <div className={styles.weakRegionName}>{weakestRegion.name}</div>
                <div className={styles.weakRegionStat}>{weakestRegion.progress}% 달성</div>
                <div className={styles.weakRegionMeta}>
                  {formatRevenue(weakestRegion.revenue)} / {formatRevenue(weakestRegion.target)}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

interface BigBetCardProps {
  bet: BigBet;
  expanded: boolean;
  onToggle: () => void;
  note: string;
  onNoteChange: (value: string) => void;
  doctorAnswers: Record<string, boolean>;
  onDoctorChange: (qId: string, value: boolean) => void;
}

function BigBetCard({ bet, expanded, onToggle, note, onNoteChange, doctorAnswers, onDoctorChange }: BigBetCardProps) {
  const meta = DEAL_HEALTH_META[bet.health];
  const hasNote = note.trim().length > 0;
  const doctor = computeDoctorScore(doctorAnswers);
  const hasDoctorAnswers = Object.keys(doctorAnswers).length > 0;
  const doctorVerdict =
    doctor.score >= 80 ? { label: "건강", color: "#22c55e" }
    : doctor.score >= 60 ? { label: "보통", color: "#f59e0b" }
    : doctor.score >= 40 ? { label: "위험", color: "#ef4444" }
    : { label: "심각", color: "#dc2626" };

  return (
    <div
      className={`${styles.bigBetCard} ${expanded ? styles.bigBetCardExpanded : ""}`}
      style={{ borderLeftColor: meta.color }}
    >
      <button type="button" className={styles.bigBetHead} onClick={onToggle}>
        <div className={styles.bigBetHealthBadge} style={{ background: meta.bg, color: meta.color }}>
          {meta.icon}
          <span>{meta.label}</span>
        </div>
        <div className={styles.bigBetTitle}>{bet.company}</div>
        <div className={styles.bigBetContact}>{bet.contact} · {bet.region}</div>

        <div className={styles.bigBetMetrics}>
          <div className={styles.bigBetMetric}>
            <div className={styles.bigBetMetricLabel}>가중</div>
            <div className={styles.bigBetMetricValue}>{formatRevenue(bet.weighted)}</div>
          </div>
          <div className={styles.bigBetMetric}>
            <div className={styles.bigBetMetricLabel}>총액</div>
            <div className={styles.bigBetMetricValueDim}>{formatRevenue(bet.revenue)}</div>
          </div>
          <div className={styles.bigBetMetric}>
            <div className={styles.bigBetMetricLabel}>확률</div>
            <div className={styles.bigBetMetricValue} style={{ color: meta.color }}>{bet.probability}%</div>
          </div>
        </div>

        <div className={styles.bigBetFootRow}>
          <span className={styles.bigBetStage}>{bet.stage}</span>
          <span className={styles.bigBetOwner}>👤 {bet.owner}</span>
          {bet.daysSinceContact !== null && (
            <span className={styles.bigBetDays}>
              <Clock size={10} /> {bet.daysSinceContact}일 전
            </span>
          )}
          {hasNote && <span className={styles.bigBetNoted}><MessageSquare size={10} /> 노트</span>}
          {hasDoctorAnswers && (
            <span className={styles.bigBetDoctor} style={{ color: doctorVerdict.color }}>
              ⚕ {doctor.score}점
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className={styles.bigBetExpand}>
          <div className={styles.bigBetActionRow}>
            <strong>다음 액션:</strong> {bet.action || "미정"}
          </div>
          <div className={styles.bigBetActionRow}>
            <strong>마감:</strong> {bet.due || "미정"}
          </div>
          <div className={styles.bigBetActionRow} style={{ color: meta.color }}>
            <strong>{meta.label}:</strong> {meta.desc}
          </div>

          {/* Talk Track 추천 */}
          {(() => {
            const suggestion = suggestTalkTrack(bet);
            return (
              <a
                href={`/research?tab=talks&track=${suggestion.id}`}
                className={styles.suggestionCard}
                style={{ borderLeftColor: suggestion.color }}
              >
                <div className={styles.suggestionHead}>
                  <span className={styles.suggestionLabel}>💬 추천 토크 트랙</span>
                  <span className={styles.suggestionLink}>리서치에서 보기 →</span>
                </div>
                <div className={styles.suggestionTitle} style={{ color: suggestion.color }}>
                  {suggestion.title}
                </div>
                <div className={styles.suggestionWhy}>{suggestion.why}</div>
              </a>
            );
          })()}

          <textarea
            className={styles.bigBetNote}
            placeholder="이 딜의 전략 노트 — 키 인사이트, 경쟁 상황, 결정자 정보, 다음 7일 계획 등&#10;#태그 를 적으면 검색/필터링이 쉬워집니다 (예: #경쟁 #C레벨 #재계약)"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={5}
          />
          <div className={styles.bigBetNoteHint}>💾 자동 저장됨 (브라우저 로컬) · #태그로 분류 가능</div>

          {/* Deal Doctor — 12-question diagnostic */}
          <div className={styles.doctorPanel}>
            <div className={styles.doctorHeader}>
              <div>
                <div className={styles.doctorTitle}>⚕ Deal Doctor 진단</div>
                <div className={styles.doctorSubtitle}>12개 질문에 답하면 딜 건강도가 점수화됩니다</div>
              </div>
              {hasDoctorAnswers && (
                <div className={styles.doctorScoreCircle} style={{ borderColor: doctorVerdict.color, color: doctorVerdict.color }}>
                  <div className={styles.doctorScoreNum}>{doctor.score}</div>
                  <div className={styles.doctorScoreLabel}>{doctorVerdict.label}</div>
                </div>
              )}
            </div>

            {hasDoctorAnswers && (
              <div className={styles.doctorCategoryRow}>
                {(["Champion", "Pain", "Process", "Forecast"] as const).map((cat) => {
                  const c = doctor.byCategory[cat];
                  const pct = c.total > 0 ? Math.round((c.yes / c.total) * 100) : 0;
                  const catColor = pct >= 67 ? "#22c55e" : pct >= 34 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={cat} className={styles.doctorCatItem}>
                      <div className={styles.doctorCatName}>{cat}</div>
                      <div className={styles.doctorCatBar}>
                        <div className={styles.doctorCatBarFill} style={{ width: `${pct}%`, background: catColor }} />
                      </div>
                      <div className={styles.doctorCatScore} style={{ color: catColor }}>{c.yes}/{c.total}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.doctorQuestions}>
              {(["Champion", "Pain", "Process", "Forecast"] as const).map((cat) => {
                const catQs = DEAL_DOCTOR_QUESTIONS.filter((q) => q.category === cat);
                return (
                  <div key={cat} className={styles.doctorCatGroup}>
                    <div className={styles.doctorCatGroupLabel}>{cat}</div>
                    {catQs.map((q) => {
                      const ans = doctorAnswers[q.id];
                      return (
                        <div key={q.id} className={styles.doctorQuestion}>
                          <div className={styles.doctorQuestionText}>
                            <div className={styles.doctorQText}>{q.question}</div>
                            <div className={styles.doctorQHint}>{q.hint}</div>
                          </div>
                          <div className={styles.doctorAnswerBtns}>
                            <button
                              type="button"
                              className={`${styles.doctorBtn} ${ans === true ? styles.doctorBtnYes : ""}`}
                              onClick={() => onDoctorChange(q.id, true)}
                            >
                              ✓ Yes
                            </button>
                            <button
                              type="button"
                              className={`${styles.doctorBtn} ${ans === false ? styles.doctorBtnNo : ""}`}
                              onClick={() => onDoctorChange(q.id, false)}
                            >
                              ✕ No
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {doctor.score < 60 && hasDoctorAnswers && (
              <div className={styles.doctorVerdictBox} style={{ borderLeftColor: doctorVerdict.color }}>
                <strong style={{ color: doctorVerdict.color }}>⚠ {doctor.score}점 — 결정 필요</strong>
                <div>이 딜은 forecast에서 빼거나 ‘kill or save’ 결정을 내리세요. Champion 약함이 가장 흔한 원인입니다.</div>
              </div>
            )}
          </div>
        </div>
      )}
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
