"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Filter,
  Loader2,
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
  DashboardDataSource,
  DashboardPayload,
  DealAgingPoint,
  HotDeal,
  IndividualData,
  RegionData,
  RevenuePacingPoint,
  Stat,
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

function buildInsightPlaceholder(
  summary: TeamSummary,
  bottleneck: ActivityStage[],
  periodLabel: string,
): string {
  const weakestStage =
    bottleneck
      .slice()
      .sort((left, right) => (left.progress ?? 0) - (right.progress ?? 0))[0] ?? null;

  return `${periodLabel} 기준 BD 팀은 ${summary.attainment.toFixed(1)}% 달성 중이며, 남은 갭은 ${formatRevenue(
    summary.gapRevenue,
  )}입니다. ${
    weakestStage
      ? `${weakestStage.stage} 실행률이 가장 낮아 후속 액션 우선순위로 보입니다.`
      : "실행 KPI 데이터가 아직 충분하지 않습니다."
  }`;
}

function buildRevenueInsight(regions: RegionData[]): string {
  if (regions.length === 0) {
    return "Regional revenue insight is not available yet.";
  }

  const weakest = [...regions].sort((left, right) => left.progress - right.progress)[0];
  const strongest = [...regions].sort((left, right) => right.progress - left.progress)[0];

  return `${strongest.name} leads at ${strongest.progress}%, while ${weakest.name} needs the fastest catch-up at ${weakest.progress}%.`;
}

function buildPipelineAction(stages: ActivityStage[]): string {
  if (stages.length === 0) {
    return "No BD activity stage data is available yet.";
  }

  const weakest = [...stages].sort((left, right) => (left.progress ?? 0) - (right.progress ?? 0))[0];
  return `${weakest.stage} is the current bottleneck at ${weakest.progress ?? 0}% of goal. Coach the team on the next-step handoff around this stage first.`;
}

function buildAiSummary(summary: TeamSummary, periodLabel: string): string {
  return `${periodLabel} 기준 ${summary.topManager}가 선두이며, 활성 계정 ${summary.accountCount}개 중 ${summary.activatedCount}개가 first payment까지 도달했습니다.`;
}

