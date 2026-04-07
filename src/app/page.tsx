"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Clock3,
  Filter,
  Loader2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/Card";
import DealAgingChart from "@/components/DealAgingChart";
import HotDealsWidget from "@/components/HotDealsWidget";
import KoreaProvinceMap from "@/components/KoreaProvinceMap";
import type { RegionData as MapRegionData } from "@/components/KoreaProvinceMap";
import QuarterlyTracker from "@/components/QuarterlyTracker";
import RegionDrilldown from "@/components/RegionDrilldown";
import RevenuePacingChart from "@/components/RevenuePacingChart";
import TargetGapRing from "@/components/TargetGapRing";
import { formatRevenue, formatCompactRevenue } from "@/lib/formatCurrency";
import { getHeatColor } from "@/lib/heatUtils";
import type {
  ActivityStage,
  DashboardPayload,
  FocusAccount,
  HotDeal,
  RegionData,
  TeamSummary,
} from "@/types/dashboard";
import styles from "./page.module.css";

type StatusFilter = "all" | "good" | "warning" | "critical";

const EMPTY_SUMMARY: TeamSummary = {
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
};

const EMPTY_DASHBOARD: DashboardPayload = {
  stats: [],
  regional: [],
  bottleneck: [],
  individuals: [],
  focusAccounts: [],
  topAccounts: [],
  hotDeals: [],
  teamSummary: EMPTY_SUMMARY,
  pacing: [],
  aging: [],
  periodLabel: "BD Team",
  dataSource: "fallback",
  lastUpdated: "",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  good: "Good",
  warning: "Watch",
  critical: "Risk",
};

const FILTER_COLORS: Record<StatusFilter, string> = {
  all: "#818cf8",
  good: "#4ade80",
  warning: "#fbbf24",
  critical: "#ef4444",
};


function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(lastDay - now.getDate(), 0);
}

function normalizeDashboardPayload(
  payload: Partial<DashboardPayload> | null | undefined,
): DashboardPayload {
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
      ...EMPTY_SUMMARY,
      ...(payload?.teamSummary ?? {}),
    },
  };
}

function getWeakestStage(stages: ActivityStage[]): ActivityStage | null {
  return stages.reduce<ActivityStage | null>((lowest, current) => {
    if (!lowest || (current.progress ?? 0) < (lowest.progress ?? 0)) {
      return current;
    }

    return lowest;
  }, null);
}

function buildRevenueInsight(regions: RegionData[]): string {
  if (regions.length === 0) {
    return "Regional performance insight will appear once live data is available.";
  }

  const strongest = regions.reduce((highest, current) =>
    current.progress > highest.progress ? current : highest,
  );
  const weakest = regions.reduce((lowest, current) =>
    current.progress < lowest.progress ? current : lowest,
  );

  return `${strongest.name} is leading pace at ${strongest.progress}%, while ${weakest.name} needs the fastest catch-up at ${weakest.progress}%.`;
}

function buildPipelineAction(stages: ActivityStage[]): string {
  if (stages.length === 0) {
    return "Execution bottleneck guidance will appear when activity targets are available.";
  }

  const weakest = getWeakestStage(stages);
  if (!weakest) {
    return "Execution bottleneck guidance will appear when activity targets are available.";
  }

  return `${weakest.stage} is the current bottleneck. Tighten next-step handoff and manager coaching around this stage first.`;
}

function buildAiReadout(summary: TeamSummary, weakestStage: ActivityStage | null): string[] {
  const daysRemaining = getDaysRemainingInMonth();
  const pacePerDay =
    summary.gapRevenue > 0 && daysRemaining > 0
      ? `${formatRevenue(Math.round(summary.gapRevenue / daysRemaining))}/일`
      : "목표 달성 안정권";

  return [
    `팀 달성률 ${summary.attainment.toFixed(1)}%, 목표 대비 잔여 ${formatCompactRevenue(summary.gapRevenue)} 남아 있습니다.`,
    weakestStage
      ? `${weakestStage.stage} 단계 ${weakestStage.progress ?? 0}% 달성 — 현재 핵심 실행 관리 포인트입니다.`
      : "KPI 활동 데이터가 부족합니다. 매출 및 고객 진행 현황 중심으로 관리하세요.",
    `${summary.topManager}이(가) 현재 선두를 달리고 있으며, 이번 달 잔여 격차 마감을 위해 ${pacePerDay} 속도가 필요합니다.`,
  ];
}

