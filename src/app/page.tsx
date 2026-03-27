"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import Card from "@/components/Card";
import KoreaProvinceMap, { RegionData } from "@/components/KoreaProvinceMap";
import RegionDrilldown from "@/components/RegionDrilldown";
import QuarterlyTracker from "@/components/QuarterlyTracker";
import SalesTip from "@/components/SalesTip";
import GrowthWidget from "@/components/GrowthWidget";
import HabitCheckStrip from "@/components/HabitCheckStrip";
import SkillRadarMini from "@/components/SkillRadarMini";
import TargetGapRing from "@/components/TargetGapRing";
import HotDealsWidget from "@/components/HotDealsWidget";
import RevenuePacingChart from "@/components/RevenuePacingChart";
import DealAgingChart from "@/components/DealAgingChart";
import DailyGuruTip from "@/components/DailyGuruTip";
import { getHeatColor } from "@/lib/heatUtils";
import {
  TrendingUp, TrendingDown, AlertTriangle,
  Brain, Loader2, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────
interface Stat {
  label: string;
  value: string;
  trend: string;
  trendType: "up" | "down" | "critical";
  trendLabel: string;
}

interface BottleneckData {
  stage: string;
  value: number;
  fullMark: number;
}

type StatusFilter = "all" | "good" | "warning" | "critical";

export interface IndividualData {
  name: string;
  wonRevenue: number;
  pipelineRevenue: number;
  target: number;
  progress: number;
  deals_total: number;
  deals_won: number;
}

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "전체", good: "순조", warning: "주의", critical: "위험",
};

const FILTER_COLORS: Record<StatusFilter, string> = {
  all: "#818cf8", good: "#4ade80", warning: "#fbbf24", critical: "#ef4444",
};