export interface IndividualDataExport extends IndividualData {}

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [regionalData, setRegionalData] = useState<RegionData[]>([]);
  const [bottleneckData, setBottleneckData] = useState<ActivityStage[]>([]);
  const [individuals, setIndividuals] = useState<IndividualData[]>([]);
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([]);
  const [pacingData, setPacingData] = useState<RevenuePacingPoint[]>([]);
  const [agingData, setAgingData] = useState<DealAgingPoint[]>([]);
  const [teamSummary, setTeamSummary] = useState<TeamSummary>(EMPTY_SUMMARY);
  const [periodLabel, setPeriodLabel] = useState("BD Team");
  const [dataSource, setDataSource] = useState<DashboardDataSource>("fallback");
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [drilldownGeo, setDrilldownGeo] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<MapRegionData | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard/regions");
        const payload = (await response.json()) as DashboardPayload;

        setStats(payload.stats ?? []);
        setRegionalData(payload.regional ?? []);
        setBottleneckData(payload.bottleneck ?? []);
        setIndividuals(payload.individuals ?? []);
        setHotDeals(payload.hotDeals ?? []);
        setPacingData(payload.pacing ?? []);
        setAgingData(payload.aging ?? []);
        setTeamSummary(payload.teamSummary ?? EMPTY_SUMMARY);
        setPeriodLabel(payload.periodLabel ?? "BD Team");
        setDataSource(payload.dataSource ?? "fallback");
      } catch (error) {
        console.error("Failed to fetch BD dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleGenerateInsight = async () => {
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

  const filteredRegions = useMemo(
    () =>
      regionalData
        .filter((region) => statusFilter === "all" || region.status === statusFilter)
        .sort((left, right) => right.progress - left.progress),
    [regionalData, statusFilter],
  );

  const handleRegionClick = (geoName: string, regionData: MapRegionData | null) => {
    setDrilldownGeo(geoName);
    setDrilldownData(regionData);
  };

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Loader2 size={48} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>BD Team Dashboard</h1>
          <p className={styles.subtitle}>
            Live sheet-driven BD performance, pacing, and execution visibility
          </p>
        </div>
        <div className={`glass ${styles.dateBadge}`}>
          {dataSource === "google-sheets" ? "Live Sheet" : "Fallback"} · {periodLabel}
        </div>
      </header>

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <Card key={stat.label} className={styles.statCard}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue}>{stat.value}</span>
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

      {regionalData.length > 0 ? (
        <QuarterlyTracker
          data={regionalData}
          individuals={individuals}
          periodLabel={periodLabel}
        />
      ) : null}

      <div className={styles.dashboardSplit}>
        <div className={styles.leftCol}>
          <TargetGapRing teamSummary={teamSummary} periodLabel={periodLabel} />
          <HotDealsWidget deals={hotDeals} />

          <Card className={styles.alertCard} title="AI BD insight">
            <div className={styles.aiBoxContent}>
              <div className={styles.aiIconBox}>
                <Brain size={24} className={styles.aiIcon} />
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.aiTitleRow}>
                  <h4 className={styles.aiTitle}>Current BD readout</h4>
                  <button
                    onClick={handleGenerateInsight}
                    disabled={insightLoading}
                    className={styles.generateBtn}
                  >
                    {insightLoading ? (
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      "Generate"
                    )}
                  </button>
                </div>

                {aiInsight ? (
                  <div className={styles.aiResult}>
                    <p className={styles.aiText} style={{ whiteSpace: "pre-line" }}>
                      {aiInsight}
                    </p>
                  </div>
                ) : (
                  <p className={styles.aiText}>
                    {buildInsightPlaceholder(teamSummary, bottleneckData, periodLabel)}
                    <br />
                    <span className={styles.aiHint}>{buildAiSummary(teamSummary, periodLabel)}</span>
                  </p>
                )}

                <p className={styles.actionLink}>AI summary is grounded on the current BD sheet payload.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.chartsGrid}>
            <Card title="Revenue vs target" action={<button className={styles.viewReportBtn}>Regional view</button>}>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#333" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(value: number | undefined) =>
                        value != null ? formatRevenue(value) : ""
                      }
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="target" fill="#27272a" radius={[4, 4, 0, 0]} name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.insightText}>
                <strong>Insight:</strong> {buildRevenueInsight(regionalData)}
              </p>
            </Card>

            <Card title="Execution funnel">
              <PipelineFunnel data={bottleneckData} />
              <p className={styles.bottleneckAction} style={{ marginTop: "0.75rem" }}>
                <strong>Action:</strong> {buildPipelineAction(bottleneckData)}
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
                    className={`${styles.filterBtn} ${statusFilter === filterKey ? styles.filterBtnActive : ""}`}
                    style={
                      statusFilter === filterKey
                        ? {
                            background: `${FILTER_COLORS[filterKey]}22`,
                            color: FILTER_COLORS[filterKey],
                            borderColor: `${FILTER_COLORS[filterKey]}44`,
                          }
                        : {}
                    }
                  >
                    {FILTER_LABELS[filterKey]}
                  </button>
                ))}
              </div>
            }
          >
            <div className={styles.heatmapLayout}>
              <div className={styles.mapWrapper}>
                <KoreaProvinceMap
                  data={regionalData}
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
                      <div key={region.name} className={styles.regionRow}>
                        <div className={styles.regionName}>
                          <span className={styles.regionDot} style={{ background: color }} />
                          {region.name}
                          {region.isDummy ? " -더미-" : ""}
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
                      </div>
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
              onClose={() => {
                setDrilldownGeo(null);
                setDrilldownData(null);
              }}
            />
          ) : null}

          <div className={styles.chartsGrid}>
            <RevenuePacingChart data={pacingData} periodLabel={periodLabel} />
            <DealAgingChart data={agingData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineFunnel({ data }: { data: ActivityStage[] }) {
  const max = data[0]?.value ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", padding: "0.25rem 0" }}>
      {data.map((stage, index) => {
        const previous = data[index - 1];
        const dropPct = previous ? Math.round((1 - stage.value / Math.max(previous.value, 1)) * 100) : null;
        const isBottleneck = dropPct !== null && dropPct >= 35;
        const barWidth = (stage.value / max) * 100;

        return (
          <div key={stage.stage}>
            {dropPct !== null ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 0 5px 100px",
                  fontSize: "0.61rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: isBottleneck ? "var(--danger-foreground)" : "var(--text-muted)",
                }}
              >
                <span>Δ</span>
                <span>{dropPct}% drop-off</span>
                {isBottleneck ? (
                  <span
                    style={{
                      background: "var(--danger-soft)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: 4,
                      padding: "1px 7px",
                      color: "var(--danger-foreground)",
                      fontSize: "0.58rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Bottleneck
                  </span>
                ) : null}
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 90,
                  flexShrink: 0,
                  textAlign: "right",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {stage.stage}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: "var(--surface-2)",
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: "100%",
                    borderRadius: 5,
                    background: isBottleneck
                      ? "linear-gradient(90deg,#b91c1c,#ef4444)"
                      : index === 0
                        ? "linear-gradient(90deg,#4338ca,#6366f1)"
                        : "linear-gradient(90deg,#6366f1,#818cf8)",
                    transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--foreground)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stage.value}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
