"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeInfo,
  Brain,
  BookOpen,
  ChevronRight,
  MessageCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import styles from "./page.module.css";
import { formatRevenue } from "@/lib/formatCurrency";
import { SALES_LEGENDS, getContextualTip, type GuruTip, type SalesLegend } from "@/lib/salesTips";
import { RESOURCES, RESOURCE_CATEGORY_LABEL, RESOURCE_CATEGORY_EMOJI, isNewResource, getWeeklyResource, type Resource, type ResourceCategory } from "@/lib/resources";
import type { ActivityStage, DashboardPayload, HotDeal, IndividualData, RegionData } from "@/types/dashboard";

type ResearchTab = "library" | "patterns" | "intel" | "resources" | "talks";
type MethodologyId = SalesLegend["id"];

type MethodologyDetail = {
  tagline: string;
  bestFor: string;
  useWhen: string;
  playbook: string[];
  questions: string[];
};

type PatternCard = {
  id: string;
  tag: string;
  methodology: MethodologyId;
  title: string;
  summary: string;
  signal: string;
  impact: string;
  usedBy: string;
  winRate: number;
  region: string;
};

type PatternWorkbench = PatternCard & {
  evidence: string[];
  recommendedPlay: string[];
  replicationTargets: string[];
  experiment: string;
};

type IntelCard = {
  id: string;
  urgency: "high" | "medium" | "low";
  region: string;
  title: string;
  summary: string;
  countermove: string;
  date: string;
};

type IntelWorkbench = IntelCard & {
  drivers: string[];
  checklist: string[];
  scenarioImpact: string;
};

type DashboardSnapshot = DashboardPayload;

const EMPTY_DASHBOARD: DashboardSnapshot = {
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

const TABS: Array<{ id: ResearchTab; label: string; icon: React.ReactNode }> = [
  { id: "library", label: "Library", icon: <BookOpen size={14} /> },
  { id: "resources", label: "Resources", icon: <Brain size={14} /> },
  { id: "patterns", label: "Patterns", icon: <Star size={14} /> },
  { id: "intel", label: "Intel", icon: <ShieldAlert size={14} /> },
  { id: "talks", label: "Talk Tracks", icon: <MessageCircle size={14} /> },
];

const METHODOLOGY_DETAILS: Record<MethodologyId, MethodologyDetail> = {
  Challenger: {
    tagline: "Challenge the status quo with a point of view the buyer can act on.",
    bestFor: "Complex BD motions where the customer needs reframing, not another feature tour.",
    useWhen: "Use when the deal is stuck in polite discovery and the team needs a sharper commercial angle.",
    playbook: [
      "Open with a commercial insight, not product history.",
      "Use constructive tension to make the hidden cost visible.",
      "Lead the customer to a new way of thinking before proposing a solution.",
      "Tailor the message to each stakeholder's role, priorities, and personal motivators before the meeting.",
    ],
    questions: [
      "What is the hidden cost of doing nothing?",
      "Which assumption is the buyer treating as fixed?",
      "What would change if the team accepted a different frame?",
      "What insight could reorder the buyer's priorities and make our solution the obvious next step?",
    ],
  },
  SPIN: {
    tagline: "Let the buyer surface pain through disciplined questions.",
    bestFor: "Discovery-heavy pursuits where the team needs to convert vague interest into urgency.",
    useWhen: "Use when the account has a problem but the downside is not fully quantified.",
    playbook: [
      "Start with the current situation and keep the questions grounded.",
      "Move from problem to implication before introducing any payoff.",
      "Use need-payoff questions to let the buyer articulate the value.",
      "Minimize feature explanations until the buyer has verbalized the full cost of inaction.",
    ],
    questions: [
      "What is the current process and where does it break down?",
      "What is the business impact if the issue continues?",
      "What changes if this is solved this quarter?",
      "If you could quantify the annual cost of this problem, what number would surprise your CFO?",
    ],
  },
  MEDDIC: {
    tagline: "Qualify the deal the way an operator would qualify a forecast.",
    bestFor: "Late-stage or enterprise motions that require evidence, sponsor coverage, and process clarity.",
    useWhen: "Use when the team needs to de-risk a large opportunity or verify forecast quality.",
    playbook: [
      "Verify the economic buyer early.",
      "Write the decision criteria before the team assumes them.",
      "Track the paper process so the forecast does not stall late.",
      "Build and test the champion — confirm they have both the power and the will to advocate internally.",
    ],
    questions: [
      "Who owns the budget and approval path?",
      "What criteria will decide the final choice?",
      "What proof is needed to move the deal forward?",
      "If this deal stalled today, who inside the account would fight to revive it — and why?",
    ],
  },
  Sandler: {
    tagline: "Make mutual commitment explicit so the team can move fast without guessing.",
    bestFor: "High-friction opportunities that need stronger control of the sales process.",
    useWhen: "Use when the buyer is polite, the timeline is fuzzy, or the next step keeps slipping.",
    playbook: [
      "Set an upfront contract before the meeting ends.",
      "Treat pain and budget as separate questions.",
      "Use a clean no to reach a cleaner yes.",
      "Deploy the Dummy Curve — ask naive questions to invite the buyer to explain, then listen for the real objection.",
    ],
    questions: [
      "What is the real pain behind the request?",
      "What happens if the team does nothing?",
      "Who is actually committed to the next step?",
      "On a scale of 1–10, how serious is this pain — and what would make it a 10?",
    ],
  },
  General: {
    tagline: "Reusable operating rules that keep the field team aligned.",
    bestFor: "Cross-functional BD and ops work where the team needs a common baseline.",
    useWhen: "Use when the process matters as much as the pitch.",
    playbook: [
      "Keep the message simple enough for the field team to repeat.",
      "Use numbers that support the next action, not vanity metrics.",
      "Turn good patterns into shared operating rules.",
      "Run a weekly deal review that focuses on what has changed, not what is already known.",
    ],
    questions: [
      "What is the one metric that changes the next move?",
      "What pattern is repeatable across accounts?",
      "What needs to be documented so the team can reuse it?",
      "What assumption is the team making that has not been validated with the buyer this week?",
    ],
  },
  Outbound: {
    tagline: "Build a system that generates pipeline without depending on heroic individuals.",
    bestFor: "Scaling an outbound motion with a dedicated SDR team and repeatable sequences.",
    useWhen: "Use when the team needs to move from reactive to proactive pipeline generation.",
    playbook: [
      "Separate roles: SDR owns prospecting, AE owns closing, CSM owns expansion.",
      "Lead with a cold email referral to the right contact — not a direct pitch.",
      "Track pipeline by lead source: Seeds (organic), Nets (marketing), Spears (outbound).",
      "Niche down the ICP before scaling sequences — a tight target list outperforms volume every time.",
    ],
    questions: [
      "Who owns pipeline generation — a repeatable system or individual heroics?",
      "What is the current SDR-to-AE ratio and is it sustainable at scale?",
      "Which lead source is producing the highest-quality pipeline right now?",
      "If the top SDR left tomorrow, how much pipeline would disappear — and what does that tell us about the system?",
    ],
  },
  Prospecting: {
    tagline: "An empty pipeline is the root cause of every sales problem.",
    bestFor: "Field sellers who need to rebuild pipeline discipline from scratch.",
    useWhen: "Use when pipeline is thin, deal velocity is low, or the team avoids outreach.",
    playbook: [
      "Time-block 1–2 hours daily for prospecting — treat it as non-negotiable.",
      "Mix phone, email, social, and in-person to maximize reach across channels.",
      "Apply the 30-day rule: what you do today shapes your pipeline in 30 days.",
      "Track activity metrics weekly — dials, emails sent, connections made — and hold the numbers sacred.",
    ],
    questions: [
      "How many hours per week is each rep spending on active prospecting?",
      "What channels are generating the best response rates right now?",
      "What would the pipeline look like if the team stopped prospecting for 30 days?",
      "Which rep has the strongest prospecting habit, and what can the rest of the team copy from their routine?",
    ],
  },
  Negotiation: {
    tagline: "Never split the difference — use empathy to reach the right outcome, not a compromise.",
    bestFor: "Late-stage deals where price, terms, or commitment are being contested.",
    useWhen: "Use when the buyer is stalling, anchoring low, or asking for concessions.",
    playbook: [
      "Open with a calibrated question: 'How am I supposed to make that work?'",
      "Use mirroring (repeat last 3 words) to keep the buyer talking and surface concerns.",
      "Name their emotion before they do — it builds trust faster than any argument.",
      "Run an Accusation Audit before critical calls — list every negative the buyer might say and address them first.",
    ],
    questions: [
      "What emotion is actually driving the buyer's current position?",
      "What is the real 'no' underneath their hesitation?",
      "What calibrated question would make them think rather than react?",
      "What is the Black Swan — the hidden constraint the buyer has not yet revealed — that would explain everything?",
    ],
  },
};

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}