// ─── Component ───────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats]               = useState<Stat[]>([]);
  const [regionalData, setRegionalData] = useState<RegionData[]>([]);
  const [bottleneckData, setBottleneckData] = useState<BottleneckData[]>([]);
  const [individuals, setIndividuals]   = useState<IndividualData[]>([]);
  const [loading, setLoading]           = useState(true);
  const [aiInsight, setAiInsight]       = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Drill-down modal state
  const [drilldownGeo,  setDrilldownGeo]  = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<RegionData | null>(null);

  const handleRegionClick = (geoName: string, regionData: RegionData | null) => {
    setDrilldownGeo(geoName);
    setDrilldownData(regionData);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, regionsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/dashboard/regions"),
        ]);
        setStats(await statsRes.json());
        const regionsJson = await regionsRes.json();
        setRegionalData(regionsJson.regional);
        setBottleneckData(regionsJson.bottleneck);
        setIndividuals(regionsJson.individuals ?? []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    try {
      const res  = await fetch("/api/ai/insight", { method: "POST" });
      const data = await res.json();
      setAiInsight(data.insight);
    } catch {
      setAiInsight("인사이트 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setInsightLoading(false);
    }
  };

  const filteredRegions = regionalData
    .filter(r => statusFilter === "all" || r.status === statusFilter)
    .sort((a, b) => b.progress - a.progress);

  if (loading) {
    return (
      <div className={styles.container} style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={48} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Intelligence</h1>
          <p className={styles.subtitle}>Real-time Sales Velocity &amp; Regional Performance</p>
        </div>
        <div className={`glass ${styles.dateBadge}`}>
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric", month: "long", day: "numeric", weekday: "short",
          })}
        </div>
      </header>

      {/* ── Daily Guru Tip Banner ── */}
      <DailyGuruTip />

      {/* ── Stats Row ── */}
      <div className={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <Card key={idx} className={styles.statCard}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={`${styles.statTrend} ${
              stat.trendType === "up"       ? styles.trendUp :
              stat.trendType === "down"     ? styles.trendDown :
              styles.trendCritical
            }`}>
              {stat.trendType === "up"       && <TrendingUp   size={14} />}
              {stat.trendType === "down"     && <TrendingDown  size={14} />}
              {stat.trendType === "critical" && <AlertTriangle size={14} />}
              {stat.trend}
            </span>
          </Card>
        ))}
        <Card className={styles.statCard}>
          <GrowthWidget />
        </Card>
      </div>

      {/* ── Quarterly Tracker ── */}
      {regionalData.length > 0 && (
        <QuarterlyTracker data={regionalData} individuals={individuals} />
      )}

      <div className={styles.dashboardSplit}>
        {/* ── Left Column (Action & Personal) ── */}
        <div className={styles.leftCol}>
          <TargetGapRing />
          <HotDealsWidget />
          <SalesTip offset={0} />
          <HabitCheckStrip />
          
          <Card className={styles.alertCard} title="AI Predictive Alert (Gemini Insight)">
            <div className={styles.aiBoxContent}>
              <div className={styles.aiIconBox}>
                <Brain size={24} className={styles.aiIcon} />
              </div>
              <div style={{ flex: 1 }}>
                <div className={styles.aiTitleRow}>
                  <h4 className={styles.aiTitle}>Strategic AI Insight</h4>
                  <button
                    onClick={handleGenerateInsight}
                    disabled={insightLoading}
                    className={styles.generateBtn}
                  >
                    {insightLoading
                      ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      : "전략 생성"}
                  </button>
                </div>

                {aiInsight ? (
                  <div className={styles.aiResult}>
                    <p className={styles.aiText} style={{ whiteSpace: "pre-line" }}>{aiInsight}</p>
                  </div>
                ) : (
                  <p className={styles.aiText}>
                    활동 로그 기반으로{" "}
                    <strong className={styles.highlightText}>Team Alpha</strong>는
                    이번 주 Proposal 볼륨이 20% 증가하지 않으면 Q1 목표를 15% 미달할 것으로 예측됩니다.
                    <br />
                    <span className={styles.aiHint}>(「전략 생성」 클릭 시 Gemini 실시간 분석)</span>
                  </p>
                )}

                <p className={styles.actionLink}>→ 추천 스크립트 &amp; 실행 플랜 보기</p>
              </div>
            </div>
          </Card>
          
          <SkillRadarMini />
        </div>

        {/* ── Right Column (Macro & Deep Dive) ── */}
        <div className={styles.rightCol}>
          {/* Charts Row */}
          <div className={styles.chartsGrid}>
            <Card title="매출 vs 목표" action={<button className={styles.viewReportBtn}>리포트 보기</button>}>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#333" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v: number | undefined) => v != null ? `₩${v.toLocaleString()}M` : ''}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="매출" />
                    <Bar dataKey="target"  fill="#27272a" radius={[4, 4, 0, 0]} name="목표" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className={styles.insightText}>
                <strong>Insight:</strong> 부산·대구가 목표 대비 큰 편차 발생. 대구는 즉각적 개입이 필요합니다.
              </p>
            </Card>

            <Card title="딜 파이프라인 전환율">
              <PipelineFunnel data={bottleneckData} />
              <p className={styles.bottleneckAction} style={{ marginTop: "0.75rem" }}>
                <strong>Action:</strong> 할인 승인 프로세스 단축 + Negotiation 진입 전 MEDDIC 검증 강화
              </p>
            </Card>
          </div>

          {/* Heatmap Section */}
      <Card
        title="지역별 성과 히트맵"
        className={styles.heatmapCard}
        action={
          <div className={styles.filterRow}>
            <Filter size={13} style={{ color: "var(--text-muted)" }} />
            {(Object.keys(FILTER_LABELS) as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`${styles.filterBtn} ${statusFilter === f ? styles.filterBtnActive : ""}`}
                style={statusFilter === f ? {
                  background:  `${FILTER_COLORS[f]}22`,
                  color:       FILTER_COLORS[f],
                  borderColor: `${FILTER_COLORS[f]}44`,
                } : {}}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        }
      >
        <div className={styles.heatmapLayout}>
          {/* map */}
          <div className={styles.mapWrapper}>
            <KoreaProvinceMap
              data={regionalData}
              filter={statusFilter}
              onRegionClick={handleRegionClick}
            />
          </div>

          {/* region ranking list */}
          <div className={styles.regionList}>
            <div className={styles.regionListHeader}>
              <span>지역</span>
              <span style={{ gridColumn: "2 / 4" }}>달성률</span>
              <span>매출 / 목표</span>
            </div>

            {filteredRegions.length === 0 ? (
              <p className={styles.emptyMsg}>해당 상태의 지역이 없습니다.</p>
            ) : filteredRegions.map(region => {
              const color = getHeatColor(region.progress);
              return (
                <div key={region.name} className={styles.regionRow}>
                  <div className={styles.regionName}>
                    <span className={styles.regionDot} style={{ background: color }} />
                    {region.name}
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
                    ₩{region.revenue.toLocaleString()}
                    <span className={styles.targetText}> / {region.target.toLocaleString()}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Region Drilldown Modal ── */}
      {drilldownGeo && (
        <RegionDrilldown
          geoName={drilldownGeo}
          regionData={drilldownData}
          onClose={() => { setDrilldownGeo(null); setDrilldownData(null); }}
        />
      )}

          {/* ── Advanced Analytics (Bottom) ── */}
          <div className={styles.chartsGrid}>
            <RevenuePacingChart />
            <DealAgingChart />
          </div>

        </div>
      </div>
    </div >
  );
}

// ── Pipeline Funnel (replaces RadarChart) ─────────────────────────────────────
function PipelineFunnel({ data }: { data: { stage: string; value: number; fullMark: number }[] }) {
  const max = data[0]?.value ?? 1;
  const STAGE_KR: Record<string, string> = {
    Lead: "리드", Meeting: "미팅", Proposal: "제안", Negotiation: "협상", Contract: "계약",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", padding: "0.25rem 0" }}>
      {data.map((d, i) => {
        const prev = data[i - 1];
        const dropPct = prev ? Math.round((1 - d.value / prev.value) * 100) : null;
        const isBottleneck = dropPct !== null && dropPct >= 40;
        const barW = (d.value / max) * 100;

        return (
          <div key={d.stage}>
            {dropPct !== null && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 0 5px 100px",
                fontSize: "0.61rem", fontWeight: 700, letterSpacing: "0.02em",
                color: isBottleneck ? "#ef4444" : "rgba(255,255,255,0.18)",
              }}>
                <span>↓</span>
                <span>{dropPct}% drop-off</span>
                {isBottleneck && (
                  <span style={{
                    background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.28)",
                    borderRadius: 4, padding: "1px 7px", color: "#f87171",
                    fontSize: "0.58rem", textTransform: "uppercase" as const, letterSpacing: "0.04em",
                  }}>BOTTLENECK</span>
                )}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 90, flexShrink: 0, textAlign: "right" as const,
                fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)",
              }}>
                {STAGE_KR[d.stage] ?? d.stage}
              </div>
              <div style={{ flex: 1, height: 28, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{
                  width: `${barW}%`, height: "100%", borderRadius: 5,
                  background: isBottleneck
                    ? "linear-gradient(90deg,#b91c1c,#ef4444)"
                    : i === 0
                      ? "linear-gradient(90deg,#4338ca,#6366f1)"
                      : "linear-gradient(90deg,#6366f1,#818cf8)",
                  transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                  display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10,
                }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>
                    {d.value}건
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: "0.625rem", padding: "0.5rem 0.75rem",
        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
        borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#f87171" }}>⚠️ Negotiation 단계 최대 병목</span>
        <span style={{ fontSize: "0.67rem", color: "rgba(255,255,255,0.35)" }}>전환율 44% — 목표 대비 26%p 부족</span>
      </div>
    </div>
  );
}
