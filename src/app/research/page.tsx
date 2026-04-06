"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeInfo,
  Brain,
  BookOpen,
  ChevronRight,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import styles from "./page.module.css";
import { SALES_LEGENDS, getContextualTip, type GuruTip, type SalesLegend } from "@/lib/salesTips";
import { RESOURCES, RESOURCE_CATEGORY_LABEL, RESOURCE_CATEGORY_EMOJI, isNewResource, getWeeklyResource, type Resource, type ResourceCategory } from "@/lib/resources";
import type { ActivityStage, DashboardPayload, HotDeal, IndividualData, RegionData } from "@/types/dashboard";

type ResearchTab = "library" | "patterns" | "intel" | "resources";
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
    ],
    questions: [
      "What is the hidden cost of doing nothing?",
      "Which assumption is the buyer treating as fixed?",
      "What would change if the team accepted a different frame?",
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
    ],
    questions: [
      "What is the current process and where does it break down?",
      "What is the business impact if the issue continues?",
      "What changes if this is solved this quarter?",
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
    ],
    questions: [
      "Who owns the budget and approval path?",
      "What criteria will decide the final choice?",
      "What proof is needed to move the deal forward?",
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
    ],
    questions: [
      "What is the real pain behind the request?",
      "What happens if the team does nothing?",
      "Who is actually committed to the next step?",
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
    ],
    questions: [
      "What is the one metric that changes the next move?",
      "What pattern is repeatable across accounts?",
      "What needs to be documented so the team can reuse it?",
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
    ],
    questions: [
      "Who owns pipeline generation — a repeatable system or individual heroics?",
      "What is the current SDR-to-AE ratio and is it sustainable at scale?",
      "Which lead source is producing the highest-quality pipeline right now?",
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
    ],
    questions: [
      "How many hours per week is each rep spending on active prospecting?",
      "What channels are generating the best response rates right now?",
      "What would the pipeline look like if the team stopped prospecting for 30 days?",
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
    ],
    questions: [
      "What emotion is actually driving the buyer's current position?",
      "What is the real 'no' underneath their hesitation?",
      "What calibrated question would make them think rather than react?",
    ],
  },
};

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

function formatRevenue(value: number): string {
  if (value >= 1000) {
    return `${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}${ (value / 1000).toFixed(1) }B`;
  }

  return `${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}${ Math.round(value).toLocaleString() }M`;
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
  const [query, setQuery] = useState("");
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
            );
          })() : null}
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
          ) : null}
        </div>
      )}
    </div>
  );
}