function formatDateStamp(value?: string): string {
  if (!value) {
    return "Not synced yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatIsoDate(value?: string): string {
  if (!value) {
    return "Not synced yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not synced yet";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeDashboardPayload(payload: Partial<DashboardPayload> | null | undefined): DashboardSnapshot {
  return {
    ...EMPTY_DASHBOARD,
    ...payload,
    stats: payload?.stats ?? [],
    regional: payload?.regional ?? [],
    bottleneck: payload?.bottleneck ?? [],
    individuals: payload?.individuals ?? [],
    focusAccounts: payload?.focusAccounts ?? [],
    topAccounts: payload?.topAccounts ?? [],
    hotDeals: payload?.hotDeals ?? [],
    pacing: payload?.pacing ?? [],
    aging: payload?.aging ?? [],
    teamSummary: {
      ...EMPTY_DASHBOARD.teamSummary,
      ...(payload?.teamSummary ?? {}),
    },
  };
}

function getWeakestRegion(regions: RegionData[]): RegionData | null {
  if (regions.length === 0) {
    return null;
  }

  return regions.reduce((lowest, current) => (current.progress < lowest.progress ? current : lowest));
}

function getStrongestRegion(regions: RegionData[]): RegionData | null {
  if (regions.length === 0) {
    return null;
  }

  return regions.reduce((highest, current) => (current.progress > highest.progress ? current : highest));
}

function getWeakestStage(stages: ActivityStage[]): ActivityStage | null {
  if (stages.length === 0) {
    return null;
  }

  return stages.reduce((lowest, current) => ((current.progress ?? 0) < (lowest.progress ?? 0) ? current : lowest));
}

function getTopDeal(deals: HotDeal[]): HotDeal | null {
  if (deals.length === 0) {
    return null;
  }

  return deals.reduce((best, current) => {
    if (current.probability !== best.probability) {
      return current.probability > best.probability ? current : best;
    }

    return current.value > best.value ? current : best;
  });
}

function getTopManager(individuals: IndividualData[]): IndividualData | null {
  if (individuals.length === 0) {
    return null;
  }

  return individuals[0] ?? null;
}

function buildPatternCards(dashboard: DashboardSnapshot): PatternCard[] {
  const weakestRegion = getWeakestRegion(dashboard.regional);
  const strongestRegion = getStrongestRegion(dashboard.regional);
  const weakestStage = getWeakestStage(dashboard.bottleneck);
  const topDeal = getTopDeal(dashboard.hotDeals);
  const topManager = getTopManager(dashboard.individuals);
  const fallback = dashboard.dataSource !== "google-sheets";
  const cards: PatternCard[] = [];

  if (weakestRegion && strongestRegion) {
    const regionGap = Math.max(strongestRegion.progress - weakestRegion.progress, 0);
    cards.push({
      id: `pattern-region-${weakestRegion.name}`,
      tag: "Reframe",
      methodology: "Challenger",
      title: `${weakestRegion.name} is the region to reframe first`,
      summary: `It is sitting at ${weakestRegion.progress}% attainment versus ${strongestRegion.name} at ${strongestRegion.progress}%.`,
      signal: `${formatRevenue(weakestRegion.revenue)} booked against ${formatRevenue(weakestRegion.target)} target.`,
      impact: `Use a commercial insight to close the ${regionGap}-point gap before the next manager review.`,
      usedBy: dashboard.teamSummary.topManager,
      winRate: Math.max(40, Math.min(95, weakestRegion.progress)),
      region: weakestRegion.name,
    });
  }

  if (weakestStage) {
    cards.push({
      id: `pattern-stage-${weakestStage.stage}`,
      tag: "Qualification",
      methodology: "MEDDIC",
      title: `${weakestStage.stage} is the active bottleneck`,
      summary: `Activity is running at ${weakestStage.progress ?? 0}% of goal, with ${weakestStage.actual ?? 0}/${weakestStage.goal ?? weakestStage.fullMark} completed.`,
      signal: `Team execution is at ${dashboard.teamSummary.activityCompletion.toFixed(1)}% across the current board.`,
      impact: "Tighten decision criteria and owner handoff here first.",
      usedBy: "Ops-led sellers",
      winRate: Math.max(35, Math.min(95, weakestStage.progress ?? 0)),
      region: "BD Team",
    });
  }

  if (topDeal) {
    cards.push({
      id: `pattern-deal-${topDeal.id}`,
      tag: "Momentum",
      methodology: "Sandler",
      title: `${topDeal.client} is the clearest near-term commitment`,
      summary: `At ${topDeal.probability}% probability and ${formatRevenue(topDeal.value)} value, this is the fastest path to forecast certainty.`,
      signal: `${topDeal.manager} / ${topDeal.region} / ${topDeal.version}`,
      impact: "Lock the next meeting, pain, and decision path now.",
      usedBy: "Active pipeline",
      winRate: topDeal.probability,
      region: topDeal.region,
    });
  }

  if (topManager) {
    cards.push({
      id: `pattern-manager-${topManager.name}`,
      tag: "Adoption",
      methodology: "General",
      title: `${topManager.name} is the current operating reference`,
      summary: `They have ${formatRevenue(topManager.wonRevenue)} won revenue on ${topManager.deals_won}/${topManager.deals_total} closed deals.`,
      signal: `Activity ${topManager.activityActual ?? 0}/${topManager.activityGoal ?? 0} and ${formatRevenue(topManager.pipelineRevenue)} still in play.`,
      impact: "Replicate the motion that is already producing the board's best numbers.",
      usedBy: "Team bench",
      winRate: Math.max(40, Math.min(95, topManager.progress)),
      region: "BD Team",
    });
  }

  if (cards.length === 0) {
    return [
      {
        id: "pattern-dummy-1",
        tag: "Reframe",
        methodology: "Challenger",
        title: "Regional pattern placeholder",
        summary: "Waiting for the BD dashboard payload to generate live patterns.",
        signal: "No live regional data yet.",
        impact: "Keep this tab aligned to sheet-backed data once it arrives.",
        usedBy: "BD Team",
        winRate: 0,
        region: "BD Team",
      },
      {
        id: "pattern-dummy-2",
        tag: "Qualification",
        methodology: "MEDDIC",
        title: "Pipeline placeholder",
        summary: "Waiting for the live bottleneck and deal list to populate this view.",
        signal: "No live stage data yet.",
        impact: "Replace with dashboard-derived cards when the payload is ready.",
        usedBy: "Ops",
        winRate: 0,
        region: "BD Team",
      },
    ];
  }

  return cards.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────
// Battle Cards — competitor playbooks
// ─────────────────────────────────────────────────────────────────

interface BattleCard {
  id: string;
  competitor: string;
  category: string;
  positioning: string;
  ourEdge: string[];
  theirEdge: string[];
  objections: { q: string; a: string }[];
  talkTrack: string;
  color: string;
}

const BATTLE_CARDS: BattleCard[] = [
  {
    id: "incumbent",
    competitor: "기존 사내 시스템",
    category: "Status Quo",
    positioning: "“우린 이미 엑셀로 잘 굴리고 있어요”",
    color: "#64748b",
    ourEdge: [
      "수동 집계 대비 분석 시간 80% 단축 — 매니저 1명/일 환산",
      "실시간 데이터로 의사결정 시점 1주일 이상 단축",
      "여러 부서가 동일 진실 위에서 회의 (single source of truth)",
    ],
    theirEdge: [
      "초기 비용 0원처럼 보임 (실제로는 인건비 숨겨짐)",
      "익숙함 — 변화 거부감 낮음",
    ],
    objections: [
      {
        q: "“엑셀로도 충분한데 왜 새 시스템이?”",
        a: "엑셀 5분 vs 자동화 30초의 차이가 분기 100시간. 그 시간을 고객 미팅 5건으로 환산해 보여주세요.",
      },
      {
        q: "“교육에 시간이 너무 들 것 같아요”",
        a: "온보딩 30분, 첫 가치 24시간 이내 — 비교 가능한 다른 도구의 1/10. POC 데이터로 증명.",
      },
    ],
    talkTrack:
      "“지금 매주 토요일에 매니저들이 데이터 정리하는 데 몇 시간 쓰시는지 아세요? 그 시간을 다음 주 핵심 딜 준비로 돌릴 수 있다면…”",
  },
  {
    id: "salesforce",
    competitor: "Salesforce",
    category: "Enterprise CRM",
    positioning: "“글로벌 표준이니까 안전”",
    color: "#0ea5e9",
    ourEdge: [
      "한국 BD 워크플로우에 맞춘 즉시 사용 가능한 템플릿",
      "도입 비용 1/5, 운영 부담 90% 감소",
      "AI 인사이트가 빌트인 — 별도 라이선스 불필요",
    ],
    theirEdge: [
      "글로벌 통합/외부 시스템 연결 풍부",
      "엔터프라이즈 컴플라이언스 신뢰도",
    ],
    objections: [
      {
        q: "“Salesforce가 더 안전하지 않나요?”",
        a: "안전 ≠ 효과적. 안 쓰는 시스템은 어떤 등급이라도 ROI 0. 우리 도입 후 사용률 측정해서 비교 제시.",
      },
      {
        q: "“통합이 부족할 것 같아요”",
        a: "한국 BD가 매일 쓰는 5대 도구 (시트/슬랙/노션/카톡/이메일) 100% 연결. 글로벌 통합은 필요 시 API로.",
      },
    ],
    talkTrack:
      "“Salesforce 도입한 팀의 60%가 6개월 후에도 어색해 합니다. 우린 그게 싫어서 만들었어요 — 한국 영업이 몸에 익히는 데 1주일.”",
  },
  {
    id: "notion-airtable",
    competitor: "Notion / Airtable 직접 구축",
    category: "DIY Stack",
    positioning: "“우리가 필요한 것만 직접 만들 수 있다”",
    color: "#a855f7",
    ourEdge: [
      "Pre-built 파이프라인 + 실시간 KPI — 만들 필요 없음",
      "BD 전문가 인사이트 내장 (방법론, 코칭, 패턴 감지)",
      "유지보수 책임 0 — 그들은 매번 깨짐",
    ],
    theirEdge: [
      "초기 커스터마이징 자유도",
      "노션 사용 중인 팀은 이미 익숙",
    ],
    objections: [
      {
        q: "“우리 노션으로 만들면 안 되나요?”",
        a: "1년 후 스프레드시트 30개로 도배되는 사례 99%. 도구 ≠ 시스템. 우리는 BD를 시스템으로 운영하게 합니다.",
      },
    ],
    talkTrack:
      "“노션은 페이지 만드는 도구이지, BD를 운영하는 시스템이 아닙니다. 매니저의 머릿속이 아니라 우리 시스템에서 다음 액션이 나오게 만드세요.”",
  },
  {
    id: "no-decision",
    competitor: "결정 보류",
    category: "Inertia",
    positioning: "“이번 분기 끝나고 다시 봐요”",
    color: "#ef4444",
    ourEdge: [
      "지금 도입 = 이번 분기에 최소 1건의 큰 딜 회수 보장",
      "1주일 안에 첫 가치 — 분기 내 ROI 가능",
      "유예 비용 측정: 매주 ¥X 매출 누수",
    ],
    theirEdge: ["변화 없음 = 안전감"],
    objections: [
      {
        q: "“다음 분기에 다시 얘기하죠”",
        a: "다음 분기에 후회할 결정 1순위가 ‘지난 분기 미루기’입니다. 4주 POC로 위험 0, 데이터로 본인이 결정하게.",
      },
      {
        q: "“우선 순위가 더 높은 게 있어요”",
        a: "그 우선 순위들이 지금 안 풀리는 이유가 보통 ‘데이터 가시성 부족’입니다. 이걸 먼저 풀면 다른 게 자동으로.",
      },
    ],
    talkTrack:
      "“결정을 미루는 비용이 결정하는 비용보다 큰지 같이 따져봐요. 4주 안에 답이 나오는 POC로 시작하면 위험이 0입니다.”",
  },
  {
    id: "open-source",
    competitor: "오픈소스 / 무료 대안",
    category: "Free Tier Trap",
    positioning: "“Github에서 별 1만개짜리 무료가 있어요”",
    color: "#10b981",
    ourEdge: [
      "TCO 계산: 엔지니어 1명 × 6개월 운영 = ¥X (실제 비용은 ‘무료’의 5-10배)",
      "보안/컴플라이언스 책임 100% 본인 부담 — 사고 발생 시 변호사 비용",
      "업데이트/패치 미적용 시 4-6개월 내 기술부채화",
    ],
    theirEdge: [
      "초기 라이선스 비용 0",
      "코드 수정 자유도 100%",
    ],
    objections: [
      {
        q: "“우리 개발자가 만들 수 있어요”",
        a: "“만들 수 있다”와 “6개월 후에도 운영할 수 있다”는 다른 문제예요. 처음 만든 개발자가 퇴사하면 0부터 다시. 우리는 그 리스크를 영구히 제거합니다.",
      },
      {
        q: "“오픈소스가 더 안전하지 않나요?”",
        a: "코드가 공개돼 있다 ≠ 안전하다. CVE 패치 평균 적용 시간이 187일입니다. 우리는 4시간 이내.",
      },
    ],
    talkTrack:
      "“무료 도구의 진짜 가격은 라이선스가 아니라 ‘책임 이전’이에요. 사고가 났을 때 누가 4시간 안에 패치를 만드나요? 그게 우리가 받는 비용입니다.”",
  },
  {
    id: "consulting-firm",
    competitor: "대형 컨설팅 펌",
    category: "Trusted Advisor",
    positioning: "“BCG/Bain이 6개월 프로젝트 제안했어요”",
    color: "#f59e0b",
    ourEdge: [
      "구현 시간: 6개월 → 6주 (10배 빠름)",
      "결과물: PPT 200장 → 동작하는 실시간 시스템",
      "비용: ¥10억 → ¥1억 미만 (90% 절감)",
      "운영 후 책임: 컨설팅은 종료 시점에 끝남, 우리는 SLA 보장",
    ],
    theirEdge: [
      "C-level 신뢰도 (브랜드)",
      "조직 변화 관리 노하우",
      "이사회 정치 보호막",
    ],
    objections: [
      {
        q: "“그래도 BCG 보고서는 이사회 통과시킬 때 든든해요”",
        a: "이해합니다. 그래서 저희는 ‘BCG 진단 + 우리 실행’ 조합을 추천드려요. 그들에게 진단만 4주짜리로 받으시고, 실행은 우리에게. 비용 30% 절감 + 6배 빠른 실행.",
      },
      {
        q: "“커스터마이징이 부족할 것 같아요”",
        a: "오히려 반대입니다. 컨설턴트는 ‘제안’만 하고 떠나요. 우리는 들어와서 같이 만듭니다. 그게 진짜 커스터마이징이에요.",
      },
    ],
    talkTrack:
      "“좋은 컨설팅은 ‘무엇을 해야 하는지’를 알려주는 거고, 우리는 ‘그걸 해드리는 것’이에요. 둘 다 필요하지만, 후자가 없으면 PPT만 남습니다.”",
  },
  {
    id: "swap-out",
    competitor: "후기 단계 swap-out (Late Stage Replacement)",
    category: "Rip & Replace",
    positioning: "“이미 다른 거 6개월 썼는데 이제 와서?”",
    color: "#dc2626",
    ourEdge: [
      "마이그레이션 cost zero — 우리가 데이터/세팅 다 옮겨드림",
      "기존 시스템과 60일간 병행 운영 (롤백 가능)",
      "성공 보장: 90일 안에 ROI 미달성 시 전액 환불",
      "동일 산업 전환 사례 N개 — 평균 만족도 9.2/10",
    ],
    theirEdge: [
      "이미 학습 곡선 지난 상태",
      "투자한 시간/돈 매몰비용",
      "팀 변화 거부감",
    ],
    objections: [
      {
        q: "“교체에 또 6개월 걸릴 텐데”",
        a: "사실 6주입니다. 우리가 ‘병행 + 점진적 이전’ 방식이라서요. 첫 주부터 두 시스템 동시에 보시면서 직접 비교 가능. 이전 시스템이 더 좋으면 그대로 두시면 됩니다.",
      },
      {
        q: "“팀이 또 새로 배우기 싫어해요”",
        a: "그래서 저희는 ‘기존 워크플로우 위에 얹는’ 방식이에요. 매니저들은 평소 쓰던 시트 그대로 쓰고, 우리는 뒤에서 자동화. 학습 곡선 사실상 0.",
      },
      {
        q: "“이미 ¥XM 투자했어요”",
        a: "매몰비용 함정이에요. 지금부터의 12개월 ROI만 비교하시면 됩니다. 과거 투자는 어디에 가도 못 돌려받습니다.",
      },
    ],
    talkTrack:
      "“매몰비용은 함정이에요. 지난 6개월에 쓴 돈은 어느 도구를 쓰든 못 돌려받습니다. 중요한 건 ‘앞으로의 12개월에 어디서 더 많은 매출이 나오느냐’ — 그것만 비교하시면 됩니다.”",
  },
];

function buildIntelCards(dashboard: DashboardSnapshot): IntelCard[] {
  const weakestRegion = getWeakestRegion(dashboard.regional);
  const weakestStage = getWeakestStage(dashboard.bottleneck);
  const topDeal = getTopDeal(dashboard.hotDeals);
  const agingDeals = dashboard.aging.filter((deal) => deal.days >= 40);
  const lastUpdated = formatIsoDate(dashboard.lastUpdated);
  const fallback = dashboard.dataSource !== "google-sheets";
  const cards: IntelCard[] = [];

  if (weakestRegion) {
    const openGap = Math.max(weakestRegion.target - weakestRegion.revenue, 0);
    cards.push({
      id: `intel-region-${weakestRegion.name}`,
      urgency: weakestRegion.progress < 70 ? "high" : weakestRegion.progress < 85 ? "medium" : "low",
      region: weakestRegion.name,
      title: `${weakestRegion.name} is the first region to intervene on`,
      summary: `It is at ${weakestRegion.progress}% attainment, with ${formatRevenue(openGap)} still open against target.`,
      countermove: "Open with a reframing note and tighten the next-step ask around the gap.",
      date: lastUpdated,
    });
  }

  if (agingDeals.length > 0) {
    const oldest = agingDeals.slice().sort((left, right) => right.days - left.days)[0];
    cards.push({
      id: `intel-aging-${oldest.id}`,
      urgency: "high",
      region: "BD Team",
      title: `${agingDeals.length} aging deals need a re-qualification pass`,
      summary: `The oldest open item is ${oldest.days} days old and should be reset before the month closes.`,
      countermove: "Re-open pain, decision criteria, and owner path on the oldest account first.",
      date: lastUpdated,
    });
  }

  if (topDeal) {
    cards.push({
      id: `intel-deal-${topDeal.id}`,
      urgency: topDeal.probability >= 85 ? "high" : topDeal.probability >= 75 ? "medium" : "low",
      region: topDeal.region,
      title: `${topDeal.client} is the clearest momentum signal`,
      summary: `The deal sits at ${topDeal.probability}% probability and ${formatRevenue(topDeal.value)} value, making it a useful board proof point.`,
      countermove: "Copy the current commitment discipline to adjacent opportunities.",
      date: lastUpdated,
    });
  }

  if (weakestStage) {
    cards.push({
      id: `intel-stage-${weakestStage.stage}`,
      urgency: (weakestStage.progress ?? 0) < 50 ? "high" : (weakestStage.progress ?? 0) < 75 ? "medium" : "low",
      region: "BD Team",
      title: `${weakestStage.stage} is the activity bottleneck`,
      summary: `The stage is at ${weakestStage.progress ?? 0}% of goal, which is shaping the next manager coaching cycle.`,
      countermove: "Use the weakest stage as the playbook for coaching, not just reporting.",
      date: lastUpdated,
    });
  }

  if (cards.length === 0) {
    return [
      {
        id: "intel-dummy-1",
        urgency: "medium",
        region: "BD Team",
        title: "Live intel placeholder",
        summary: "Waiting for the dashboard payload to surface region, deal, and activity signals.",
        countermove: "Keep this view tied to the live board, not static research notes.",
        date: lastUpdated,
      },
    ];
  }

  return cards.slice(0, 4);
}

function buildPatternWorkbenchCards(dashboard: DashboardSnapshot): PatternWorkbench[] {
  const strongestRegion = getStrongestRegion(dashboard.regional);
  const weakestRegion = getWeakestRegion(dashboard.regional);
  const weakestStage = getWeakestStage(dashboard.bottleneck);
  const topDeal = getTopDeal(dashboard.hotDeals);
  const topManager = getTopManager(dashboard.individuals);

  return buildPatternCards(dashboard).map((pattern) => {
    const method = METHODOLOGY_DETAILS[pattern.methodology];
    const evidence = [
      pattern.signal,
      dashboard.dataSource === "google-sheets"
        ? `Live board updated ${formatDateStamp(dashboard.lastUpdated)}.`
        : "Fallback board is active, so use this as a mock planning view.",
      weakestStage ? `Weakest stage right now: ${weakestStage.stage} at ${weakestStage.progress ?? 0}%.` : null,
      weakestRegion ? `Lowest regional attainment is ${weakestRegion.name} at ${weakestRegion.progress}%.` : null,
    ].filter((item): item is string => Boolean(item));

    const replicationTargets = [
      strongestRegion ? `${strongestRegion.name} region cadence` : null,
      topManager ? `${topManager.name} manager motion` : null,
      topDeal ? `${topDeal.client} account play` : null,
    ].filter((item): item is string => Boolean(item));

    return {
      ...pattern,
      evidence: evidence.slice(0, 3),
      recommendedPlay: [
        method.playbook[0],
        method.playbook[1],
        `Use ${pattern.impact.toLowerCase()}`,
      ].slice(0, 3),
      replicationTargets: replicationTargets.slice(0, 3),
      experiment:
        pattern.methodology === "Challenger"
          ? "Test a sharper commercial reframe on the next weak-region review."
          : pattern.methodology === "MEDDIC"
            ? "Score decision criteria and sponsor clarity before the next forecast call."
            : pattern.methodology === "Sandler"
              ? "Force a clean yes/no on pain, budget, and next-step commitment."
              : "Run a tighter discovery sequence and compare response quality after one week.",
    };
  });
}

function buildIntelWorkbenchCards(dashboard: DashboardSnapshot): IntelWorkbench[] {
  const weakestRegion = getWeakestRegion(dashboard.regional);
  const weakestStage = getWeakestStage(dashboard.bottleneck);
  const topDeal = getTopDeal(dashboard.hotDeals);
  const lastUpdated = formatDateStamp(dashboard.lastUpdated);

  return buildIntelCards(dashboard).map((card) => ({
    ...card,
    drivers: [
      weakestRegion && card.region === weakestRegion.name
        ? `${weakestRegion.name} still has ${formatRevenue(Math.max(weakestRegion.target - weakestRegion.revenue, 0))} open against target.`
        : null,
      weakestStage ? `${weakestStage.stage} is tracking at ${weakestStage.progress ?? 0}% of goal.` : null,
      topDeal ? `${topDeal.client} remains the cleanest momentum proof point on the board.` : null,
      `Board reference refreshed ${lastUpdated}.`,
    ].filter((item): item is string => Boolean(item)).slice(0, 3),
    checklist:
      card.urgency === "high"
        ? [
            "Confirm owner and next meeting within 24 hours.",
            "Re-check the blocker that is creating the delay or risk.",
            "Escalate if the decision path is still vague after the next touchpoint.",
          ]
        : [
            "Confirm the next move before the next weekly review.",
            "Tie the note back to one region, deal, or stage signal.",
            "Log whether the countermove changed confidence or timing.",
          ],
    scenarioImpact:
      card.urgency === "high"
        ? "If this signal is ignored, forecast confidence and team focus will likely degrade first."
        : "If this signal is handled early, the team can recover pace without a full escalation cycle.",
  }));
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.emptyState}>
      <Sparkles size={16} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Talk Tracks — persona-based opening / objection / closing scripts
// ─────────────────────────────────────────────────────────────────

interface TalkTrack {
  id: string;
  persona: string;
  personaTag: string;
  scenario: string;
  color: string;
  opening: string;
  discoveryQuestions: string[];
  objections: { q: string; a: string }[];
  closing: string;
  followUp: string;
}

const TALK_TRACKS: TalkTrack[] = [
  {
    id: "ceo-cold",
    persona: "C-level (CEO/COO)",
    personaTag: "C-Suite",
    scenario: "콜드 어프로치 — 첫 5분 안에 흥미 유발",
    color: "#a855f7",
    opening:
      "“CEO님, 30초만 시간 주세요. 작년에 같은 규모 학원장님 12명을 만나봤는데, 모두 한 가지 공통된 고민이 있었어요. ‘매출은 늘었는데 매니저가 어디서 시간을 쓰는지 안 보인다’ — 이 문장에 공감하시면 5분만 더 들어주세요.”",
    discoveryQuestions: [
      "“지금 가장 중요한 매니저 1명이 다음 분기에 사라진다면 어떤 데이터가 가장 먼저 흔들릴까요?”",
      "“매주 어디에 시간이 가장 많이 빨려나가고 계신지 한 가지만 꼽아주실 수 있나요?”",
      "“1년 전과 비교해서 BD 결정의 속도가 빨라졌나요, 느려졌나요?”",
    ],
    objections: [
      {
        q: "“이미 시스템 있어요”",
        a: "“네, 대부분 그러시더라구요. 그래서 저희는 ‘대체’가 아니라 ‘위에 얹는’ 방식이에요. 기존 시트 그대로 두시고 30분 후에 비교해 보시면 됩니다.”",
      },
      {
        q: "“이번 분기는 너무 바빠요”",
        a: "“그래서 지금이 좋아요. 1주일 안에 첫 가치가 안 보이면 자동 종료. 분기 내 의사결정 부담 없습니다.”",
      },
    ],
    closing:
      "“다음 주 화요일 아침 30분, 직접 시연으로 시간 가치를 보여드릴게요. 그 자리에서 ‘아니다’ 결정 내리셔도 저희 편이에요.”",
    followUp:
      "‘지금 결정 미루는 비용 = 매주 ¥X 매출 누수’를 1페이지 계산표로 다음날 오전 보내기.",
  },
  {
    id: "manager-frustrated",
    persona: "BD 매니저 (실무)",
    personaTag: "Practitioner",
    scenario: "현장 매니저 — 도구 거부감을 신뢰로 전환",
    color: "#0ea5e9",
    opening:
      "“매니저님이 매주 토요일 오전에 데이터 정리하시는 거 알고 있어요. 솔직히 그 시간이 가장 아깝다고 생각하지 않으세요? 저희는 그 시간을 다음 주 큰 딜 준비로 돌리는 게 목표예요. 5분만 보여드릴게요.”",
    discoveryQuestions: [
      "“지금 1주일에 데이터 정리에 몇 시간이나 쓰고 계세요?”",
      "“가장 답답한 게 뭐예요? 내가 모르는데 윗선은 알아야 하는 거?”",
      "“만약 손에서 떠나는 시간이 1주일에 4시간 더 생기면 어디에 쓰시겠어요?”",
    ],
    objections: [
      {
        q: "“또 새로운 거 배워야 하나요?”",
        a: "“30분이면 됩니다. 그것도 매니저님의 익숙한 시트 위에 얹는 거라 ‘새 시스템’이 아니에요. 저희가 직접 와서 세팅합니다.”",
      },
      {
        q: "“상부가 결정해야 해요”",
        a: "“좋아요. 그럼 매니저님이 ‘이거 진짜 도움 됩니다’ 라고 한 줄 써주시면 저희가 상부에 보낼 1페이지 케이스를 준비할게요.”",
      },
    ],
    closing:
      "“이번 주 안에 30분만 시간 빼주세요. 매니저님의 지난주 데이터를 넣고 직접 보세요. 마음에 안 드시면 그날로 끝.”",
    followUp:
      "동일 규모 학원의 매니저 1명 추천서/인터뷰 영상 1개 다음날 보내기.",
  },
  {
    id: "renewal-stalled",
    persona: "기존 고객 (재계약 위기)",
    personaTag: "Renewal",
    scenario: "재계약 정체 — 가치 재인지 + 확장 제안",
    color: "#f59e0b",
    opening:
      "“대표님, 지난 1년 동안 저희 시스템으로 ¥X 매출 데이터가 정리됐어요. 그런데 솔직히 처음 계약하실 때 기대하셨던 가치가 정확히 그 ‘절약된 시간’이었는지 다시 한 번 확인하고 싶어서 드린 미팅이에요.”",
    discoveryQuestions: [
      "“1년 전에 해결하고 싶으셨던 게 정확히 무엇이었나요? 그게 지금 해결됐나요?”",
      "“아직 안 풀린 것 중 가장 큰 게 뭐예요?”",
      "“지금 와서 다시 결정한다면 똑같이 결정하시겠어요?”",
    ],
    objections: [
      {
        q: "“가격이 너무 올랐어요”",
        a: "“네, 잘 짚어주셨어요. 그래서 ‘플랜 다운그레이드 + 핵심 모듈만 유지’ 옵션도 있어요. 1주일 후에 비교해서 결정하시죠.”",
      },
      {
        q: "“다른 솔루션도 보고 있어요”",
        a: "“좋습니다. 비교는 항상 좋아요. 다만 ‘이미 1년 데이터가 쌓인 것’의 가치를 비교에 꼭 넣어주세요. 마이그레이션 비용이 보통 3-6개월 매출에 영향을 줍니다.”",
      },
    ],
    closing:
      "“이번 주 안에 5분만 더 시간 주세요. ‘유지/확장/축소’ 3가지 시나리오의 12개월 ROI 비교표 만들어드릴게요. 그걸 보고 결정하시면 됩니다.”",
    followUp:
      "확장 제안 (추가 모듈 또는 통합)으로 가격 반론을 가치 대화로 전환.",
  },
  {
    id: "champion-internal",
    persona: "내부 챔피언",
    personaTag: "Champion",
    scenario: "구매자 내부에서 우리를 대신 팔아주는 사람 양성",
    color: "#22c55e",
    opening:
      "“○○님이 저희에게 가장 솔직하게 말씀해 주신 분이에요. 그래서 부탁드리고 싶은 게 있어요 — 다음 의사결정 회의에 저희 대신 ‘이거 왜 필요한지’ 1분만 설명해 주세요. 저희가 그 1분을 최대한 쉽게 만들어드릴게요.”",
    discoveryQuestions: [
      "“○○님 입장에서 이 도입이 본인에게 어떤 이득이 될까요?”",
      "“회의에서 가장 큰 반대자는 누구일 것 같으세요? 그분이 어떤 우려를 가질 것 같아요?”",
      "“그 우려에 대비해서 저희가 어떤 자료를 미리 준비하면 도움이 될까요?”",
    ],
    objections: [
      {
        q: "“제가 직접 푸시하기는 좀…”",
        a: "“네, 부담 드리고 싶지 않아요. 그래서 저희가 1페이지 케이스를 ○○님 이름으로 보내드리는 걸로 할게요. ○○님은 그냥 회의에서 ‘제가 봤는데 괜찮더라구요’ 한 마디만 해주시면 됩니다.”",
      },
    ],
    closing:
      "“○○님이 회의 끝나면 결과만 한 줄 카톡 주세요. 다음 단계는 저희가 다 준비할게요.”",
    followUp:
      "회의 직전 ‘의사결정자가 던질 3가지 질문 + 답변 카드’ 보내기. 챔피언 무장이 가장 강력한 close.",
  },
  {
    id: "procurement",
    persona: "구매팀 (Procurement)",
    personaTag: "Procurement",
    scenario: "가격 협상과 계약 조건만 보는 게이트키퍼",
    color: "#dc2626",
    opening:
      "“구매팀의 역할이 ‘가장 좋은 조건을 회사에 가져오는 것’이라는 거 잘 알고 있어요. 저희도 그 목표에 100% 동의합니다. 그래서 처음부터 ‘BAFO (Best And Final Offer)’ 수준의 제안을 드릴게요. 시간 낭비 없이 핵심만 갑시다.”",
    discoveryQuestions: [
      "“이번 분기에 통과해야 하는 다른 계약들과 우선순위가 어떻게 되나요?”",
      "“법무팀 검토에서 가장 자주 막히는 조항이 무엇인가요? 그걸 미리 풀어드릴게요.”",
      "“성과 측정 KPI가 어떻게 되시는지 알려주시면 그 KPI에 맞춰 제안서 다시 짜드릴게요.”",
    ],
    objections: [
      {
        q: "“30% 더 깎아주세요”",
        a: "“가격은 가치의 함수예요. 30% 깎으려면 가치도 30% 줄여야 합니다. 어떤 모듈을 빼면 좋을지 같이 봐드릴게요. 아니면 12개월 → 24개월 계약으로 단가를 낮추는 방법도 있어요.”",
      },
      {
        q: "“경쟁사가 더 저렴해요”",
        a: "“네, 그분들 가격 알고 있어요. 그런데 ‘구현 비용 + 운영 비용 + 실패 비용’까지 다 더한 TCO로 보면 저희가 평균 22% 저렴합니다. TCO 비교표 만들어드릴게요.”",
      },
      {
        q: "“법무가 표준 NDA 안 받아요”",
        a: "“알겠습니다. 저희 법무팀과 직접 연결시켜드릴게요. 평균 4영업일 안에 합의 가능한 표준 조항 5개가 있어요. 시간 절약됩니다.”",
      },
    ],
    closing:
      "“이번 주 안에 ‘승인 가능한 최종 조건’으로 정리해서 보내드릴게요. 그 안에서 본인이 윗선에 자랑할 수 있는 항목 3가지를 미리 형광펜으로 표시해 드릴게요.”",
    followUp:
      "계약서 초안 + ‘이 계약이 회사에 가져오는 가치 1페이지’ 동시 발송. 구매팀이 윗선에 보고할 때 그대로 쓰게.",
  },
  {
    id: "tech-evaluator",
    persona: "기술 평가자 (CTO/엔지니어)",
    personaTag: "Tech Evaluator",
    scenario: "API 스펙부터 보안까지 깐깐하게 검증하는 상대",
    color: "#0891b2",
    opening:
      "“CTO님께 PPT보다 먼저 드릴 게 있어요 — API 문서 링크와 GitHub 샘플 레포입니다. 30분 동안 직접 만져보시고, 그 다음에 질문 받겠습니다. 보통 영업이 ‘저희는 보안이 좋아요’ 라고 말로만 하잖아요. 저는 그게 싫어서 코드부터 보여드려요.”",
    discoveryQuestions: [
      "“현재 스택에서 가장 깨지기 쉬운 부분이 어디예요? 그걸 우리가 어떻게 보강할 수 있는지 보여드릴게요.”",
      "“팀이 가장 시간 많이 쓰는 ‘짜증나는 작업’ 3가지가 뭔가요?”",
      "“보안 컴플라이언스 요구사항 (SOC2, ISO 등)이 어디까지 필요하세요?”",
    ],
    objections: [
      {
        q: "“우리 스택과 호환 안 될 것 같아요”",
        a: "“정확히 어느 부분이 걱정이세요? 저희 솔루션 엔지니어가 1시간 안에 호환성 매트릭스를 만들어드릴게요. 안 되는 부분이 있으면 솔직히 말씀드리고, 그 부분은 워크어라운드 또는 거절할게요.”",
      },
      {
        q: "“성능이 부족할 것 같아요”",
        a: "“숫자로 가시죠. 본인 환경에서 가장 트래픽 큰 시점에 부하 테스트 같이 돌려봐요. 결과가 본인 SLA보다 안 좋으면 계약 안 합니다.”",
      },
      {
        q: "“직접 만드는 게 더 빠를 것 같아요”",
        a: "“가능합니다. 그런데 ‘만드는 것’과 ‘운영/보안/업데이트’는 다른 비용이에요. 저희 고객 중 5팀이 자체 구축에서 우리로 전환했는데 평균 18개월 후였어요. 그 18개월의 기회비용을 미리 절약하시는 게 좋을 거 같아요.”",
      },
    ],
    closing:
      "“다음 주 화요일에 본인 시스템에 직접 붙여보는 ‘POC 워크숍’ 같이 하시죠. 4시간이면 충분합니다. 결과 안 좋으면 그 자리에서 말씀해 주세요.”",
    followUp:
      "API 문서 + Postman 컬렉션 + 동일 산업 기술 케이스스터디 1개. 영업 멘트 0%, 기술 콘텐츠 100%.",
  },
  {
    id: "skeptic-board",
    persona: "회의적 이사 / 보드 멤버",
    personaTag: "Skeptic",
    scenario: "“이게 진짜 효과 있어요?” 의심부터 하는 의사결정자",
    color: "#7c3aed",
    opening:
      "“이사님 시간이 30분이라고 들었어요. 저는 처음 5분에 ‘왜 이사님이 이걸 거절하셔야 하는지’를 먼저 말씀드릴게요. 그게 빠지면 진짜 의사결정이 안 되니까요. 그 다음에 25분은 그 거절 이유들을 하나씩 같이 검증해 봅시다.”",
    discoveryQuestions: [
      "“이사님이 비슷한 도입을 검토하신 적이 있다면, 어떤 점이 가장 실망스러우셨어요?”",
      "“이번 결정이 잘못됐을 때, 본인이 잃는 게 무엇인가요? 그게 진짜 두려움인 것 같습니다.”",
      "“경쟁사가 이미 도입했다면 본인 회사에 어떤 영향이 있을까요?”",
    ],
    objections: [
      {
        q: "“증거 보여주세요. 진짜 성과 있는 거예요?”",
        a: "“네, 그래서 저희가 만든 게 ‘진짜 고객의 진짜 매니저’와의 30분 통화예요. 영업 멘트 없이, 본인이 직접 물어보세요. 같은 규모, 같은 산업 3분 추천해드릴게요.”",
      },
      {
        q: "“흔한 마케팅 BS 아닙니까?”",
        a: "“그래서 저희는 90일 보장을 합니다. 90일 안에 본인이 정한 KPI 미달성 시 전액 환불. 전 고객의 7%가 환불받았고, 우린 그게 자랑입니다. 솔직했다는 뜻이니까요.”",
      },
      {
        q: "“우린 이미 충분히 잘 하고 있어요”",
        a: "“정말요? 그럼 한 가지 질문 — 만약 본인이 지금 자리에서 6개월 후에 사라진다면, 후임자가 같은 매출을 낼 수 있을까요? 그 답이 ‘아니오’라면, 시스템이 사람에 의존하고 있다는 뜻이에요. 그게 우리가 풀려는 문제입니다.”",
      },
    ],
    closing:
      "“오늘 결정 안 하셔도 됩니다. 단지 ‘다음 단계는 무엇인지’만 같이 정해주세요. 그게 ‘다시는 만나지 말자’ 여도 저는 받아들일 준비가 돼 있습니다.”",
    followUp:
      "‘본인이 의심한 3가지 + 검증 데이터’ 1페이지를 24시간 안에 보내기. 영업 멘트 절대 금지, 수치만.",
  },
];

// ─────────────────────────────────────────────────────────────────
// Mental Models — elite frameworks beyond methodology
// ─────────────────────────────────────────────────────────────────

interface MentalModel {
  id: string;
  name: string;
  origin: string;
  essence: string;
  whenToUse: string;
  howToApply: string[];
  example: string;
  antiPattern: string;
  category: "Discovery" | "Decision" | "Negotiation" | "Forecast" | "Coaching";
  color: string;
}

const MENTAL_MODELS: MentalModel[] = [
  {
    id: "mom-test",
    name: "The Mom Test",
    origin: "Rob Fitzpatrick",
    category: "Discovery",
    color: "#0ea5e9",
    essence: "고객이 당신에게 거짓말하지 않게 만드는 질문법.",
    whenToUse: "디스커버리 단계 — 고객이 ‘좋다’고 말하지만 안 사는 이유를 모를 때",
    howToApply: [
      "미래 가설 대신 ‘과거의 행동’을 묻는다 (“다음에 X 할 거예요?” X → “지난번에 X 어떻게 하셨어요?” O)",
      "본인 아이디어를 절대 말하지 않는다 — 고객이 칭찬하면 의심하라",
      "구체적 사례·금액·시간을 끌어낸다 — 추상적 답변은 모두 무효",
    ],
    example:
      "❌ “저희 도구가 도움이 될까요?” → ✅ “지난주 가장 짜증났던 작업이 뭐예요? 그거 끝내는 데 정확히 몇 시간 걸렸어요?”",
    antiPattern: "“좋아 보여요”라는 답에 안심하기. 그건 사회적 예의일 뿐 구매 신호가 아니다.",
  },
  {
    id: "jobs-to-be-done",
    name: "Jobs To Be Done (JTBD)",
    origin: "Clayton Christensen",
    category: "Discovery",
    color: "#22c55e",
    essence: "고객은 제품을 사는 게 아니라 ‘작업을 해결하기 위해 고용’한다.",
    whenToUse: "포지셔닝이 흐릿할 때, 경쟁 정의가 불분명할 때",
    howToApply: [
      "고객이 우리 제품을 사는 순간, 어떤 ‘작업’을 끝내려는 건지 한 문장으로 적는다",
      "그 작업을 위해 ‘대신 고용’할 수 있는 다른 옵션을 모두 적는다 (경쟁 ≠ 같은 카테고리)",
      "그 작업의 ‘기능적 / 감정적 / 사회적’ 3가지 측면을 모두 다룬다",
    ],
    example:
      "맥도날드 밀크쉐이크 사례: 출근길 운전자들이 ‘심심한 통근 시간’을 채우려고 밀크쉐이크를 ‘고용’. 경쟁은 다른 음료가 아닌 ‘바나나/베이글’.",
    antiPattern: "‘고객 페르소나’만 그리고 ‘작업’을 안 그리기. 페르소나는 시작점일 뿐이다.",
  },
  {
    id: "five-whys",
    name: "5 Whys",
    origin: "Sakichi Toyoda (Toyota)",
    category: "Discovery",
    color: "#f59e0b",
    essence: "표면 증상에서 5번 ‘왜?’를 물으면 진짜 원인이 드러난다.",
    whenToUse: "딜이 stuck 일 때, 고객이 모호한 거절 사유를 댈 때",
    howToApply: [
      "표면 거절 사유를 받아 적는다 (“예산이 없어요”)",
      "‘왜?’를 5번 묻되, 매번 더 깊이 파고든다",
      "마지막에 도달한 답이 진짜 의사결정 변수다",
    ],
    example:
      "“예산 없어요” → 왜? → “이번 분기 예산 다 썼어요” → 왜? → “마케팅에 다 갔어요” → 왜? → “CEO가 마케팅이 우선이라고 했어요” → 왜? → “리드 부족이 가장 큰 문제라서” → 왜? → “리드 → 매출 전환이 느려서” → 진짜 원인 = 우리 솔루션이 정확히 풀어주는 것!",
    antiPattern: "1-2번만 묻고 만족하기. 진짜 답은 보통 4-5번째에 나온다.",
  },
  {
    id: "loss-aversion",
    name: "Loss Aversion (손실 회피)",
    origin: "Daniel Kahneman & Amos Tversky",
    category: "Negotiation",
    color: "#dc2626",
    essence: "사람들은 같은 크기의 이득보다 손실을 2.5배 더 강하게 느낀다.",
    whenToUse: "결정 보류, 미루기, 결정자 동기부여 부족 시",
    howToApply: [
      "‘얻는 것’ 대신 ‘잃고 있는 것’으로 프레임을 뒤집는다",
      "구체적 숫자로 손실을 측정한다 (“매주 ¥X 누수 중”)",
      "유예 비용 = 결정 미루는 시간 × 손실 속도 — 비교표 만들기",
    ],
    example:
      "❌ “이거 도입하면 매출 20% 늘어요” → ✅ “지금 미루시면 6개월 동안 ¥1.2억을 그냥 흘려보내시는 거예요. 그건 어떤 마케팅 비용보다 비싼 손실입니다.”",
    antiPattern: "‘긍정적 미래’만 그리기. 미래는 추상적이고, 현재 손실은 구체적이다.",
  },
  {
    id: "anchoring",
    name: "Anchoring (앵커링)",
    origin: "Kahneman & Tversky",
    category: "Negotiation",
    color: "#a855f7",
    essence: "처음 본 숫자가 이후 모든 판단의 기준점이 된다.",
    whenToUse: "가격 협상의 첫 제안, 패키지 옵션 제시 시",
    howToApply: [
      "본인이 먼저 숫자를 던진다 — 상대가 먼저 던지면 그 앵커에 끌려간다",
      "‘이상적 가격’보다 살짝 높게 시작하되, 정당한 근거를 함께 제시",
      "3개 옵션 제공 시 ‘중간값’이 가장 매력적으로 보이게 디자인 (Decoy 효과)",
    ],
    example:
      "Pricing 페이지: $299 / $599 / $1,499 → 중간 옵션 선택률 60%. 만약 $99 / $199만 있으면 $99 70% 선택.",
    antiPattern: "고객이 ‘얼마예요?’ 물으면 정직하게 최저가만 답하기. 그게 곧 새 천장이 된다.",
  },
  {
    id: "champion-power-map",
    name: "Champion Power Mapping",
    origin: "MEDDIC + Bob Apollo",
    category: "Decision",
    color: "#6366f1",
    essence: "큰 딜은 ‘영향력 다이어그램’ 위에서 움직인다 — 직급 ≠ 결정권.",
    whenToUse: "엔터프라이즈 딜, 5명 이상의 의사결정 관여자가 있을 때",
    howToApply: [
      "조직도를 그리되 ‘직급’ 대신 ‘본 거래에 대한 영향력 / 태도’를 축으로 매핑",
      "각 인물에 대해: Champion(우리 편) / Detractor(반대) / Influencer(중립) / Sponsor(자원 제공)",
      "Champion이 없거나 Sponsor가 없으면 ‘딜 forecast 금지’ — 발견될 때까지 next stage 금지",
    ],
    example:
      "결정자(CFO) → 반대 / 그러나 CFO 신뢰하는 CTO → 우리 편 → CTO를 통해 CFO 설득 시도. CTO ≠ 결정권자지만 CFO의 ‘유일한 신뢰자’가 진짜 leverage.",
    antiPattern: "조직도 직급순으로만 보고, ‘이사한테 가면 된다’ 가정하기. 진짜 결정은 사람 관계에서.",
  },
  {
    id: "mutual-action-plan",
    name: "Mutual Action Plan (MAP)",
    origin: "Tom Williams (Modern Sales Pros)",
    category: "Decision",
    color: "#0891b2",
    essence: "고객과 함께 만든 ‘공동 실행 계획’ — 영업 예측이 아니라 합의된 일정.",
    whenToUse: "Proposal 단계 진입 후, 클로징까지의 경로를 구체화할 때",
    howToApply: [
      "고객 측 결정자/IT/법무/구매 + 우리 측 영업/SE/리더십 — 양쪽 모든 stakeholder를 표에",
      "각 단계마다: 누가 / 언제까지 / 무엇을 / 결정을 위한 input은 무엇 — 명시",
      "고객에게 ‘동의 사인’을 받아 — 양측이 약속한 일정이 됨",
    ],
    example:
      "MAP 한 줄: ‘5/15 화 — 김 부장님 → 법무팀에 NDA 검토 요청 (우리: 표준 NDA 사전 제공)’",
    antiPattern: "본인 머릿속에만 일정 그리기. ‘고객이 잊어버렸어요’는 영업의 책임이다.",
  },
  {
    id: "pre-mortem",
    name: "Pre-mortem",
    origin: "Gary Klein",
    category: "Forecast",
    color: "#f97316",
    essence: "딜이 실패했다고 가정하고, ‘왜 실패했을까’를 거꾸로 추론한다.",
    whenToUse: "큰 딜의 forecast 직전, 주간 forecast 콜에서",
    howToApply: [
      "‘이 딜이 6개월 후 lost가 됐다. 왜?’ 본인에게 묻는다",
      "5가지 가능한 실패 원인을 적는다 — 가장 똑똑한 ‘적’이 되어 본다",
      "각 원인을 미리 mitigate할 액션을 1개씩 추가한다",
    ],
    example:
      "“이 딜이 lost — 왜?” → 1) 챔피언 퇴사 2) CFO 거부권 3) 경쟁사 가격 인하 4) 컴플라이언스 통과 못 함 5) 분기 예산 동결 → 각각에 대비책 1개씩",
    antiPattern: "낙관 편향에 빠져 ‘잘 될 거야’만 반복. 그게 forecast inflation의 1순위 원인.",
  },
  {
    id: "two-percent-rule",
    name: "2% Rule (Forecast Hygiene)",
    origin: "Sales Operations 베스트프랙티스",
    category: "Forecast",
    color: "#ef4444",
    essence: "Forecast 정확도가 ±2%를 못 넘기면, 그건 ‘예측’이 아니라 ‘희망’이다.",
    whenToUse: "분기 forecast 콜, 주간 commit 검증 시",
    howToApply: [
      "지난 4분기의 ‘commit vs actual’ 차이를 측정한다",
      "차이가 ±2% 안이면: forecast 신뢰 가능 → 의사결정에 사용",
      "차이가 ±10% 이상이면: forecast 시스템 자체를 재설계 (commit 정의, 단계 정의 등)",
    ],
    example:
      "Q1 commit: ¥10억 → actual: ¥8.5억 → 차이 -15% → forecast 신뢰도 0. 다음 분기 전체 단계 재정의 필요.",
    antiPattern: "매번 차이가 나도 ‘이번 분기는 특수’라고 변명. 특수가 4번 반복되면 그건 시스템 문제.",
  },
  {
    id: "reverse-close",
    name: "Reverse Close (역(逆)클로징)",
    origin: "Sandler Sales System",
    category: "Negotiation",
    color: "#8b5cf6",
    essence: "‘저희가 안 맞을 수도 있어요’라고 먼저 말한다 — 진정성이 곧 신뢰다.",
    whenToUse: "강한 push 영업이 통하지 않는 상대, 의심이 많은 결정자",
    howToApply: [
      "초반에 ‘우리가 본인 회사에 안 맞을 수 있는 이유 3가지’를 자발적으로 공개",
      "그 이유들이 본인 상황에 해당하는지 직접 확인하게 한다",
      "그 후에야 ‘맞는 부분’을 설명한다",
    ],
    example:
      "“솔직히 말씀드리면, 저희가 본인 같은 50명 미만 팀에서는 가끔 over-engineering 인 경우가 있어요. 본인 팀이 평균 매니저당 20개 이상 딜을 다루지 않으면 ROI가 안 나올 수도 있어요. 그 부분 먼저 확인할까요?”",
    antiPattern: "처음부터 ‘저희는 모든 상황에 맞아요’라고 말하기 — 신뢰도 즉시 사망.",
  },
  {
    id: "circle-of-competence",
    name: "Circle of Competence",
    origin: "Warren Buffett",
    category: "Coaching",
    color: "#10b981",
    essence: "잘 모르는 고객은 ‘크기’보다 ‘이해도’로 우선순위를 정한다.",
    whenToUse: "분기 시작 시 territory planning, 큰 리스트 정리 시",
    howToApply: [
      "본인이 진짜 ‘이해하는’ 산업/규모/페인 = 1순위",
      "이해 못 하는 영역은 명시적으로 ‘아니오’ 한다 — 얕은 지식으로 시간 낭비 방지",
      "Circle을 의도적으로 1년에 1개씩만 확장",
    ],
    example:
      "K-12 교육 분야는 5년 경험 → 1순위. 헬스케어는 0년 경험 → ‘들어가지 않는다’ 의도적 결정. 그래야 K-12에서 전문가로 인식됨.",
    antiPattern: "모든 산업 다 들이대기. 잘 모르는 산업의 큰 딜이 작은 잘 아는 딜보다 항상 더 시간 낭비.",
  },
  {
    id: "skin-in-the-game",
    name: "Skin in the Game",
    origin: "Nassim Taleb",
    category: "Coaching",
    color: "#f43f5e",
    essence: "본인이 ‘잃을 것’이 없는 사람의 조언은 듣지 마라. 영업도 마찬가지.",
    whenToUse: "팀 코칭, 자체 영업 실력 검증 시",
    howToApply: [
      "본인이 추천하는 모든 deal strategy를 ‘본인 분기 commission에 직접 영향’ 받는 사람이 검증",
      "‘이론적으로 옳은’ 조언과 ‘실제로 commission 받는 사람이 하는’ 조언은 다르다",
      "코칭 받을 사람을 ‘작년에 본인 quota 달성한 사람’으로 한정",
    ],
    example:
      "❌ 영업 책 100권 vs ✅ 작년 quota 130% 달성한 동료 1시간 코칭. 후자가 10배 효과.",
    antiPattern: "‘유명한 영업 코치’의 일반론. 본인 산업/회사/제품에 직접 ‘skin’이 있는 사람이 아니면 의심하라.",
  },
];

function MentalModelsSection({ language }: { language: string }) {
  const [activeId, setActiveId] = useState<string>(MENTAL_MODELS[0].id);
  const model = MENTAL_MODELS.find((m) => m.id === activeId) ?? MENTAL_MODELS[0];

  return (
    <div className={styles.mmRoot}>
      <div className={styles.mmHeader}>
        <div className={styles.sectionLabel}>
          <Brain size={12} /> Mental Models
        </div>
        <h2 className={styles.mmTitle}>
          {language === "ko" ? "상위 1% 세일즈가 머릿속에 항상 갖고 다니는 12개 모델" : "12 mental models top 1% sales keep in their head"}
        </h2>
        <p className={styles.mmSubtitle}>
          {language === "ko"
            ? "방법론(Challenger, MEDDIC...)이 ‘무엇을 할지’ 알려준다면, 멘탈 모델은 ‘어떻게 생각할지’를 알려준다. 의사결정 직전에 1번씩 떠올리는 것만으로도 결과가 바뀐다."
            : "If methodologies tell you what to do, mental models tell you how to think. Recall one before each big decision and outcomes change."}
        </p>
      </div>

      <div className={styles.mmLayout}>
        <div className={styles.mmList}>
          {MENTAL_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.mmListCard} ${activeId === m.id ? styles.mmListCardActive : ""}`}
              style={activeId === m.id ? { borderLeftColor: m.color, background: `${m.color}11` } : undefined}
              onClick={() => setActiveId(m.id)}
            >
              <div className={styles.mmListCategory} style={{ color: m.color }}>{m.category}</div>
              <div className={styles.mmListName}>{m.name}</div>
              <div className={styles.mmListOrigin}>— {m.origin}</div>
            </button>
          ))}
        </div>

        <div className={styles.mmDetail} style={{ borderTopColor: model.color }}>
          <div className={styles.mmDetailKicker} style={{ color: model.color }}>{model.category} · {model.origin}</div>
          <h3 className={styles.mmDetailName}>{model.name}</h3>
          <p className={styles.mmEssence}>{model.essence}</p>

          <div className={styles.mmBlock}>
            <div className={styles.mmBlockLabel} style={{ color: model.color }}>🎯 언제 쓰는가</div>
            <p className={styles.mmBlockText}>{model.whenToUse}</p>
          </div>

          <div className={styles.mmBlock}>
            <div className={styles.mmBlockLabel} style={{ color: model.color }}>🛠 적용 방법</div>
            <ol className={styles.mmHowList}>
              {model.howToApply.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className={styles.mmExample}>
            <div className={styles.mmBlockLabel}>💡 실전 예시</div>
            <p className={styles.mmBlockText}>{model.example}</p>
          </div>

          <div className={styles.mmAntiPattern}>
            <div className={styles.mmBlockLabel} style={{ color: "#ef4444" }}>⚠ 자주 빠지는 함정</div>
            <p className={styles.mmBlockText}>{model.antiPattern}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Operating Rituals — daily/weekly/monthly/quarterly cadences
// ─────────────────────────────────────────────────────────────────

interface Ritual {
  id: string;
  cadence: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  name: string;
  duration: string;
  who: string;
  purpose: string;
  agenda: string[];
  output: string;
  antiPattern: string;
  color: string;
}

const RITUALS: Ritual[] = [
  {
    id: "daily-standup",
    cadence: "Daily",
    name: "BD Pulse — 일일 스탠드업",
    duration: "9분 (앉으면 망함)",
    who: "BD 매니저 전원 + 리더",
    purpose: "어제 commit한 게 됐는지, 오늘 commit할 게 무엇인지, 막힌 게 무엇인지 — 3가지만.",
    color: "#0ea5e9",
    agenda: [
      "각자 90초 — ‘어제 한 것 / 오늘 할 것 / 막힌 것’ 만 (스토리 금지)",
      "‘막힌 것’이 나오면 즉시 ‘누가 도와줄지’만 정하고 디테일은 콜 종료 후",
      "리더는 ‘오늘 하루의 가장 중요한 1건’을 마지막에 호명",
    ],
    output: "각자 ‘오늘의 1건’이 명확함 (Slack 채널에 픽스)",
    antiPattern:
      "30분 끌고, 결국 뉴스 공유로 끝남. ‘BD Pulse’의 핵심은 ‘짧게 자주’ — 주 5회 9분 > 주 1회 60분.",
  },
  {
    id: "weekly-forecast",
    cadence: "Weekly",
    name: "Forecast 콜 — 매주 월요일 첫 30분",
    duration: "30분 정시 종료",
    who: "BD 매니저 + 리더 1:1 또는 팀 단위",
    purpose: "지난주 commit → actual 차이 검증, 이번 주 commit 정확성 검증.",
    color: "#22c55e",
    agenda: [
      "매니저별 5분: ‘commit / best-case / pipeline’ 3개 숫자만 보고 (스토리 0%)",
      "지난주 차이 5%↑ 시: ‘무엇이 달랐는가, 다음에 어떻게 다르게 할 것인가’ 1문장 답",
      "이번 주 commit에 ‘pre-mortem’ 1개 적용 — 가장 위험한 딜 1건만",
    ],
    output: "팀 forecast 한 줄, 매니저별 commit 한 줄 — 회의 직후 보드에 픽스",
    antiPattern:
      "스토리텔링 콜로 변질. ‘이 딜은 ___ 때문에 미뤄졌어요’ → ‘그래서 commit이 얼마였나? 얼마가 됐나? 차이는?’ 만.",
  },
  {
    id: "weekly-review",
    cadence: "Weekly",
    name: "Big Bet 리뷰 — 매주 금요일 마지막 45분",
    duration: "45분",
    who: "BD 매니저 전원",
    purpose: "주간 가장 중요한 3-5개 큰 딜에 대한 ‘다음 주 액션 1개’를 합의.",
    color: "#a855f7",
    agenda: [
      "Strategy Room에서 Whale + Cooking 카드만 화면 공유",
      "각 카드에 대해 ‘다음 7일 안에 할 1개 action’만 합의 (3개 X, 1개 O)",
      "Stale 카드 1개 골라서 ‘죽이거나 살리거나’ 결정 — 반드시 결정",
    ],
    output: "각 Big Bet에 ‘다음 주 1 action’ 메모 (Strategy Room 카드의 노트 영역)",
    antiPattern:
      "10개 모두 다루려다 5분씩만 → 결국 아무도 행동 안 함. ‘적게 자주’가 ‘많게 가끔’보다 강하다.",
  },
  {
    id: "monthly-retro",
    cadence: "Monthly",
    name: "Loss Retro — 매월 마지막 금요일",
    duration: "60분",
    who: "BD 매니저 + 리더 + (가능하면) 마케팅",
    purpose: "지난달 lost된 딜 5건을 깊이 있게 분석. ‘무엇이 진짜 이유였는가’를 찾는다.",
    color: "#ef4444",
    agenda: [
      "Lost 딜 5개 골라서 각자 ‘5 Whys’ 적용 — 표면 이유 → 진짜 이유",
      "패턴 찾기: 같은 이유가 2번 이상 나오면 → 시스템 문제",
      "다음 달까지의 ‘구조적 fix 1개’ 합의 (개인 액션 X, 시스템 변화 O)",
    ],
    output: "다음 달 ‘우리가 바꿀 1가지 시스템 변화’ 1줄 (Slack pin)",
    antiPattern:
      "‘고객이 예산이 없었어요’로 끝내기. 그건 진짜 이유가 아니다 — 5번 더 파라.",
  },
  {
    id: "monthly-coaching",
    cadence: "Monthly",
    name: "1:1 코칭 세션",
    duration: "60분 (절대 단축 금지)",
    who: "리더 + 매니저 1:1",
    purpose: "숫자 리뷰 X. 매니저의 성장 방향, 막힌 곳, 지원 필요한 곳을 다룬다.",
    color: "#6366f1",
    agenda: [
      "10분: ‘이번 달 가장 자랑스러운 1건 / 가장 후회되는 1건’",
      "20분: 매니저가 본 ‘본인 약점 1개’와 그것을 깰 ‘1개 실험’",
      "20분: 리더가 본 ‘매니저의 강점 1개’와 그것을 더 살리는 방법",
      "10분: 다음 달 ‘1가지 구체적 도전’ 합의 + 리더 지원 약속",
    ],
    output: "매니저의 ‘다음 달 도전 1개’ + 리더가 약속한 ‘지원 1개’",
    antiPattern:
      "숫자 리뷰로 변질. 그건 forecast 콜에서 끝내고, 1:1은 ‘사람 자체’를 다뤄야 한다.",
  },
  {
    id: "monthly-deal-doctor",
    cadence: "Monthly",
    name: "Deal Doctor 진단 세션",
    duration: "45분",
    who: "BD 매니저 전원",
    purpose: "정체된 딜 / 큰 딜 1건씩을 ‘진단표’에 넣어 객관적 점수를 매긴다.",
    color: "#f59e0b",
    agenda: [
      "각자 ‘가장 답답한 딜’ 1개를 Strategy Room의 Deal Doctor에 입력",
      "12-question diagnostic 점수 확인 — 60점 미만이면 ‘kill or save’ 결정",
      "팀이 ‘이 딜에 1가지 조언’ 만 — Champion 매핑부터 시작",
    ],
    output: "각 매니저의 가장 어려운 딜에 대한 ‘다음 1수’ 합의",
    antiPattern:
      "혼자 끙끙 앓기. 막힌 딜은 외부 시각 1개로 풀린다.",
  },
  {
    id: "quarterly-qbr",
    cadence: "Quarterly",
    name: "Strategic QBR (Quarterly Business Review)",
    duration: "120분",
    who: "BD 팀 + 임원진",
    purpose: "분기 성과 review가 아니라, ‘다음 분기 전략의 1가지 큰 베팅’을 결정.",
    color: "#8b5cf6",
    agenda: [
      "30분: 지난 분기 ‘무엇이 작동했는가 / 무엇이 안 됐는가 / 무엇을 멈출 것인가’ — Stop/Start/Continue",
      "30분: 다음 분기 ‘1가지 큰 베팅’ 후보 3개 — 각각 ‘왜 이게 가장 중요한가’ 1분씩",
      "30분: 1개 베팅 선택 + 그 베팅을 ‘성공으로 만드는 5가지 조건’",
      "30분: 그 조건들에 대한 ‘담당자 / 마일스톤 / 측정지표’ 합의",
    ],
    output: "‘이 분기의 1가지 큰 베팅’ 1줄 + 5가지 성공 조건 + 마일스톤",
    antiPattern:
      "지난 분기 PPT 30장 review 로 끝나기. 과거는 30분 안에 끝내고, 90%는 ‘다음에 무엇을 할 것인가’에 써야 한다.",
  },
  {
    id: "quarterly-territory",
    cadence: "Quarterly",
    name: "Territory Re-planning",
    duration: "90분 + 비동기 사전 준비",
    who: "BD 매니저 + 리더",
    purpose: "각 매니저의 territory를 ‘Circle of Competence’ 기준으로 재정렬.",
    color: "#10b981",
    agenda: [
      "사전 비동기: 각 매니저가 ‘본인이 가장 잘 아는 segment 5개’ + ‘잘 모르는 segment 5개’ 적기",
      "30분: 각 매니저의 territory에서 ‘잘 모르는 segment’를 빼고 ‘잘 아는 segment’에 집중",
      "30분: 빠진 segment는 다른 매니저에게 양도 — 강점 매칭",
      "30분: 새 territory에서 ‘이번 분기 quota’ 재합의",
    ],
    output: "각 매니저별 새 territory + 새 quota + 새 ‘1가지 학습 영역’",
    antiPattern:
      "정치적 이유로 territory 안 바꾸기. 강점 매칭이 안 된 territory가 1년 이상 가면 매니저 이탈로 이어진다.",
  },
];

function RitualsSection({ language }: { language: string }) {
  const [activeId, setActiveId] = useState<string>(RITUALS[0].id);
  const ritual = RITUALS.find((r) => r.id === activeId) ?? RITUALS[0];

  return (
    <div className={styles.ritualsRoot}>
      <div className={styles.ritualsHeader}>
        <div className={styles.sectionLabel}>
          <Award size={12} /> Operating Rituals
        </div>
        <h2 className={styles.ritualsTitle}>
          {language === "ko" ? "상위 1% 팀이 매주 같은 시간에 같은 의식을 한다" : "Top 1% teams run the same rituals at the same time, every week"}
        </h2>
        <p className={styles.ritualsSubtitle}>
          {language === "ko"
            ? "전략은 가끔 바뀌지만, 리듬은 절대 멈추지 않는다. 8개의 검증된 운영 의식 — Daily / Weekly / Monthly / Quarterly."
            : "Strategy changes sometimes, but rhythm never stops. 8 proven operating rituals — Daily / Weekly / Monthly / Quarterly."}
        </p>
      </div>

      <div className={styles.ritualsLayout}>
        <div className={styles.ritualsList}>
          {(["Daily", "Weekly", "Monthly", "Quarterly"] as const).map((cadence) => {
            const items = RITUALS.filter((r) => r.cadence === cadence);
            return (
              <div key={cadence} className={styles.ritualsCadenceGroup}>
                <div className={styles.ritualsCadenceLabel}>{cadence}</div>
                {items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.ritualsCard} ${activeId === r.id ? styles.ritualsCardActive : ""}`}
                    style={activeId === r.id ? { borderLeftColor: r.color, background: `${r.color}11` } : undefined}
                    onClick={() => setActiveId(r.id)}
                  >
                    <div className={styles.ritualsCardName}>{r.name}</div>
                    <div className={styles.ritualsCardMeta}>{r.duration} · {r.who}</div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div className={styles.ritualsDetail} style={{ borderTopColor: ritual.color }}>
          <div className={styles.ritualsDetailKicker} style={{ color: ritual.color }}>
            {ritual.cadence} · {ritual.duration}
          </div>
          <h3 className={styles.ritualsDetailName}>{ritual.name}</h3>
          <div className={styles.ritualsWho}>👥 {ritual.who}</div>

          <div className={styles.ritualsPurpose}>
            <div className={styles.ritualsBlockLabel}>🎯 목적</div>
            <p>{ritual.purpose}</p>
          </div>

          <div className={styles.ritualsAgenda}>
            <div className={styles.ritualsBlockLabel}>📋 어젠다</div>
            <ol>
              {ritual.agenda.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>

          <div className={styles.ritualsOutput} style={{ borderLeftColor: ritual.color }}>
            <div className={styles.ritualsBlockLabel}>📝 산출물</div>
            <p>{ritual.output}</p>
          </div>

          <div className={styles.ritualsAntiPattern}>
            <div className={styles.ritualsBlockLabel} style={{ color: "#ef4444" }}>⚠ 함정</div>
            <p>{ritual.antiPattern}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TalkTracksSection({ language, initialTrackId }: { language: string; initialTrackId?: string | null }) {
  const startId = initialTrackId && TALK_TRACKS.some((t) => t.id === initialTrackId)
    ? initialTrackId
    : TALK_TRACKS[0].id;
  const [activeId, setActiveId] = useState<string>(startId);
  const track = TALK_TRACKS.find((t) => t.id === activeId) ?? TALK_TRACKS[0];

  return (
    <div className={styles.talksRoot}>
      <div className={styles.talksHeader}>
        <div className={styles.sectionLabel}>
          <MessageCircle size={12} /> Talk Tracks
        </div>
        <h2 className={styles.talksTitle}>
          {language === "ko" ? "페르소나별 실전 토크 트랙" : "Persona-based talk tracks"}
        </h2>
        <p className={styles.talksSubtitle}>
          {language === "ko"
            ? "각 페르소나에 맞춘 오프닝, 디스커버리 질문, 반론 응대, 클로징, 팔로우업 — 외워서 쓰는 게 아니라 상황마다 변형해서 쓰는 골격."
            : "Opening, discovery questions, objection handlers, closing, and follow-up scripts — meant to be remixed, not memorized."}
        </p>
      </div>

      <div className={styles.talksLayout}>
        {/* Persona selector */}
        <div className={styles.talksPersonaList}>
          {TALK_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.talksPersonaCard} ${activeId === t.id ? styles.talksPersonaCardActive : ""}`}
              style={activeId === t.id ? { borderColor: t.color, background: `${t.color}11` } : undefined}
              onClick={() => setActiveId(t.id)}
            >
              <div className={styles.talksPersonaTag} style={{ color: t.color }}>{t.personaTag}</div>
              <div className={styles.talksPersonaName}>{t.persona}</div>
              <div className={styles.talksPersonaScenario}>{t.scenario}</div>
            </button>
          ))}
        </div>

        {/* Active track detail */}
        <div className={styles.talksDetail} style={{ borderTopColor: track.color }}>
          <div className={styles.talksBlock}>
            <div className={styles.talksBlockLabel} style={{ color: track.color }}>
              🎬 {language === "ko" ? "오프닝" : "Opening"}
            </div>
            <p className={styles.talksScript}>{track.opening}</p>
          </div>

          <div className={styles.talksBlock}>
            <div className={styles.talksBlockLabel} style={{ color: track.color }}>
              🔍 {language === "ko" ? "디스커버리 질문" : "Discovery questions"}
            </div>
            <ul className={styles.talksQuestionList}>
              {track.discoveryQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div className={styles.talksBlock}>
            <div className={styles.talksBlockLabel} style={{ color: track.color }}>
              💬 {language === "ko" ? "반론 응대" : "Objection handlers"}
            </div>
            {track.objections.map((obj, i) => (
              <div key={i} className={styles.talksObjItem}>
                <div className={styles.talksObjQ}>{obj.q}</div>
                <div className={styles.talksObjA}>→ {obj.a}</div>
              </div>
            ))}
          </div>

          <div className={styles.talksBlock}>
            <div className={styles.talksBlockLabel} style={{ color: track.color }}>
              ✅ {language === "ko" ? "클로징" : "Closing"}
            </div>
            <p className={styles.talksScript}>{track.closing}</p>
          </div>

          <div className={styles.talksFollowUp} style={{ borderLeftColor: track.color }}>
            <div className={styles.talksBlockLabel}>
              📨 {language === "ko" ? "팔로우업" : "Follow-up"}
            </div>
            <p className={styles.talksFollowUpText}>{track.followUp}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BattleCardsSection({ language }: { language: string }) {
  const [activeId, setActiveId] = useState<string>(BATTLE_CARDS[0].id);
  const card = BATTLE_CARDS.find((c) => c.id === activeId) ?? BATTLE_CARDS[0];

  return (
    <div className={styles.battleSection}>
      <div className={styles.battleHeader}>
        <div>
          <div className={styles.sectionLabel}>
            <ShieldAlert size={12} /> {language === "ko" ? "Battle Cards" : "Battle Cards"}
          </div>
          <h2 className={styles.battleTitle}>
            {language === "ko" ? "경쟁 상황별 플레이북" : "Competitive playbooks"}
          </h2>
          <p className={styles.battleSubtitle}>
            {language === "ko"
              ? "각 시나리오에서 우리가 어떻게 포지셔닝하고, 어떤 반론에 어떻게 대응하는지 — 실전 토크 트랙 포함."
              : "How we position in each scenario, how we handle objections, and the talk track to use live."}
          </p>
        </div>
      </div>

      <div className={styles.battleTabs}>
        {BATTLE_CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.battleTab} ${activeId === c.id ? styles.battleTabActive : ""}`}
            style={activeId === c.id ? { borderColor: c.color, color: c.color } : undefined}
            onClick={() => setActiveId(c.id)}
          >
            <span className={styles.battleTabCategory} style={{ color: c.color }}>
              {c.category}
            </span>
            <span className={styles.battleTabName}>{c.competitor}</span>
          </button>
        ))}
      </div>

      <div className={styles.battleCard} style={{ borderTopColor: card.color }}>
        <div className={styles.battleCardHead}>
          <div>
            <div className={styles.battleCardCategory} style={{ color: card.color }}>
              {card.category}
            </div>
            <h3 className={styles.battleCardName}>{card.competitor}</h3>
            <p className={styles.battlePositioning}>
              <strong>{language === "ko" ? "그들의 포지셔닝: " : "Their pitch: "}</strong>
              {card.positioning}
            </p>
          </div>
        </div>

        <div className={styles.battleEdgeGrid}>
          <div className={styles.battleEdgeCol}>
            <div className={styles.battleEdgeLabel} style={{ color: "#22c55e" }}>
              ✓ {language === "ko" ? "우리 강점" : "Our edge"}
            </div>
            <ul className={styles.battleEdgeList}>
              {card.ourEdge.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.battleEdgeCol}>
            <div className={styles.battleEdgeLabel} style={{ color: "#f59e0b" }}>
              ⚠ {language === "ko" ? "그들의 강점" : "Their edge"}
            </div>
            <ul className={styles.battleEdgeList}>
              {card.theirEdge.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.battleObjections}>
          <div className={styles.battleObjectionsLabel}>
            💬 {language === "ko" ? "대표 반론과 응대" : "Common objections"}
          </div>
          {card.objections.map((obj, i) => (
            <div key={i} className={styles.battleObjItem}>
              <div className={styles.battleObjQ}>{obj.q}</div>
              <div className={styles.battleObjA}>→ {obj.a}</div>
            </div>
          ))}
        </div>

        <div className={styles.battleTalkTrack} style={{ borderLeftColor: card.color }}>
          <div className={styles.battleTalkLabel}>
            🎯 {language === "ko" ? "오프닝 토크 트랙" : "Opening talk track"}
          </div>
          <p className={styles.battleTalkText}>{card.talkTrack}</p>
        </div>
      </div>
    </div>
  );
}

function GuruTipBanner({ tip }: { tip: GuruTip }) {
  return (
    <div className={styles.guruTipBanner}>
      <span className={styles.guruTipDot} style={{ background: tip.color }} />
      <span className={styles.guruTipText}>{tip.text}</span>
      <span className={styles.guruTipSource} style={{ color: tip.color }}>
        — {tip.guru}
      </span>
    </div>
  );
}

export default function ResearchPage() {
  const { language } = require("@/components/SettingsProvider").useSettings();
  const [activeTab, setActiveTab] = useState<ResearchTab>("library");
  const [initialTalkTrackId, setInitialTalkTrackId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Read URL params (?tab=talks&track=...) on mount for deep links
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const track = params.get("track");
    if (tab && (["library", "patterns", "intel", "resources", "talks"] as ResearchTab[]).includes(tab as ResearchTab)) {
      setActiveTab(tab as ResearchTab);
    }
    if (track) {
      setInitialTalkTrackId(track);
    }
  }, []);
  const [selectedMethod, setSelectedMethod] = useState<MethodologyId | "All">("All");
  const [selectedLegendId, setSelectedLegendId] = useState<MethodologyId | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<ResourceCategory | "All">("All");
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSnapshot>(EMPTY_DASHBOARD);
  const [hasLoaded, setHasLoaded] = useState(false);
  const focusMethod = selectedMethod === "All" ? "Challenger" : selectedMethod;
  const dailyTip = getContextualTip("research");

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard/regions", { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Research dashboard request failed with ${response.status}`);
        }

        const payload = normalizeDashboardPayload((await response.json()) as Partial<DashboardPayload>);

        if (alive) {
          setDashboard(payload);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load research dashboard:", error);
        if (alive) {
          setDashboard(EMPTY_DASHBOARD);
        }
      } finally {
        if (alive) {
          setHasLoaded(true);
        }
      }
    };

    void loadDashboard();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const filteredLegends = useMemo(() => {
    return SALES_LEGENDS.filter((legend) => {
      if (!query) {
        return true;
      }

      return (
        matchesQuery(legend.id, query) ||
        matchesQuery(legend.name, query) ||
        matchesQuery(legend.title, query) ||
        matchesQuery(legend.bio, query)
      );
    });
  }, [query]);

  const livePatterns = useMemo(() => buildPatternWorkbenchCards(dashboard), [dashboard]);

  const filteredPatterns = useMemo(() => {
    return livePatterns.filter((pattern) => {
      const searchHit =
        !query ||
        matchesQuery(pattern.tag, query) ||
        matchesQuery(pattern.title, query) ||
        matchesQuery(pattern.summary, query) ||
        matchesQuery(pattern.methodology, query) ||
        matchesQuery(pattern.region, query);

      const methodologyHit = selectedMethod === "All" ? true : pattern.methodology === selectedMethod;

      return searchHit && methodologyHit;
    });
  }, [livePatterns, query, selectedMethod]);

  const liveIntel = useMemo(() => buildIntelWorkbenchCards(dashboard), [dashboard]);

  const filteredIntel = useMemo(() => {
    return liveIntel.filter((card) => {
      if (!query) {
        return true;
      }

      return (
        matchesQuery(card.region, query) ||
        matchesQuery(card.title, query) ||
        matchesQuery(card.summary, query) ||
        matchesQuery(card.countermove, query) ||
        matchesQuery(card.date, query)
      );
    });
  }, [liveIntel, query]);

  useEffect(() => {
    if (filteredLegends.length === 0) {
      setSelectedLegendId(null);
      return;
    }

    if (!selectedLegendId || !filteredLegends.some((l) => l.id === selectedLegendId)) {
      setSelectedLegendId(filteredLegends[0].id);
    }
  }, [filteredLegends, selectedLegendId]);

  useEffect(() => {
    if (filteredPatterns.length === 0) {
      setSelectedPatternId(null);
      return;
    }

    if (!selectedPatternId || !filteredPatterns.some((pattern) => pattern.id === selectedPatternId)) {
      setSelectedPatternId(filteredPatterns[0].id);
    }
  }, [filteredPatterns, selectedPatternId]);

  useEffect(() => {
    if (filteredIntel.length === 0) {
      setSelectedIntelId(null);
      return;
    }

    if (!selectedIntelId || !filteredIntel.some((card) => card.id === selectedIntelId)) {
      setSelectedIntelId(filteredIntel[0].id);
    }
  }, [filteredIntel, selectedIntelId]);

  const selectedLegend = filteredLegends.find((l) => l.id === selectedLegendId) ?? filteredLegends[0] ?? null;
  const selectedPattern = filteredPatterns.find((pattern) => pattern.id === selectedPatternId) ?? filteredPatterns[0] ?? null;
  const selectedIntel = filteredIntel.find((card) => card.id === selectedIntelId) ?? filteredIntel[0] ?? null;

  const filteredResources = useMemo(() => {
    return RESOURCES.filter((r) => {
      const categoryHit = selectedResourceCategory === "All" || r.category === selectedResourceCategory;
      const searchHit =
        !query ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.author.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      return categoryHit && searchHit;
    });
  }, [selectedResourceCategory, query]);

  const selectedResource = filteredResources.find((r) => r.id === selectedResourceId) ?? filteredResources[0] ?? null;

  const weeklyResource = useMemo(() => getWeeklyResource(), []);

  const sourceLabel = hasLoaded ? (dashboard.dataSource === "google-sheets" ? (language === "ko" ? "라이브 시트" : "Live Sheet") : (language === "ko" ? "폴백" : "Fallback")) : (language === "ko" ? "로딩 중" : "Loading");
  const activeSummary = useMemo(
    () => [
      { label: language === "ko" ? "소스" : "Source", value: sourceLabel },
      { label: language === "ko" ? "패턴" : "Patterns", value: hasLoaded ? `${filteredPatterns.length} ${language === "ko" ? "개 플레이" : "plays"}` : (language === "ko" ? "로딩 중" : "Loading") },
      { label: language === "ko" ? "인텔" : "Intel", value: hasLoaded ? `${filteredIntel.length} ${language === "ko" ? "개 신호" : "signals"}` : (language === "ko" ? "로딩 중" : "Loading") },
    ],
    [filteredIntel.length, filteredPatterns.length, hasLoaded, sourceLabel, language],
  );

  const subtitle = hasLoaded
    ? (language === "ko" ? `보드 소스: ${sourceLabel}. 업데이트: ${formatDateStamp(dashboard.lastUpdated)}. 리서치 카드는 현재 BD 대시보드 데이터에서 생성됩니다.` : `Board source: ${sourceLabel}. Updated ${formatDateStamp(dashboard.lastUpdated)}. Research cards are generated from the current BD dashboard payload.`)
    : (language === "ko" ? "패턴과 인텔을 생성하기 전에 현재 BD 대시보드 데이터를 가져오는 중입니다." : "Pulling the current BD dashboard payload before generating patterns and intel.");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{language === "ko" ? "리서치 허브" : "Research Hub"}</p>
          <h1 className={styles.title}>{language === "ko" ? "BD 지원 라이브러리, 성공 패턴 및 현장 인텔" : "BD enablement library, winning patterns, and field intel"}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.summaryRow}>
          {activeSummary.map((item) => (
            <div key={item.label} className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{item.label}</span>
              <span className={styles.summaryValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </header>

      <GuruTipBanner tip={dailyTip} />

      <section className={styles.toolbar}>
        <label className={styles.searchBox}>
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === "ko" ? "방법론, 패턴 또는 인텔 검색..." : "Search methods, patterns, or intel..."}
            aria-label={language === "ko" ? "리서치 콘텐츠 검색" : "Search research content"}
          />
        </label>

        <div className={styles.methodChips} role="tablist" aria-label="Focus methodology">
          {(["All", ...SALES_LEGENDS.map((legend) => legend.id)] as Array<"All" | MethodologyId>).map((method) => (
            <button
              key={method}
              type="button"
              className={`${styles.methodChip} ${selectedMethod === method ? styles.methodChipActive : ""}`}
              onClick={() => setSelectedMethod(method)}
            >
              {method}
            </button>
          ))}
        </div>
      </section>

      <nav className={styles.tabBar} aria-label={language === "ko" ? "리서치 탭" : "Research tabs"}>
        {TABS.map((tab) => {
          const tabLabel = language === "ko"
            ? tab.id === "library" ? "라이브러리" : tab.id === "patterns" ? "패턴" : "인텔"
            : tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tabLabel}
            </button>
          );
        })}
      </nav>

      {activeTab === "library" && (
        <div className={styles.libraryLayout}>
          <div className={styles.libraryList}>
            {filteredLegends.length === 0 ? (
              <EmptyState
                title={language === "ko" ? "일치하는 방법론 없음" : "No methods matched"}
                description={language === "ko" ? "더 짧은 검색어를 사용하거나 다른 플레이북으로 전환해 보세요." : "Try a shorter search term or switch focus to a different playbook."}
              />
            ) : (
              filteredLegends.map((legend) => {
                const isSelected = selectedLegend?.id === legend.id;
                return (
                  <button
                    key={legend.id}
                    type="button"
                    className={`${styles.librarySelectCard} ${isSelected ? styles.librarySelectCardActive : ""}`}
                    style={isSelected ? { borderColor: legend.color } : undefined}
                    onClick={() => setSelectedLegendId(legend.id)}
                  >
                    <span className={styles.libraryCardEmoji}>{legend.emoji}</span>
                    <div className={styles.libraryCardBody}>
                      <div className={styles.libraryCardTop}>
                        <span className={styles.libraryCardMethod}>{legend.methodTitle}</span>
                        <span className={styles.libraryCardId} style={{ color: legend.color }}>{legend.id}</span>
                      </div>
                      <span className={styles.libraryCardAuthor}>{legend.name} · {legend.title}</span>
                    </div>
                    <ChevronRight size={14} className={`${styles.libraryCardArrow} ${isSelected ? styles.libraryCardArrowActive : ""}`} />
                  </button>
                );
              })
            )}
          </div>

          {selectedLegend ? (() => {
            const detail = METHODOLOGY_DETAILS[selectedLegend.id];
            return (
              <div className={styles.legendStickyWrapper}>
              <article className={styles.legendArticle}>
                <div className={styles.legendHero} style={{ borderColor: selectedLegend.color, background: selectedLegend.colorBg }}>
                  <div className={styles.legendHeroTop}>
                    <span className={styles.legendHeroEmoji}>{selectedLegend.emoji}</span>
                    <div>
                      <p className={styles.legendHeroKicker} style={{ color: selectedLegend.color }}>{selectedLegend.id}</p>
                      <h2 className={styles.legendHeroTitle}>{selectedLegend.methodTitle}</h2>
                      <p className={styles.legendHeroMeta}>{selectedLegend.name} · {selectedLegend.title}</p>
                    </div>
                  </div>
                  <p className={styles.legendHeroBio}>{selectedLegend.bio}</p>
                </div>

                <blockquote className={styles.legendPullQuote} style={{ borderColor: selectedLegend.color }}>
                  {detail.tagline}
                </blockquote>

                <div className={styles.legendMetaRow}>
                  <div className={styles.legendMetaBlock}>
                    <span className={styles.sectionLabel}><Target size={12} /> Best for</span>
                    <p className={styles.legendMetaText}>{detail.bestFor}</p>
                  </div>
                  <div className={styles.legendMetaBlock}>
                    <span className={styles.sectionLabel}><Sparkles size={12} /> Use when</span>
                    <p className={styles.legendMetaText}>{detail.useWhen}</p>
                  </div>
                </div>

                <div className={styles.legendSection}>
                  <div className={styles.sectionLabel}><Brain size={12} /> Core questions</div>
                  <ol className={styles.legendOrderedList}>
                    {detail.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>

                <div className={styles.legendSection}>
                  <div className={styles.sectionLabel}><Sparkles size={12} /> Playbook</div>
                  <ol className={styles.legendOrderedList}>
                    {detail.playbook.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className={styles.legendSection}>
                  <div className={styles.sectionLabel}><Award size={12} /> Principles</div>
                  <ul className={styles.legendPrincipleList}>
                    {selectedLegend.principles.map((p) => (
                      <li key={p} className={styles.legendPrincipleItem}>
                        <span className={styles.legendPrincipleDot} style={{ background: selectedLegend.color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.legendQuoteStack}>
                  {selectedLegend.quotes.map((q) => (
                    <blockquote key={q} className={styles.legendQuoteItem}>
                      <BadgeInfo size={13} style={{ color: selectedLegend.color, flexShrink: 0 }} />
                      <span>{q}</span>
                    </blockquote>
                  ))}
                </div>

                <div className={styles.legendSignatureBox} style={{ borderColor: selectedLegend.color }}>
                  <div className={styles.sectionLabel}><Star size={12} /> Signature move</div>
                  <p className={styles.legendSignatureText}>{selectedLegend.signatureMove}</p>
                </div>
              </article>
              </div>
            );
          })() : null}

          {/* ── Mental Models + Rituals (full width below library) ── */}
          <div className={styles.libraryExtraSections}>
            <MentalModelsSection language={language} />
            <RitualsSection language={language} />
          </div>
        </div>
      )}

      {activeTab === "patterns" && (
        <section className={styles.patternWorkbench}>
          {!hasLoaded ? (
            <EmptyState
              title={language === "ko" ? "라이브 보드 로딩 중" : "Loading live board"}
              description={language === "ko" ? "패턴을 생성하기 전에 현재 BD 대시보드 데이터를 기다리는 중입니다." : "Waiting for the current BD dashboard payload before generating patterns."}
            />
          ) : filteredPatterns.length === 0 ? (
            <EmptyState
              title={language === "ko" ? "일치하는 패턴 없음" : "No patterns matched"}
              description={language === "ko" ? "라이브 보드 패턴을 찾으려면 다른 방법론이나 키워드를 시도해 보세요." : "Try a different method or keyword to surface a live board pattern."}
            />
          ) : (
            <>
              <div className={styles.patternList}>
                {dashboard.dataSource !== "google-sheets" ? (
                  <div className={styles.sourceBanner}>
                    {language === "ko" ? "데모 모드가 활성화되어 있습니다. 이 패턴 카드는 폴백 보드 데이터를 시각적 목업으로 사용하고 있습니다." : "Demo mode is active. These pattern cards are using the fallback board payload as a visual mockup."}
                  </div>
                ) : null}

                {filteredPatterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    type="button"
                    className={`${styles.patternSelectCard} ${selectedPattern?.id === pattern.id ? styles.patternSelectCardActive : ""}`}
                    onClick={() => setSelectedPatternId(pattern.id)}
                  >
                    <div className={styles.patternTop}>
                      <span className={styles.patternTag}>{pattern.tag}</span>
                      <span className={styles.patternMethod}>{pattern.methodology}</span>
                    </div>
                    <h3 className={styles.patternTitle}>{pattern.title}</h3>
                    <p className={styles.patternDesc}>{pattern.summary}</p>
                    <div className={styles.patternMiniMeta}>
                      <span>{pattern.region}</span>
                      <span>{pattern.usedBy}</span>
                      <span>{pattern.winRate}% win</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedPattern ? (
                <aside className={styles.patternDetailPanel}>
                  <div className={styles.detailHero}>
                    <div className={styles.patternTop}>
                      <span className={styles.patternTag}>{selectedPattern.tag}</span>
                      <span className={styles.patternMethod}>{selectedPattern.methodology}</span>
                    </div>
                    <h3 className={styles.detailTitle}>{selectedPattern.title}</h3>
                    <p className={styles.patternDesc}>{selectedPattern.summary}</p>
                    <p className={styles.patternSignal}>{selectedPattern.signal}</p>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <Sparkles size={12} /> {language === "ko" ? "근거" : "Evidence"}
                      </div>
                      <ul className={styles.list}>
                        {selectedPattern.evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <Target size={12} /> {language === "ko" ? "추천 플레이" : "Recommended play"}
                      </div>
                      <ul className={styles.list}>
                        {selectedPattern.recommendedPlay.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <Award size={12} /> {language === "ko" ? "복제 대상" : "Replication targets"}
                      </div>
                      <ul className={styles.list}>
                        {selectedPattern.replicationTargets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <BadgeInfo size={12} /> {language === "ko" ? "실험 트래커" : "Experiment tracker"}
                      </div>
                      <p className={styles.detailCopy}>{selectedPattern.experiment}</p>
                      <div className={styles.detailMetricRow}>
                        <span className={styles.patternMetric}>{selectedPattern.winRate}%</span>
                        <span className={styles.patternMetricLabel}>{language === "ko" ? "보드 적합도" : "board fit score"}</span>
                      </div>
                    </div>
                  </div>
                </aside>
              ) : null}
            </>
          )}
        </section>
      )}

      {activeTab === "intel" && (
        <section className={styles.intelWorkbench}>
          {/* ── Battle Cards: 경쟁 상황별 플레이북 ── */}
          <BattleCardsSection language={language} />

          {!hasLoaded ? (
            <EmptyState
              title={language === "ko" ? "라이브 보드 로딩 중" : "Loading live board"}
              description={language === "ko" ? "인텔을 생성하기 전에 현재 BD 대시보드 데이터를 기다리는 중입니다." : "Waiting for the current BD dashboard payload before generating intel."}
            />
          ) : filteredIntel.length === 0 ? (
            <EmptyState
              title={language === "ko" ? "일치하는 인텔 없음" : "No intel matched"}
              description={language === "ko" ? "현재 감시 목록을 찾으려면 다른 키워드를 시도해 보세요." : "Try another keyword to surface the current watchlist."}
            />
          ) : (
            <>
              <div className={styles.intelWatchColumn}>
                <div className={styles.intelLead}>
                  <div className={styles.sideHeader}>
                    <ShieldAlert size={15} />
                    <span>{language === "ko" ? "시장 감시 목록" : "Market watchlist"}</span>
                  </div>
                  <h2>{language === "ko" ? "다음 BD 움직임을 형성해야 할 신호들" : "Signals that should shape the next BD move"}</h2>
                  <p>
                    {language === "ko" ? "이 메모들은 현재 BD 대시보드 데이터에서 생성되므로 팀이 별도의 리서치 채널이 아닌 라이브 보드에 연결됩니다." : "These notes are generated from the current BD dashboard payload so the team stays tied to the live board, not a separate research theater."}
                  </p>
                </div>

                {dashboard.dataSource !== "google-sheets" ? (
                  <div className={styles.sourceBanner}>
                    {language === "ko" ? "데모 모드가 활성화되어 있습니다. 라이브 시트가 연결될 때까지 인텔 항목은 폴백 보드 신호를 사용합니다." : "Demo mode is active. Intel entries are using fallback board signals until the live sheet is connected."}
                  </div>
                ) : null}

                <div className={styles.intelSelectList}>
                  {filteredIntel.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`${styles.intelSelectCard} ${selectedIntel?.id === card.id ? styles.intelSelectCardActive : ""} ${styles[`intel${card.urgency}`]}`}
                      onClick={() => setSelectedIntelId(card.id)}
                    >
                      <div className={styles.intelTop}>
                        <div className={styles.intelBadgeWrap}>
                          <span className={styles.intelBadge}>{card.urgency.toUpperCase()}</span>
                          <span className={styles.intelRegion}>{card.region}</span>
                        </div>
                        <span className={styles.intelDate}>{card.date}</span>
                      </div>
                      <h3 className={styles.intelTitle}>{card.title}</h3>
                      <p className={styles.intelDesc}>{card.summary}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedIntel ? (
                <div className={styles.intelDetailPanel}>
                  <div className={`${styles.intelCard} ${styles[`intel${selectedIntel.urgency}`]}`}>
                    <div className={styles.intelTop}>
                      <div className={styles.intelBadgeWrap}>
                        <span className={styles.intelBadge}>{selectedIntel.urgency.toUpperCase()}</span>
                        <span className={styles.intelRegion}>{selectedIntel.region}</span>
                      </div>
                      <span className={styles.intelDate}>{selectedIntel.date}</span>
                    </div>
                    <h3 className={styles.detailTitle}>{selectedIntel.title}</h3>
                    <p className={styles.intelDesc}>{selectedIntel.summary}</p>
                    <div className={styles.counterBox}>
                      <span className={styles.counterLabel}>{language === "ko" ? "다음 움직임" : "Next move"}</span>
                      <span className={styles.counterText}>{selectedIntel.countermove}</span>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <BadgeInfo size={12} /> {language === "ko" ? "동인" : "Drivers"}
                      </div>
                      <ul className={styles.list}>
                        {selectedIntel.drivers.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <Target size={12} /> {language === "ko" ? "다음 움직임 체크리스트" : "Next-move checklist"}
                      </div>
                      <ul className={styles.list}>
                        {selectedIntel.checklist.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.detailBlock}>
                      <div className={styles.sectionLabel}>
                        <Brain size={12} /> {language === "ko" ? "시나리오 영향" : "Scenario impact"}
                      </div>
                      <p className={styles.detailCopy}>{selectedIntel.scenarioImpact}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {activeTab === "talks" && (
        <section className={styles.talksTab}>
          <TalkTracksSection language={language} initialTrackId={initialTalkTrackId} />
        </section>
      )}

      {activeTab === "resources" && (
        <div className={styles.resourcesLayout}>
          <div className={styles.resourcesLeft}>
            <div className={styles.resourceWeeklySpotlight}>
              <div className={styles.resourceSpotlightBadge}>
                <Star size={11} />
                <span>Weekly Spotlight</span>
              </div>
              <div className={styles.resourceSpotlightBody}>
                <span className={styles.resourceSpotlightEmoji}>{weeklyResource.emoji}</span>
                <div>
                  <p className={styles.resourceSpotlightCategory}>{RESOURCE_CATEGORY_LABEL[weeklyResource.category]}</p>
                  <p className={styles.resourceSpotlightTitle}>{weeklyResource.title}</p>
                  <p className={styles.resourceSpotlightAuthor}>{weeklyResource.author}</p>
                </div>
              </div>
            </div>

            <div className={styles.resourceCategoryChips}>
              {(["All", "book", "podcast", "blog", "newsletter"] as Array<"All" | ResourceCategory>).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.resourceCategoryChip} ${selectedResourceCategory === cat ? styles.resourceCategoryChipActive : ""}`}
                  onClick={() => setSelectedResourceCategory(cat)}
                >
                  {cat === "All" ? "All" : `${RESOURCE_CATEGORY_EMOJI[cat]} ${RESOURCE_CATEGORY_LABEL[cat]}`}
                </button>
              ))}
            </div>

            <div className={styles.resourceList}>
              {filteredResources.length === 0 ? (
                <EmptyState title="No resources matched" description="Try a different category or keyword." />
              ) : (
                filteredResources.map((r) => {
                  const isSelected = selectedResource?.id === r.id;
                  const isNew = isNewResource(r.addedAt);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`${styles.resourceSelectCard} ${isSelected ? styles.resourceSelectCardActive : ""}`}
                      style={isSelected ? { borderColor: r.color } : undefined}
                      onClick={() => setSelectedResourceId(r.id)}
                    >
                      <div className={styles.resourceCardLeft}>
                        <span className={styles.resourceCardEmoji}>{r.emoji}</span>
                      </div>
                      <div className={styles.resourceCardBody}>
                        <div className={styles.resourceCardTopRow}>
                          <span className={styles.resourceCardCategory} style={{ color: r.color }}>
                            {RESOURCE_CATEGORY_EMOJI[r.category]} {RESOURCE_CATEGORY_LABEL[r.category]}
                          </span>
                          {isNew && <span className={styles.resourceNewBadge}>NEW</span>}
                        </div>
                        <p className={styles.resourceCardTitle}>{r.title}</p>
                        <p className={styles.resourceCardAuthor}>{r.author}</p>
                        <p className={styles.resourceCardDuration}>{r.duration}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedResource ? (
            <div className={styles.resourceStickyWrapper}>
            <article className={styles.resourceArticle}>
              <div className={styles.resourceArticleHero} style={{ borderColor: selectedResource.color, background: selectedResource.colorBg }}>
                <div className={styles.resourceArticleHeroTop}>
                  <div>
                    <div className={styles.resourceArticleMetaRow}>
                      <span className={styles.resourceArticleCategoryTag} style={{ color: selectedResource.color }}>
                        {RESOURCE_CATEGORY_EMOJI[selectedResource.category]} {RESOURCE_CATEGORY_LABEL[selectedResource.category]}
                      </span>
                      {isNewResource(selectedResource.addedAt) && (
                        <span className={styles.resourceNewBadge}>NEW</span>
                      )}
                      <span className={styles.resourceArticleDuration}>{selectedResource.duration}</span>
                    </div>
                    <h2 className={styles.resourceArticleTitle}>{selectedResource.title}</h2>
                    <p className={styles.resourceArticleAuthor}>{selectedResource.author}</p>
                    <p className={styles.resourceArticleAuthorTitle}>{selectedResource.authorTitle}</p>
                  </div>
                  <span className={styles.resourceArticleHeroEmoji}>{selectedResource.emoji}</span>
                </div>
              </div>

              <blockquote className={styles.resourcePullQuote} style={{ borderColor: selectedResource.color }}>
                {selectedResource.tagline}
              </blockquote>

              <div className={styles.resourceSection}>
                <div className={styles.sectionLabel}><BookOpen size={12} /> Overview</div>
                <p className={styles.resourceSectionText}>{selectedResource.description}</p>
              </div>

              <div className={styles.resourceSection}>
                <div className={styles.sectionLabel}><Sparkles size={12} /> Key Takeaways</div>
                <ol className={styles.resourceOrderedList}>
                  {selectedResource.keyTakeaways.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>

              <div className={styles.resourceMetaGrid}>
                <div className={styles.resourceMetaBlock}>
                  <div className={styles.sectionLabel}><Target size={12} /> Best for</div>
                  <p className={styles.resourceSectionText}>{selectedResource.bestFor}</p>
                </div>
                <div className={styles.resourceMetaBlock}>
                  <div className={styles.sectionLabel}><Brain size={12} /> Why it matters</div>
                  <p className={styles.resourceSectionText}>{selectedResource.whyItMatters}</p>
                </div>
              </div>

              <div className={styles.resourceTagRow}>
                {selectedResource.tags.map((tag) => (
                  <span key={tag} className={styles.resourceTag}>{tag}</span>
                ))}
              </div>
            </article>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