function getDataSourceLabel(dataSource: DashboardPayload["dataSource"]): string {
  return dataSource === "google-sheets" ? "Live Sheet" : "Fallback";
}

function formatLastUpdated(value: string): string {
  if (!value) {
    return "Sync pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sync pending";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function deriveRegionAccounts(region: string | null, accounts: FocusAccount[]): FocusAccount[] {
  if (!region) {
    return [];
  }

  const seen = new Set<string>();
  return accounts.filter((account) => {
    if (account.region !== region || seen.has(account.id)) return false;
    seen.add(account.id);
    return true;
  });
}

function deriveRegionDeals(region: string | null, deals: HotDeal[]): HotDeal[] {
  if (!region) {
    return [];
  }

  return deals.filter((deal) => deal.region === region).slice(0, 4);
}

export default function Dashboard() {
  const { language } = require("@/components/SettingsProvider").useSettings();
  const [dashboard, setDashboard] = useState<DashboardPayload>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [heatmapPeriod, setHeatmapPeriod] = useState<"M" | "Q" | "Y">("Q");
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [drilldownGeo, setDrilldownGeo] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<MapRegionData | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard/regions", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Dashboard request failed with ${response.status}`);
        }

        const payload = normalizeDashboardPayload((await response.json()) as DashboardPayload);

        if (!isCancelled) {
          setDashboard(payload);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch BD dashboard:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const handleGenerateInsight = async () => {
    if (insightLoading) {
      return;
    }

    setInsightLoading(true);

    try {
      const response = await fetch("/api/ai/insight", { method: "POST" });
      const data = (await response.json()) as { insight?: string };
      setAiInsight(data.insight ?? "");
    } catch (error) {
      console.error("Failed to generate AI insight:", error);
      setAiInsight(language === "ko" ? "AI 인사이트를 생성할 수 없습니다. 시트 연결을 확인하세요." : "AI insight could not be generated. Check sheet connectivity and Gemini configuration.");
    } finally {
      setInsightLoading(false);
    }
  };

  const weakestStage = useMemo(() => getWeakestStage(dashboard.bottleneck), [dashboard.bottleneck]);
  const staleAccounts = useMemo(
    () => dashboard.aging.filter((point) => point.days > 40 && !point.isDummy).length,
    [dashboard.aging],
  );
  const highConfidenceDeals = useMemo(
    () => dashboard.hotDeals.filter((deal) => deal.probability >= 80).length,
    [dashboard.hotDeals],
  );

  const filteredRegions = useMemo(
    () =>
      dashboard.regional
        .filter((region) => statusFilter === "all" || region.status === statusFilter)
        .sort((left, right) => right.progress - left.progress),
    [dashboard.regional, statusFilter],
  );

  const heatmapRegions = useMemo(() => {
    return filteredRegions.map((r) => {
      const divisor = heatmapPeriod === "M" ? 12 : heatmapPeriod === "Q" ? 4 : 1;
      const displayTarget = r.target > 0 ? Math.round(r.target / divisor) : 0;
      const displayRevenue =
        heatmapPeriod === "M" ? (r.revenueM ?? 0) :
        heatmapPeriod === "Q" ? (r.revenueQ ?? 0) :
        r.revenue;
      const displayProgress = displayTarget > 0 ? Math.round((displayRevenue / displayTarget) * 100) : 0;
      return { ...r, displayRevenue, displayTarget, displayProgress };
    });
  }, [filteredRegions, heatmapPeriod]);

  const overviewStats = useMemo(() => {
    const daysRemaining = getDaysRemainingInMonth();
    const perDay =
      dashboard.teamSummary.gapRevenue > 0 && daysRemaining > 0
        ? formatRevenue(Math.round(dashboard.teamSummary.gapRevenue / daysRemaining))
        : "0";

    return [
      {
        label: language === "ko" ? "매출 달성도" : "Revenue",
        value: formatCompactRevenue(dashboard.teamSummary.actualRevenue),
        trend: `${dashboard.teamSummary.attainment.toFixed(1)}% of ${formatCompactRevenue(
          dashboard.teamSummary.targetRevenue,
        )}`,
        trendType:
          dashboard.teamSummary.attainment >= 100
            ? "up"
            : dashboard.teamSummary.attainment >= 80
              ? "down"
              : "critical",
      },
      {
        label: language === "ko" ? "목표 격차" : "Remaining gap",
        value:
          dashboard.teamSummary.gapRevenue > 0
            ? formatCompactRevenue(dashboard.teamSummary.gapRevenue)
            : (language === "ko" ? "목표 달성" : "On plan"),
        trend:
          dashboard.teamSummary.gapRevenue > 0
            ? (language === "ko" ? `일당 ${perDay} 필요` : `Need ${perDay}/day`)
            : (language === "ko" ? "목표 달성 안정권" : "Target coverage secured"),
        trendType: dashboard.teamSummary.gapRevenue > 0 ? "down" : "up",
      },
      {
        label: language === "ko" ? "활성 고객사" : "Activated accounts",
        value: `${dashboard.teamSummary.activatedCount}/${dashboard.teamSummary.accountCount}`,
        trend: `${Math.round(
          dashboard.teamSummary.accountCount > 0
            ? (dashboard.teamSummary.activatedCount / dashboard.teamSummary.accountCount) * 100
            : 0,
        )}% ${language === "ko" ? "전환" : "converted"}`,
        trendType:
          dashboard.teamSummary.activatedCount >=
          Math.ceil(dashboard.teamSummary.accountCount * 0.5)
            ? "up"
            : "down",
      },
      {
        label: language === "ko" ? "실행 KPI" : "Execution KPI",
        value: `${dashboard.teamSummary.activityCompletion.toFixed(1)}%`,
        trend: weakestStage
          ? `${weakestStage.stage} ${weakestStage.actual ?? 0}/${weakestStage.goal ?? 0}`
          : (language === "ko" ? "활동 데이터 대기 중" : "Waiting for activity data"),
        trendType:
          dashboard.teamSummary.activityCompletion >= 70
            ? "up"
            : dashboard.teamSummary.activityCompletion >= 40
              ? "down"
              : "critical",
      },
      {
        label: language === "ko" ? "위험 신호" : "Risk signals",
        value: String(dashboard.teamSummary.criticalRegionCount + staleAccounts),
        trend: `${language === "ko" ? "" : ""}${dashboard.teamSummary.criticalRegionCount} ${language === "ko" ? "개 지역 · 위험 고객" : "regions · risk accounts"} ${staleAccounts}${language === "ko" ? "건" : ""}`,
        trendType:
          dashboard.teamSummary.criticalRegionCount + staleAccounts > 2 ? "critical" : "down",
      },
    ];
  }, [dashboard.teamSummary, staleAccounts, weakestStage, language]);

  const signalCards = useMemo(() => {
    const revTotal = dashboard.teamSummary.newRevenue + dashboard.teamSummary.renewRevenue;
    const newMix = revTotal > 0
      ? Math.round((dashboard.teamSummary.newRevenue / revTotal) * 100)
      : 0;
    const channelTotal = dashboard.teamSummary.directRevenue + dashboard.teamSummary.channelRevenue;
    const directMix = channelTotal > 0
      ? Math.round((dashboard.teamSummary.directRevenue / channelTotal) * 100)
      : 0;

    return [
      {
        title: language === "ko" ? "매출 구성" : "Revenue mix",
        value: `${newMix}% ${language === "ko" ? "신규" : "new"}`,
        detail: `${formatCompactRevenue(dashboard.teamSummary.newRevenue)} ${language === "ko" ? "신규 vs " : "new vs "}${formatCompactRevenue(
          dashboard.teamSummary.renewRevenue,
        )} ${language === "ko" ? "갱신" : "renew"}`,
      },
      {
        title: language === "ko" ? "채널 구성" : "Channel mix",
        value: `${directMix}% ${language === "ko" ? "직접" : "direct"}`,
        detail: `${formatCompactRevenue(dashboard.teamSummary.directRevenue)} ${language === "ko" ? "직접 vs " : "direct vs "}${formatCompactRevenue(
          dashboard.teamSummary.channelRevenue,
        )} ${language === "ko" ? "채널" : "channel"}`,
      },
      {
        title: language === "ko" ? "즉각적인 후속조치 요망" : "Immediate focus",
        value: `${highConfidenceDeals} ${language === "ko" ? "건의 핵심 딜" : "high-confidence deals"}`,
        detail: weakestStage
          ? `${weakestStage.stage} ${language === "ko" ? "조치 필요 및" : "and"} ${staleAccounts} ${language === "ko" ? "건의 정체된 고객사 관리 필요" : "aging accounts need manager attention"}`
          : `${staleAccounts} ${language === "ko" ? "건의 정체된 고객사 관리 필요" : "aging accounts need manager attention"}`,
      },
    ];
  }, [dashboard.teamSummary, highConfidenceDeals, staleAccounts, weakestStage, language]);

  const actionItems = useMemo(
    () => [
      {
        title: language === "ko" ? "우선순위 딜 조치" : "Go close priority deals",
        copy: `${highConfidenceDeals} ${language === "ko" ? "건의 기대 딜이 대기 중입니다." : "hot deals are sitting at 80%+ confidence."}`,
        href: "/crm",
      },
      {
        title: language === "ko" ? "지역별 위험요소 확인" : "Review regional risks",
        copy: `${dashboard.teamSummary.criticalRegionCount} ${language === "ko" ? "개 지역이 목표 달성에 미달합니다." : "regions are below the expected pace line."}`,
        href: "#regional-heatmap",
      },
      {
        title: language === "ko" ? "보고서 생성" : "Generate board report",
        copy: language === "ko" ? "AI 보고서를 열어 향후 추세 및 인싸이트를 확인하세요." : "Open the AI strategy report for forecast and anomaly framing.",
        href: "/report",
      },
    ],
    [dashboard.teamSummary.criticalRegionCount, highConfidenceDeals, language],
  );

  const selectedRegionAccounts = useMemo(
    () =>
      deriveRegionAccounts(
        drilldownData?.name ?? drilldownGeo,
        [...dashboard.focusAccounts, ...dashboard.topAccounts],
      ),
    [dashboard.focusAccounts, dashboard.topAccounts, drilldownData?.name, drilldownGeo],
  );

  const selectedRegionDeals = useMemo(
    () => deriveRegionDeals(drilldownData?.name ?? drilldownGeo, dashboard.hotDeals),
    [dashboard.hotDeals, drilldownData?.name, drilldownGeo],
  );

  const handleRegionClick = (geoName: string, regionData: MapRegionData | null) => {
    setDrilldownGeo(geoName);
    setDrilldownData(regionData);
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={48} className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className="eyebrow">{dashboard.periodLabel}</span>
          <div>
            <h1 className={styles.title}>{language === "ko" ? "영업 실행 조종석 (Cockpit)" : "BD execution cockpit"}</h1>
            <p className={styles.subtitle}>
              {language === "ko" ? "라이브 시트 데이터, 파이프라인 및 운영 방법론을 이 화면에서 확인하세요." : "Live sheet data, CRM pipeline, and operating methodology in one place."}
            </p>
          </div>
        </div>

        <div className={styles.headerRail}>
          <div className={styles.metaRow}>
            <div className={`glass ${styles.metaBadge}`}>
              <ShieldAlert size={14} />
              {getDataSourceLabel(dashboard.dataSource)}
            </div>
            <div className={`glass ${styles.metaBadge}`}>
              <Clock3 size={14} />
              {formatLastUpdated(dashboard.lastUpdated)}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.secondaryAction} href="/report">
              Open report
            </Link>
            <Link className={styles.primaryAction} href="/crm">
              Open CRM
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.statsGrid}>
        {overviewStats.map((stat) => (
          <Card key={stat.label} className={styles.statCard}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={`${styles.statValue} metricValue`}>{stat.value}</span>
            <span
              className={`${styles.statTrend} ${
                stat.trendType === "up"
                  ? styles.trendUp
                  : stat.trendType === "down"
                    ? styles.trendDown
                    : styles.trendCritical
              }`}
            >
              {stat.trendType === "up" ? <TrendingUp size={14} /> : null}
              {stat.trendType === "down" ? <TrendingDown size={14} /> : null}
              {stat.trendType === "critical" ? <AlertTriangle size={14} /> : null}
              {stat.trend}
            </span>
          </Card>
        ))}
      </div>

      {dashboard.regional.length > 0 ? (
        <QuarterlyTracker
          data={dashboard.regional}
          individuals={dashboard.individuals}
          periodLabel={dashboard.periodLabel}
          teamSummary={dashboard.teamSummary}
        />
      ) : null}

      <section className={styles.signalGrid}>
        {signalCards.map((card) => (
          <div key={card.title} className={styles.signalCard}>
            <span className={styles.signalLabel}>{card.title}</span>
            <strong className={`${styles.signalValue} metricValue`}>{card.value}</strong>
            <p className={styles.signalCopy}>{card.detail}</p>
          </div>
        ))}
      </section>

      <div className={styles.dashboardSplit}>
        <aside className={styles.leftCol}>
          <TargetGapRing teamSummary={dashboard.teamSummary} periodLabel={dashboard.periodLabel} />
          <HotDealsWidget deals={dashboard.hotDeals} />

          <Card className={styles.alertCard} title="의사결정 보드">
            <div className={styles.aiBoxContent}>
              <div className={styles.aiIconBox}>
                <Brain size={22} className={styles.aiIcon} />
              </div>
              <div className={styles.aiContent}>
                <div className={styles.aiTitleRow}>
                  <div>
                    <h4 className={styles.aiTitle}>현재 BD 현황 요약</h4>
                    <p className={styles.aiSubTitle}>
                      최신 대시보드 및 실행 KPI 기반 분석입니다.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateInsight}
                    disabled={insightLoading}
                    className={styles.generateBtn}
                  >
                    {insightLoading ? <Loader2 size={14} className={styles.inlineSpinner} /> : "새로고침"}
                  </button>
                </div>

                {aiInsight ? (
                  <div className={styles.aiResult}>
                    <p className={styles.aiText} style={{ whiteSpace: "pre-line" }}>
                      {aiInsight}
                    </p>
                  </div>
                ) : (
                  <div className={styles.readoutList}>
                    {buildAiReadout(dashboard.teamSummary, weakestStage).map((item) => (
                      <p key={item} className={styles.aiText}>
                        {item}
                      </p>
                    ))}
                  </div>
                )}

                <div className={styles.quickActionList}>
                  {actionItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={styles.quickAction}
                    >
                      <div>
                        <span className={styles.quickActionTitle}>{item.title}</span>
                        <span className={styles.quickActionCopy}>{item.copy}</span>
                      </div>
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </aside>

        <section className={styles.rightCol}>
          <div className={styles.chartsGrid}>
            <Card
              title="Revenue vs target"
              action={
                <Link className={styles.viewReportBtn} href="/report">
                  Open report
                </Link>
              }
            >
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.regional}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card-bg)",
                        borderColor: "var(--surface-border)",
                        borderRadius: "12px",
                      }}
                      itemStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number | undefined) =>
                        value != null ? formatRevenue(value) : ""
                      }
                    />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Revenue" />
                    <Bar dataKey="target" fill="var(--surface-2)" radius={[6, 6, 0, 0]} name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.insightText}>
                <strong>Insight:</strong> {buildRevenueInsight(dashboard.regional)}
              </p>
            </Card>

            <Card title="Execution funnel">
              <PipelineFunnel data={dashboard.bottleneck} />
              <p className={styles.bottleneckAction}>
                <strong>Action:</strong> {buildPipelineAction(dashboard.bottleneck)}
              </p>
            </Card>
          </div>

          <Card
            title="Regional heatmap"
            className={styles.heatmapCard}
            action={
              <div className={styles.filterRow}>
                <div style={{ display: "flex", gap: "0.25rem", marginRight: "0.5rem", borderRight: "1px solid var(--surface-border)", paddingRight: "0.5rem" }}>
                  {(["M", "Q", "Y"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setHeatmapPeriod(p)}
                      className={`${styles.filterBtn} ${heatmapPeriod === p ? styles.filterBtnActive : ""}`}
                      style={heatmapPeriod === p ? { background: "#818cf822", color: "#818cf8", borderColor: "#818cf855" } : undefined}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Filter size={13} style={{ color: "var(--text-muted)" }} />
                {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setStatusFilter(filterKey)}
                    className={`${styles.filterBtn} ${
                      statusFilter === filterKey ? styles.filterBtnActive : ""
                    }`}
                    style={
                      statusFilter === filterKey
                        ? {
                            background: `${FILTER_COLORS[filterKey]}22`,
                            color: FILTER_COLORS[filterKey],
                            borderColor: `${FILTER_COLORS[filterKey]}55`,
                          }
                        : undefined
                    }
                  >
                    {FILTER_LABELS[filterKey]}
                  </button>
                ))}
              </div>
            }
          >
            <div id="regional-heatmap" className={styles.heatmapLayout}>
              <div className={styles.mapWrapper}>
                <KoreaProvinceMap
                  data={heatmapRegions}
                  filter={statusFilter}
                  onRegionClick={handleRegionClick}
                />
              </div>

              <div className={styles.regionList}>
                <div className={styles.regionListHeader}>
                  <span>지역</span>
                  <span style={{ gridColumn: "2 / 4" }}>달성률</span>
                  <span>매출 / 목표</span>
                </div>

                {heatmapRegions.length === 0 ? (
                  <p className={styles.emptyMsg}>해당 필터 조건에 맞는 지역이 없습니다.</p>
                ) : (
                  <>
                    {(showAllRegions ? heatmapRegions : heatmapRegions.slice(0, 5)).map((region) => {
                      const color = getHeatColor(region.displayProgress);

                      return (
                        <button
                          key={region.name}
                          className={styles.regionRow}
                          onClick={() => handleRegionClick(region.name, region as MapRegionData)}
                          type="button"
                        >
                          <div className={styles.regionName}>
                            <span className={styles.regionDot} style={{ background: color }} />
                            {region.name}
                          </div>
                          <div className={styles.progressBarWrap}>
                            <div
                              className={styles.progressBarFill}
                              style={{ width: `${Math.min(region.displayProgress, 100)}%`, background: color }}
                            />
                          </div>
                          <span className={styles.progressPct} style={{ color }}>
                            {region.displayProgress}%
                          </span>
                          <span className={styles.revenueText}>
                            {formatRevenue(region.displayRevenue)}
                            <span className={styles.targetText}> / {formatRevenue(region.displayTarget)}</span>
                          </span>
                        </button>
                      );
                    })}
                    {heatmapRegions.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllRegions((v) => !v)}
                        style={{
                          width: "100%",
                          padding: "0.45rem 0",
                          marginTop: "0.25rem",
                          fontSize: "0.75rem",
                          color: "var(--primary)",
                          background: "var(--primary-soft)",
                          border: "1px solid var(--primary-border)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {showAllRegions
                          ? "▲ 접기"
                          : `▼ 더 보기 (${heatmapRegions.length - 5}개 지역 더)`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>

          {drilldownGeo ? (
            <RegionDrilldown
              geoName={drilldownGeo}
              regionData={drilldownData}
              accounts={selectedRegionAccounts}
              hotDeals={selectedRegionDeals}
              allRegions={dashboard.regional}
              periodLabel={dashboard.periodLabel}
              onClose={() => {
                setDrilldownGeo(null);
                setDrilldownData(null);
              }}
            />
          ) : null}

          <div className={styles.chartsGrid}>
            <RevenuePacingChart data={dashboard.pacing} periodLabel={dashboard.periodLabel} />
            <DealAgingChart data={dashboard.aging} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PipelineFunnel({ data }: { data: ActivityStage[] }) {
  const max = data[0]?.value ?? 1;

  return (
    <div className={styles.funnelList}>
      {data.map((stage, index) => {
        const previous = data[index - 1];
        const dropPct = previous
          ? Math.round((1 - stage.value / Math.max(previous.value, 1)) * 100)
          : null;
        const isBottleneck = dropPct !== null && dropPct >= 35;
        const barWidth = (stage.value / max) * 100;

        return (
          <div key={stage.stage} className={styles.funnelItem}>
            {dropPct !== null ? (
              <div
                className={`${styles.funnelDropRow} ${
                  isBottleneck ? styles.funnelDropRowDanger : ""
                }`}
              >
                <span>{dropPct}% drop-off</span>
                {isBottleneck ? <span className={styles.bottleneckBadge}>Bottleneck</span> : null}
              </div>
            ) : null}
            <div className={styles.funnelBarRow}>
              <div className={styles.funnelStage}>{stage.stage}</div>
              <div className={styles.funnelTrack}>
                <div
                  className={styles.funnelFill}
                  style={{
                    width: `${barWidth}%`,
                    background: isBottleneck
                      ? "linear-gradient(90deg,#b91c1c,#ef4444)"
                      : index === 0
                        ? "linear-gradient(90deg,#4338ca,#6366f1)"
                        : "linear-gradient(90deg,#6366f1,#818cf8)",
                  }}
                >
                  <span className={`${styles.funnelValue} metricValue`}>{stage.value}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
