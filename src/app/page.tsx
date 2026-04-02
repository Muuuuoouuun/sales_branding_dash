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

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

function formatCompactRevenue(value: number): string {
  if (value >= 1000) {
    return `KRW ${(value / 1000).toFixed(1)}B`;
  }

  return formatRevenue(value);
}

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
      ? `${formatRevenue(Math.round(summary.gapRevenue / daysRemaining))}/day`
      : "On plan";

  return [
    `Team attainment is ${summary.attainment.toFixed(1)}% with ${formatCompactRevenue(summary.gapRevenue)} still open to target.`,
    weakestStage
      ? `${weakestStage.stage} is pacing at ${weakestStage.progress ?? 0}% of goal, making it the key execution watchpoint.`
      : "Execution KPI data is still sparse, so the current readout is focused on revenue and account progress.",
    `${summary.topManager} is leading the board, and the team needs ${pacePerDay} to close the remaining gap this month.`,
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

  return accounts.filter((account) => account.region === region).slice(0, 5);
}

function deriveRegionDeals(region: string | null, deals: HotDeal[]): HotDeal[] {
  if (!region) {
    return [];
  }

  return deals.filter((deal) => deal.region === region).slice(0, 4);
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
      setAiInsight("AI insight could not be generated. Check sheet connectivity and Gemini configuration.");
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

  const overviewStats = useMemo(() => {
    const daysRemaining = getDaysRemainingInMonth();
    const perDay =
      dashboard.teamSummary.gapRevenue > 0 && daysRemaining > 0
        ? formatRevenue(Math.round(dashboard.teamSummary.gapRevenue / daysRemaining))
        : "0";

    return [
      {
        label: "Revenue",
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
        label: "Remaining gap",
        value:
          dashboard.teamSummary.gapRevenue > 0
            ? formatCompactRevenue(dashboard.teamSummary.gapRevenue)
            : "On plan",
        trend:
          dashboard.teamSummary.gapRevenue > 0
            ? `Need ${perDay}/day`
            : "Target coverage secured",
        trendType: dashboard.teamSummary.gapRevenue > 0 ? "down" : "up",
      },
      {
        label: "Activated accounts",
        value: `${dashboard.teamSummary.activatedCount}/${dashboard.teamSummary.accountCount}`,
        trend: `${Math.round(
          dashboard.teamSummary.accountCount > 0
            ? (dashboard.teamSummary.activatedCount / dashboard.teamSummary.accountCount) * 100
            : 0,
        )}% converted`,
        trendType:
          dashboard.teamSummary.activatedCount >=
          Math.ceil(dashboard.teamSummary.accountCount * 0.5)
            ? "up"
            : "down",
      },
      {
        label: "Execution KPI",
        value: `${dashboard.teamSummary.activityCompletion.toFixed(1)}%`,
        trend: weakestStage
          ? `${weakestStage.stage} ${weakestStage.actual ?? 0}/${weakestStage.goal ?? 0}`
          : "Waiting for activity data",
        trendType:
          dashboard.teamSummary.activityCompletion >= 70
            ? "up"
            : dashboard.teamSummary.activityCompletion >= 40
              ? "down"
              : "critical",
      },
      {
        label: "Risk signals",
        value: String(dashboard.teamSummary.criticalRegionCount + staleAccounts),
        trend: `${dashboard.teamSummary.criticalRegionCount} regions · ${staleAccounts} stale accounts`,
        trendType:
          dashboard.teamSummary.criticalRegionCount + staleAccounts > 2 ? "critical" : "down",
      },
    ];
  }, [dashboard.teamSummary, staleAccounts, weakestStage]);

  const signalCards = useMemo(() => {
    const newMix =
      dashboard.teamSummary.actualRevenue > 0
        ? Math.round((dashboard.teamSummary.newRevenue / dashboard.teamSummary.actualRevenue) * 100)
        : 0;
    const directMix =
      dashboard.teamSummary.actualRevenue > 0
        ? Math.round((dashboard.teamSummary.directRevenue / dashboard.teamSummary.actualRevenue) * 100)
        : 0;

    return [
      {
        title: "Revenue mix",
        value: `${newMix}% new`,
        detail: `${formatCompactRevenue(dashboard.teamSummary.newRevenue)} new vs ${formatCompactRevenue(
          dashboard.teamSummary.renewRevenue,
        )} renew`,
      },
      {
        title: "Channel mix",
        value: `${directMix}% direct`,
        detail: `${formatCompactRevenue(dashboard.teamSummary.directRevenue)} direct vs ${formatCompactRevenue(
          dashboard.teamSummary.channelRevenue,
        )} channel`,
      },
      {
        title: "Immediate focus",
        value: `${highConfidenceDeals} high-confidence deals`,
        detail: weakestStage
          ? `${weakestStage.stage} and ${staleAccounts} aging accounts need manager attention`
          : `${staleAccounts} aging accounts need manager attention`,
      },
    ];
  }, [dashboard.teamSummary, highConfidenceDeals, staleAccounts, weakestStage]);

  const actionItems = useMemo(
    () => [
      {
        title: "Go close priority deals",
        copy: `${highConfidenceDeals} hot deals are sitting at 80%+ confidence.`,
        href: "/crm",
      },
      {
        title: "Review regional risks",
        copy: `${dashboard.teamSummary.criticalRegionCount} regions are below the expected pace line.`,
        href: "#regional-heatmap",
      },
      {
        title: "Generate board report",
        copy: "Open the AI strategy report for forecast and anomaly framing.",
        href: "/report",
      },
    ],
    [dashboard.teamSummary.criticalRegionCount, highConfidenceDeals],
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
            <h1 className={styles.title}>BD Team Dashboard</h1>
            <p className={styles.subtitle}>
              One board for revenue pacing, execution risk, and next actions.
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

          <Card className={styles.alertCard} title="Decision board">
            <div className={styles.aiBoxContent}>
              <div className={styles.aiIconBox}>
                <Brain size={22} className={styles.aiIcon} />
              </div>
              <div className={styles.aiContent}>
                <div className={styles.aiTitleRow}>
                  <div>
                    <h4 className={styles.aiTitle}>Current BD readout</h4>
                    <p className={styles.aiSubTitle}>
                      Grounded on the latest dashboard payload and bottleneck logic.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateInsight}
                    disabled={insightLoading}
                    className={styles.generateBtn}
                  >
                    {insightLoading ? <Loader2 size={14} className={styles.inlineSpinner} /> : "Refresh"}
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
                  data={dashboard.regional}
                  filter={statusFilter}
                  onRegionClick={handleRegionClick}
                />
              </div>

              <div className={styles.regionList}>
                <div className={styles.regionListHeader}>
                  <span>Region</span>
                  <span style={{ gridColumn: "2 / 4" }}>Attainment</span>
                  <span>Revenue / Target</span>
                </div>

                {filteredRegions.length === 0 ? (
                  <p className={styles.emptyMsg}>No regions match the current filter.</p>
                ) : (
                  filteredRegions.map((region) => {
                    const color = getHeatColor(region.progress);

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
                          {region.isDummy ? " - dummy" : ""}
                        </div>
                        <div className={styles.progressBarWrap}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${Math.min(region.progress, 100)}%`, background: color }}
                          />
                        </div>
                        <span className={styles.progressPct} style={{ color }}>
                          {region.progress}%
                        </span>
                        <span className={styles.revenueText}>
                          {formatRevenue(region.revenue)}
                          <span className={styles.targetText}> / {formatRevenue(region.target)}</span>
                        </span>
                      </button>
                    );
                  })
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
