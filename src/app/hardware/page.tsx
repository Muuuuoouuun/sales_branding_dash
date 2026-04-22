"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  CheckCircle2,
  Clock,
  Crown,
  Loader2,
  MapPin,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Card from "@/components/Card";
import { formatRevenue } from "@/lib/formatCurrency";
import styles from "./page.module.css";

// ─── Types ────────────────────────────────────────────────────────

interface HardwareDeal {
  id: string;
  account: string;
  manager: string;
  region: string;
  type: string;
  status: string;
  version: string;
  amount: number;
  firstPayment: string | null;
  probability: number;
  importance: string;
  remark: string;
  isConfirmed: boolean;
}

interface ManagerStat {
  pipeline: number;
  confirmed: number;
  count: number;
  confirmedCount: number;
}

interface RegionStat {
  pipeline: number;
  confirmed: number;
  count: number;
}

interface HardwarePipelinePayload {
  deals: HardwareDeal[];
  totalPipeline: number;
  confirmedRevenue: number;
  activeCount: number;
  confirmedCount: number;
  avgDealSize: number;
  winRate: number;
  byManager: Record<string, ManagerStat>;
  byRegion: Record<string, RegionStat>;
}

// ─── Tab type ─────────────────────────────────────────────────────

type Tab = "deals" | "manager" | "region";
type InsightTone = "good" | "watch" | "risk" | "neutral";

interface ManagerInsight {
  name: string;
  stat: ManagerStat;
  deals: HardwareDeal[];
  confirmedRate: number;
  valueConversion: number;
  openPipeline: number;
  weightedPipeline: number;
  riskCount: number;
  riskValue: number;
  topDeal: HardwareDeal | null;
  mainRegion: string;
  tone: InsightTone;
  nextMove: string;
  priorityScore: number;
  priorityLabel: string;
  priorityReasons: string[];
  reviewFocus: string;
  coachPrompt: string;
  proofPoint: string;
}

interface RegionInsight {
  region: string;
  stat: RegionStat;
  deals: HardwareDeal[];
  confirmedRate: number;
  valueConversion: number;
  openPipeline: number;
  weightedPipeline: number;
  riskCount: number;
  riskValue: number;
  kaCount: number;
  managerCount: number;
  leadingManager: string;
  topDeal: HardwareDeal | null;
  productMix: string;
  tone: InsightTone;
  nextMove: string;
  priorityScore: number;
  priorityLabel: string;
  priorityReasons: string[];
  reviewFocus: string;
  coachPrompt: string;
  proofPoint: string;
}

interface SpotlightItem {
  id: string;
  label: string;
  title: string;
  value: string;
  detail: string;
  tone: InsightTone;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Get initials (up to 2 chars) from a name string */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Clamp a value between 0–100 for progress bars */
function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function safePercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(toPercent(value, total));
}

function isRiskDeal(deal: HardwareDeal): boolean {
  return !deal.isConfirmed && deal.probability < 60;
}

function getTopDeal(deals: HardwareDeal[]): HardwareDeal | null {
  if (deals.length === 0) return null;
  return deals.reduce((best, deal) => (deal.amount > best.amount ? deal : best));
}

function getWeightedPipeline(deals: HardwareDeal[]): number {
  return deals.reduce((sum, deal) => {
    const multiplier = deal.isConfirmed ? 1 : deal.probability / 100;
    return sum + Math.round(deal.amount * multiplier);
  }, 0);
}

function getTopValueLabel(
  deals: HardwareDeal[],
  key: "manager" | "region" | "type" | "version",
): string {
  const totals = new Map<string, number>();

  for (const deal of deals) {
    const label = deal[key]?.trim() || "미지정";
    totals.set(label, (totals.get(label) ?? 0) + deal.amount);
  }

  return (
    [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    "미지정"
  );
}

function getTone(valueConversion: number, riskCount: number): InsightTone {
  if (riskCount > 0 || valueConversion < 35) return "risk";
  if (valueConversion < 70) return "watch";
  return "good";
}

function getToneLabel(tone: InsightTone): string {
  if (tone === "good") return "안정";
  if (tone === "watch") return "주시";
  if (tone === "risk") return "개입";
  return "중립";
}

function getPriorityLabel(score: number): string {
  if (score >= 75) return "즉시 개입";
  if (score >= 55) return "이번 주 코칭";
  if (score >= 35) return "주시";
  return "유지";
}

function getPriorityScore(input: {
  openPipeline: number;
  riskValue: number;
  riskCount: number;
  valueConversion: number;
  count: number;
  totalPipeline: number;
  kaCount?: number;
  managerCount?: number;
}): number {
  const openShare = input.totalPipeline > 0 ? input.openPipeline / input.totalPipeline : 0;
  const riskShare = input.totalPipeline > 0 ? input.riskValue / input.totalPipeline : 0;
  const score =
    openShare * 34 +
    riskShare * 32 +
    input.riskCount * 10 +
    (input.valueConversion < 35 ? 18 : input.valueConversion < 65 ? 9 : 0) +
    Math.min(input.count * 1.5, 8) +
    Math.min((input.kaCount ?? 0) * 4, 10) +
    Math.min(Math.max((input.managerCount ?? 1) - 1, 0) * 2, 6);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildPriorityReasons(input: {
  topDeal: HardwareDeal | null;
  openPipeline: number;
  riskValue: number;
  riskCount: number;
  valueConversion: number;
  kaCount?: number;
  managerCount?: number;
}): string[] {
  const reasons: string[] = [];

  if (input.riskCount > 0) {
    reasons.push(`저확률 리스크 ${input.riskCount}건 · ${formatRevenue(input.riskValue)}`);
  }

  if (input.openPipeline > 0) {
    reasons.push(`미확정 파이프라인 ${formatRevenue(input.openPipeline)}`);
  }

  if (input.valueConversion < 65) {
    reasons.push(`금액 전환율 ${input.valueConversion}%로 보강 필요`);
  }

  if ((input.kaCount ?? 0) > 0) {
    reasons.push(`KA ${input.kaCount}건 포함`);
  }

  if ((input.managerCount ?? 1) > 1) {
    reasons.push(`${input.managerCount}명 관여로 역할 정렬 필요`);
  }

  if (input.topDeal) {
    reasons.push(`최대 딜 ${input.topDeal.account}`);
  }

  return reasons.slice(0, 3);
}

function buildManagerOperatingPanel(input: {
  topDeal: HardwareDeal | null;
  riskCount: number;
  openPipeline: number;
  valueConversion: number;
  mainRegion: string;
}): Pick<ManagerInsight, "reviewFocus" | "coachPrompt" | "proofPoint"> {
  if (input.riskCount > 0) {
    return {
      reviewFocus: "Risk recovery",
      coachPrompt: "60% 미만 딜의 의사결정자, 다음 회의, 복구 조건을 한 번에 확인하세요.",
      proofPoint: "리스크 딜별 다음 미팅 날짜와 고객 측 액션 오너",
    };
  }

  if (input.openPipeline > 0 && input.valueConversion < 70) {
    return {
      reviewFocus: "Conversion lift",
      coachPrompt: "미확정 금액이 확정으로 넘어가기 위해 빠진 조건을 딜별로 1개씩만 좁히세요.",
      proofPoint: `${input.topDeal?.account ?? input.mainRegion}의 결제 조건 또는 구매 프로세스 증거`,
    };
  }

  return {
    reviewFocus: "Scale the motion",
    coachPrompt: "이미 작동하는 지역/제품 조합을 다른 딜에 복제할 수 있게 스크립트화하세요.",
    proofPoint: `${input.mainRegion}에서 반복 가능한 제안 문장과 확정 조건`,
  };
}

function buildRegionOperatingPanel(input: {
  topDeal: HardwareDeal | null;
  riskCount: number;
  managerCount: number;
  valueConversion: number;
  kaCount: number;
  productMix: string;
}): Pick<RegionInsight, "reviewFocus" | "coachPrompt" | "proofPoint"> {
  if (input.riskCount > 0) {
    return {
      reviewFocus: "Regional risk lock",
      coachPrompt: "지역 단위로 리스크 딜을 묶고, 매니저별 복구 액션이 겹치지 않게 정렬하세요.",
      proofPoint: "리스크 딜별 확률 하락 사유와 고객 측 재확인 일정",
    };
  }

  if (input.managerCount > 1 && input.valueConversion < 70) {
    return {
      reviewFocus: "Handoff cleanup",
      coachPrompt: "여러 매니저가 관여한 지역은 조건, 담당자, 다음 액션을 하나의 기준으로 맞추세요.",
      proofPoint: "공통 가격/조건 기준과 매니저별 담당 계정 리스트",
    };
  }

  if (input.kaCount > 0) {
    return {
      reviewFocus: "KA expansion",
      coachPrompt: "KA 딜에서 확인된 제품 조합을 같은 지역의 인접 계정으로 확장하세요.",
      proofPoint: `${input.productMix} 기반 KA 레퍼런스와 인접 계정 후보`,
    };
  }

  return {
    reviewFocus: "Coverage build",
    coachPrompt: "현재 리딩 제품과 최대 딜을 기준으로 다음 분기 커버리지 공백을 먼저 채우세요.",
    proofPoint: `${input.topDeal?.account ?? input.productMix} 이후의 신규 접점 후보`,
  };
}

function buildManagerMove(
  topDeal: HardwareDeal | null,
  riskCount: number,
  openPipeline: number,
  valueConversion: number,
): string {
  if (riskCount > 0) {
    return `확률 60% 미만 딜 ${riskCount}건의 다음 미팅과 의사결정자를 먼저 확인하세요.`;
  }

  if (openPipeline > 0 && topDeal) {
    return `${topDeal.account}의 1차 결제일과 확정 조건을 잠그면 전환율을 ${Math.max(valueConversion, 1)}%에서 끌어올릴 수 있습니다.`;
  }

  return "확정 딜의 납품, 설치, 후속 확장 기회를 체크해 매출 누수를 막으세요.";
}

function buildRegionMove(
  topDeal: HardwareDeal | null,
  riskCount: number,
  managerCount: number,
  valueConversion: number,
): string {
  if (riskCount > 0) {
    return `리스크 딜 ${riskCount}건을 지역 리뷰 안건으로 올리고 매니저별 복구 액션을 지정하세요.`;
  }

  if (managerCount > 1 && valueConversion < 70) {
    return "담당 매니저가 나뉜 지역입니다. 조건, 납기, 경쟁 상황을 한 번에 맞추는 합동 리뷰가 필요합니다.";
  }

  if (topDeal) {
    return `${topDeal.account}를 기준 딜로 삼아 같은 지역의 유사 계정에 제안 패턴을 복제하세요.`;
  }

  return "지역별 리드 소스를 보강하고 다음 분기 커버리지 후보를 추가하세요.";
}

// ─── Component ────────────────────────────────────────────────────

export default function HardwarePipelinePage() {
  const [data, setData] = useState<HardwarePipelinePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("deals");
  const [query, setQuery] = useState("");

  // ── Data fetch ──────────────────────────────────────────────────

  const fetchData = useCallback(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/hardware/pipeline", {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`서버 오류 (${res.status})`);
        }

        const json = (await res.json()) as HardwarePipelinePayload & {
          fallback?: boolean;
        };

        if (active) {
          setData(json);
          setIsFallback(json.fallback === true);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Failed to load hardware pipeline:", err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "데이터를 불러오지 못했습니다."
          );
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

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, [fetchData]);

  // ── Filtered deals ──────────────────────────────────────────────

  const filteredDeals = useMemo<HardwareDeal[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const sorted = [...data.deals].sort((a, b) => b.amount - a.amount);
    if (!q) return sorted;
    return sorted.filter(
      (d) =>
        d.account.toLowerCase().includes(q) ||
        d.manager.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q)
    );
  }, [data, query]);

  // ── Sorted regions ──────────────────────────────────────────────

  const sortedRegions = useMemo<Array<[string, RegionStat]>>(() => {
    if (!data) return [];
    return Object.entries(data.byRegion).sort(
      ([, a], [, b]) => b.pipeline - a.pipeline
    );
  }, [data]);

  // ── Sorted managers ─────────────────────────────────────────────

  const sortedManagers = useMemo<Array<[string, ManagerStat]>>(() => {
    if (!data) return [];
    return Object.entries(data.byManager).sort(
      ([, a], [, b]) => b.pipeline - a.pipeline
    );
  }, [data]);

  const managerInsights = useMemo<ManagerInsight[]>(() => {
    if (!data) return [];

    return sortedManagers.map(([name, stat]) => {
      const managerDeals = data.deals.filter((deal) => deal.manager === name);
      const riskDeals = managerDeals.filter(isRiskDeal);
      const openPipeline = Math.max(stat.pipeline - stat.confirmed, 0);
      const valueConversion = safePercent(stat.confirmed, stat.pipeline);
      const topDeal = getTopDeal(managerDeals);
      const riskValue = riskDeals.reduce((sum, deal) => sum + deal.amount, 0);
      const tone = getTone(valueConversion, riskDeals.length);
      const mainRegion = getTopValueLabel(managerDeals, "region");
      const priorityScore = getPriorityScore({
        openPipeline,
        riskValue,
        riskCount: riskDeals.length,
        valueConversion,
        count: stat.count,
        totalPipeline: data.totalPipeline,
      });
      const operatingPanel = buildManagerOperatingPanel({
        topDeal,
        riskCount: riskDeals.length,
        openPipeline,
        valueConversion,
        mainRegion,
      });

      return {
        name,
        stat,
        deals: managerDeals,
        confirmedRate: safePercent(stat.confirmedCount, stat.count),
        valueConversion,
        openPipeline,
        weightedPipeline: getWeightedPipeline(managerDeals),
        riskCount: riskDeals.length,
        riskValue,
        topDeal,
        mainRegion,
        tone,
        nextMove: buildManagerMove(topDeal, riskDeals.length, openPipeline, valueConversion),
        priorityScore,
        priorityLabel: getPriorityLabel(priorityScore),
        priorityReasons: buildPriorityReasons({
          topDeal,
          openPipeline,
          riskValue,
          riskCount: riskDeals.length,
          valueConversion,
        }),
        ...operatingPanel,
      };
    });
  }, [data, sortedManagers]);

  const regionInsights = useMemo<RegionInsight[]>(() => {
    if (!data) return [];

    return sortedRegions.map(([region, stat]) => {
      const regionDeals = data.deals.filter((deal) => deal.region === region);
      const riskDeals = regionDeals.filter(isRiskDeal);
      const managers = new Set(regionDeals.map((deal) => deal.manager).filter(Boolean));
      const openPipeline = Math.max(stat.pipeline - stat.confirmed, 0);
      const valueConversion = safePercent(stat.confirmed, stat.pipeline);
      const topDeal = getTopDeal(regionDeals);
      const riskValue = riskDeals.reduce((sum, deal) => sum + deal.amount, 0);
      const tone = getTone(valueConversion, riskDeals.length);
      const kaCount = regionDeals.filter((deal) => deal.importance === "KA").length;
      const productMix = getTopValueLabel(regionDeals, "type");
      const priorityScore = getPriorityScore({
        openPipeline,
        riskValue,
        riskCount: riskDeals.length,
        valueConversion,
        count: stat.count,
        totalPipeline: data.totalPipeline,
        kaCount,
        managerCount: managers.size,
      });
      const operatingPanel = buildRegionOperatingPanel({
        topDeal,
        riskCount: riskDeals.length,
        managerCount: managers.size,
        valueConversion,
        kaCount,
        productMix,
      });

      return {
        region,
        stat,
        deals: regionDeals,
        confirmedRate: safePercent(
          regionDeals.filter((deal) => deal.isConfirmed).length,
          stat.count
        ),
        valueConversion,
        openPipeline,
        weightedPipeline: getWeightedPipeline(regionDeals),
        riskCount: riskDeals.length,
        riskValue,
        kaCount,
        managerCount: managers.size,
        leadingManager: getTopValueLabel(regionDeals, "manager"),
        topDeal,
        productMix,
        tone,
        nextMove: buildRegionMove(topDeal, riskDeals.length, managers.size, valueConversion),
        priorityScore,
        priorityLabel: getPriorityLabel(priorityScore),
        priorityReasons: buildPriorityReasons({
          topDeal,
          openPipeline,
          riskValue,
          riskCount: riskDeals.length,
          valueConversion,
          kaCount,
          managerCount: managers.size,
        }),
        ...operatingPanel,
      };
    });
  }, [data, sortedRegions]);

  const managerSpotlights = useMemo<SpotlightItem[]>(() => {
    if (managerInsights.length === 0) return [];

    const topPipeline = managerInsights[0];
    const bestConversion = [...managerInsights].sort(
      (left, right) =>
        right.valueConversion - left.valueConversion ||
        right.stat.confirmed - left.stat.confirmed
    )[0];
    const riskOwner = [...managerInsights].sort(
      (left, right) =>
        right.riskValue - left.riskValue ||
        right.openPipeline - left.openPipeline
    )[0];

    return [
      {
        id: "top-pipeline",
        label: "파이프라인 리더",
        title: topPipeline.name,
        value: formatRevenue(topPipeline.stat.pipeline),
        detail: `${topPipeline.stat.count}건 · 주력 지역 ${topPipeline.mainRegion}`,
        tone: "neutral",
      },
      {
        id: "best-conversion",
        label: "전환율 베스트",
        title: bestConversion.name,
        value: `${bestConversion.valueConversion}%`,
        detail: `확정 ${formatRevenue(bestConversion.stat.confirmed)} · ${bestConversion.confirmedRate}% 딜 확정`,
        tone: bestConversion.tone,
      },
      {
        id: "risk-owner",
        label: "개입 필요",
        title: riskOwner.name,
        value: `${riskOwner.riskCount}건`,
        detail: `오픈 ${formatRevenue(riskOwner.openPipeline)} · 리스크 ${formatRevenue(riskOwner.riskValue)}`,
        tone: riskOwner.riskCount > 0 ? "risk" : "watch",
      },
    ];
  }, [managerInsights]);

  const regionSpotlights = useMemo<SpotlightItem[]>(() => {
    if (regionInsights.length === 0) return [];

    const topRegion = regionInsights[0];
    const bestConversion = [...regionInsights].sort(
      (left, right) =>
        right.valueConversion - left.valueConversion ||
        right.stat.confirmed - left.stat.confirmed
    )[0];
    const riskRegion = [...regionInsights].sort(
      (left, right) =>
        right.riskValue - left.riskValue ||
        right.openPipeline - left.openPipeline
    )[0];

    return [
      {
        id: "top-region",
        label: "최대 지역",
        title: topRegion.region,
        value: formatRevenue(topRegion.stat.pipeline),
        detail: `${topRegion.stat.count}건 · 리딩 매니저 ${topRegion.leadingManager}`,
        tone: "neutral",
      },
      {
        id: "best-region",
        label: "확정력 베스트",
        title: bestConversion.region,
        value: `${bestConversion.valueConversion}%`,
        detail: `확정 ${formatRevenue(bestConversion.stat.confirmed)} · KA ${bestConversion.kaCount}건`,
        tone: bestConversion.tone,
      },
      {
        id: "regional-risk",
        label: "지역 리스크",
        title: riskRegion.region,
        value: `${riskRegion.riskCount}건`,
        detail: `오픈 ${formatRevenue(riskRegion.openPipeline)} · ${riskRegion.managerCount}명 관여`,
        tone: riskRegion.riskCount > 0 ? "risk" : "watch",
      },
    ];
  }, [regionInsights]);

  const managerPriorityQueue = useMemo(() => {
    return [...managerInsights]
      .sort(
        (left, right) =>
          right.priorityScore - left.priorityScore ||
          right.openPipeline - left.openPipeline
      )
      .slice(0, 3);
  }, [managerInsights]);

  const regionPriorityQueue = useMemo(() => {
    return [...regionInsights]
      .sort(
        (left, right) =>
          right.priorityScore - left.priorityScore ||
          right.openPipeline - left.openPipeline
      )
      .slice(0, 3);
  }, [regionInsights]);

  // ── Loading state ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <Loader2 size={28} className={styles.spin} />
        <span>하드웨어 데이터 불러오는 중...</span>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          <Box size={16} />
          {error ?? "데이터를 불러오지 못했습니다."}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.kicker}>
            <Box size={11} />
            Hardware Pipeline
          </div>
          <h1 className={styles.title}>하드웨어 파이프라인</h1>
          <p className={styles.subtitle}>
            하드웨어 딜 추적, 매니저별 실적, 지역 커버리지 한눈에
          </p>
        </div>

        <div className={styles.headerMeta}>
          {isFallback ? (
            <span className={styles.fallbackBadge}>
              <Clock size={12} />
              폴백 데이터
            </span>
          ) : (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              라이브
            </span>
          )}
        </div>
      </header>

      {/* ── Metric Cards ── */}
      <div className={styles.metricGrid}>
        {/* 총 파이프라인 */}
        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>총 파이프라인</span>
            <span className={styles.metricIcon}>
              <TrendingUp size={16} />
            </span>
          </div>
          <div className={styles.metricValue}>
            {formatRevenue(data.totalPipeline)}
          </div>
          <div className={styles.metricSub}>
            평균 딜 크기 {formatRevenue(data.avgDealSize)}
          </div>
        </Card>

        {/* 확정 매출 */}
        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>확정 매출</span>
            <span className={`${styles.metricIcon} ${styles.metricIconAccent}`}>
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className={styles.metricValue}>
            {formatRevenue(data.confirmedRevenue)}
          </div>
          <div className={styles.metricSub}>
            확정 딜 {data.confirmedCount}건
          </div>
        </Card>

        {/* 진행 중 딜 */}
        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>진행 중 딜</span>
            <span className={`${styles.metricIcon} ${styles.metricIconWarn}`}>
              <Clock size={16} />
            </span>
          </div>
          <div className={styles.metricValue}>{data.activeCount}건</div>
          <div className={styles.metricSub}>
            전체 {data.deals.length}건 중
          </div>
        </Card>

        {/* 승률 */}
        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>승률</span>
            <span className={styles.metricIcon}>
              <Target size={16} />
            </span>
          </div>
          <div className={styles.metricValue}>{data.winRate}%</div>
          <div className={styles.metricSub}>확정 / 전체 딜 기준</div>
        </Card>
      </div>

      {/* ── Tab Bar ── */}
      <nav className={styles.tabBar} aria-label="파이프라인 탭">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "deals" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("deals")}
        >
          <Box size={14} />
          딜 목록
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "manager" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("manager")}
        >
          <Users size={14} />
          매니저별
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "region" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("region")}
        >
          <MapPin size={14} />
          지역별
        </button>
      </nav>

      {/* ── Tab: 딜 목록 ── */}
      {activeTab === "deals" && (
        <section>
          {/* Search */}
          <div className={styles.toolRow}>
            <label className={styles.searchBar}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="계정명, 담당자, 지역으로 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {query && (
              <span className={styles.resultCount}>
                {filteredDeals.length}건
              </span>
            )}
          </div>

          {filteredDeals.length === 0 ? (
            <div className={styles.emptyState}>
              <Box size={32} className={styles.emptyStateIcon} />
              <span>하드웨어 딜 없음</span>
              {query && (
                <span>&quot;{query}&quot;에 해당하는 딜을 찾을 수 없습니다.</span>
              )}
            </div>
          ) : (
            <div className={styles.tableWrap}>
            <div className={styles.table} role="table" aria-label="딜 목록">
              {/* Table head */}
              <div className={styles.tableHead} role="row">
                <div className={styles.tableHeadCell} role="columnheader">계정명</div>
                <div className={styles.tableHeadCell} role="columnheader">매니저</div>
                <div className={styles.tableHeadCell} role="columnheader">지역</div>
                <div className={styles.tableHeadCell} role="columnheader">금액</div>
                <div className={styles.tableHeadCell} role="columnheader">확률</div>
                <div className={styles.tableHeadCell} role="columnheader">상태</div>
                <div className={styles.tableHeadCell} role="columnheader">확정일</div>
              </div>

              {/* Table rows */}
              <div className={styles.tableBody}>
                {filteredDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className={styles.tableRow}
                    role="row"
                  >
                    {/* 계정명 */}
                    <div className={`${styles.tableCell} ${styles.accountName}`} role="cell">
                      {deal.importance === "KA" && (
                        <Crown size={13} className={styles.kaIcon} aria-label="Key Account" />
                      )}
                      <span className={styles.accountNameText} title={deal.account}>
                        {deal.account}
                      </span>
                    </div>

                    {/* 매니저 */}
                    <div
                      className={`${styles.tableCell} ${styles.tableCellMuted}`}
                      role="cell"
                      title={deal.manager}
                    >
                      {deal.manager}
                    </div>

                    {/* 지역 */}
                    <div
                      className={`${styles.tableCell} ${styles.tableCellMuted}`}
                      role="cell"
                    >
                      {deal.region}
                    </div>

                    {/* 금액 */}
                    <div
                      className={`${styles.tableCell} ${styles.amountCell}`}
                      role="cell"
                    >
                      {formatRevenue(deal.amount)}
                    </div>

                    {/* 확률 */}
                    <div
                      className={`${styles.tableCell} ${styles.tableCellMuted}`}
                      role="cell"
                    >
                      {deal.probability}%
                    </div>

                    {/* 상태 */}
                    <div className={styles.tableCell} role="cell">
                      <span
                        className={`${styles.badge} ${styles.badgeNeutral}`}
                        title={deal.status}
                      >
                        {deal.status}
                      </span>
                    </div>

                    {/* 확정일 */}
                    <div className={styles.tableCell} role="cell">
                      {deal.firstPayment ? (
                        <span className={`${styles.badge} ${styles.badgeGood}`}>
                          <CheckCircle2 size={10} />
                          확정
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                          <Clock size={10} />
                          진행
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}
        </section>
      )}

      {/* ── Tab: 매니저별 ── */}
      {activeTab === "manager" && (
        <section className={styles.tabSection}>
          {sortedManagers.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={32} className={styles.emptyStateIcon} />
              <span>매니저 데이터 없음</span>
            </div>
          ) : (
            <>
              <div className={styles.tabHeader}>
                <div>
                  <span className={styles.sectionKicker}>Manager command center</span>
                  <h2 className={styles.sectionTitle}>매니저별 파이프라인 운영판</h2>
                  <p className={styles.sectionSubtitle}>
                    누가 가장 큰 금액을 들고 있는지, 어디에 개입이 필요한지, 다음 리뷰에서 바로 확인할 수 있게 정리했습니다.
                  </p>
                </div>
                <span className={styles.sectionBadge}>{managerInsights.length}명</span>
              </div>

              <div className={styles.spotlightGrid}>
                {managerSpotlights.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.spotlightCard} ${styles[`toneBorder_${item.tone}`]}`}
                  >
                    <span className={styles.spotlightLabel}>{item.label}</span>
                    <div className={styles.spotlightTitle}>{item.title}</div>
                    <div className={styles.spotlightValue}>{item.value}</div>
                    <p className={styles.spotlightDetail}>{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className={styles.priorityQueue}>
                <div className={styles.priorityQueueHeader}>
                  <div>
                    <span className={styles.priorityQueueEyebrow}>Intervention queue</span>
                    <h3 className={styles.priorityQueueTitle}>매니저 우선순위 Top 3</h3>
                  </div>
                  <span className={styles.priorityQueueMeta}>score / 100</span>
                </div>
                <div className={styles.priorityQueueList}>
                  {managerPriorityQueue.map((insight, index) => (
                    <div
                      key={insight.name}
                      className={`${styles.priorityQueueItem} ${styles[`toneBorder_${insight.tone}`]}`}
                    >
                      <span className={styles.priorityRank}>{index + 1}</span>
                      <div className={styles.priorityBody}>
                        <div className={styles.priorityNameRow}>
                          <strong className={styles.priorityName}>{insight.name}</strong>
                          <span className={styles.priorityScore}>{insight.priorityScore}</span>
                        </div>
                        <span className={styles.priorityMeta}>{insight.priorityLabel}</span>
                        <ul className={styles.priorityReasons}>
                          {insight.priorityReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.managerGrid}>
                {managerInsights.map((insight) => {
                  const fillPct = insight.valueConversion;
                  return (
                    <div key={insight.name} className={styles.managerCard}>
                      <div className={styles.managerHeader}>
                        <div className={styles.managerAvatar} aria-hidden>
                          {getInitials(insight.name)}
                        </div>
                        <span className={styles.managerName} title={insight.name}>
                          {insight.name}
                        </span>
                        <span
                          className={`${styles.statusPill} ${styles[`tone_${insight.tone}`]}`}
                        >
                          {getToneLabel(insight.tone)}
                        </span>
                      </div>

                      <div className={styles.managerStats}>
                        <div className={styles.managerStat}>
                          <span className={styles.managerStatLabel}>파이프라인</span>
                          <span className={styles.managerStatValue}>
                            {formatRevenue(insight.stat.pipeline)}
                          </span>
                        </div>
                        <div className={styles.managerStat}>
                          <span className={styles.managerStatLabel}>확정 매출</span>
                          <span
                            className={`${styles.managerStatValue} ${styles.managerStatValueAccent}`}
                          >
                            {formatRevenue(insight.stat.confirmed)}
                          </span>
                        </div>
                        <div className={styles.managerStat}>
                          <span className={styles.managerStatLabel}>오픈 금액</span>
                          <span className={styles.managerStatValue}>
                            {formatRevenue(insight.openPipeline)}
                          </span>
                        </div>
                        <div className={styles.managerStat}>
                          <span className={styles.managerStatLabel}>가중 파이프</span>
                          <span className={styles.managerStatValue}>
                            {formatRevenue(insight.weightedPipeline)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${fillPct}%` }}
                          role="progressbar"
                          aria-valuenow={fillPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`금액 전환율 ${fillPct}%`}
                        />
                      </div>
                      <div className={styles.progressLabel}>
                        <span>금액 전환율</span>
                        <span className={styles.progressLabelAccent}>{fillPct}%</span>
                      </div>

                      <div className={styles.focusList}>
                        <div className={styles.focusItem}>
                          <span>대표 딜</span>
                          <strong>{insight.topDeal?.account ?? "없음"}</strong>
                          <em>{insight.topDeal ? formatRevenue(insight.topDeal.amount) : "-"}</em>
                        </div>
                        <div className={styles.focusItem}>
                          <span>주력 지역</span>
                          <strong>{insight.mainRegion}</strong>
                          <em>{insight.stat.count}건 · 확정 {insight.confirmedRate}%</em>
                        </div>
                        <div className={styles.focusItem}>
                          <span>리스크</span>
                          <strong>{insight.riskCount}건</strong>
                          <em>{formatRevenue(insight.riskValue)}</em>
                        </div>
                        <div className={styles.focusItem}>
                          <span>우선순위</span>
                          <strong>{insight.priorityScore}/100</strong>
                          <em>{insight.priorityLabel}</em>
                        </div>
                      </div>

                      <div className={styles.operatingPanel}>
                        <div>
                          <span>Review focus</span>
                          <strong>{insight.reviewFocus}</strong>
                        </div>
                        <div>
                          <span>Coach prompt</span>
                          <p>{insight.coachPrompt}</p>
                        </div>
                        <div>
                          <span>Proof point</span>
                          <p>{insight.proofPoint}</p>
                        </div>
                      </div>

                      <div className={`${styles.actionNote} ${styles[`toneBorder_${insight.tone}`]}`}>
                        {insight.nextMove}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Tab: 지역별 ── */}
      {activeTab === "region" && (
        <section className={styles.tabSection}>
          {sortedRegions.length === 0 ? (
            <div className={styles.emptyState}>
              <MapPin size={32} className={styles.emptyStateIcon} />
              <span>지역 데이터 없음</span>
            </div>
          ) : (
            <>
              <div className={styles.tabHeader}>
                <div>
                  <span className={styles.sectionKicker}>Regional coverage</span>
                  <h2 className={styles.sectionTitle}>지역별 커버리지와 회수 우선순위</h2>
                  <p className={styles.sectionSubtitle}>
                    지역별 오픈 금액, KA 분포, 리딩 매니저, 대표 딜을 묶어 현장 리뷰에서 바로 쓸 수 있게 만들었습니다.
                  </p>
                </div>
                <span className={styles.sectionBadge}>{regionInsights.length}개 지역</span>
              </div>

              <div className={styles.spotlightGrid}>
                {regionSpotlights.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.spotlightCard} ${styles[`toneBorder_${item.tone}`]}`}
                  >
                    <span className={styles.spotlightLabel}>{item.label}</span>
                    <div className={styles.spotlightTitle}>{item.title}</div>
                    <div className={styles.spotlightValue}>{item.value}</div>
                    <p className={styles.spotlightDetail}>{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className={styles.priorityQueue}>
                <div className={styles.priorityQueueHeader}>
                  <div>
                    <span className={styles.priorityQueueEyebrow}>Coverage queue</span>
                    <h3 className={styles.priorityQueueTitle}>지역 우선순위 Top 3</h3>
                  </div>
                  <span className={styles.priorityQueueMeta}>score / 100</span>
                </div>
                <div className={styles.priorityQueueList}>
                  {regionPriorityQueue.map((insight, index) => (
                    <div
                      key={insight.region}
                      className={`${styles.priorityQueueItem} ${styles[`toneBorder_${insight.tone}`]}`}
                    >
                      <span className={styles.priorityRank}>{index + 1}</span>
                      <div className={styles.priorityBody}>
                        <div className={styles.priorityNameRow}>
                          <strong className={styles.priorityName}>{insight.region}</strong>
                          <span className={styles.priorityScore}>{insight.priorityScore}</span>
                        </div>
                        <span className={styles.priorityMeta}>{insight.priorityLabel}</span>
                        <ul className={styles.priorityReasons}>
                          {insight.priorityReasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.regionGrid}>
                {regionInsights.map((insight) => (
                  <div key={insight.region} className={styles.regionCard}>
                    <div className={styles.regionCardHeader}>
                      <div>
                        <div className={styles.regionNameLarge}>
                          <MapPin size={14} aria-hidden />
                          {insight.region}
                        </div>
                        <div className={styles.regionMetaLine}>
                          리딩 매니저 {insight.leadingManager} · {insight.managerCount}명 관여
                        </div>
                      </div>
                      <span className={`${styles.statusPill} ${styles[`tone_${insight.tone}`]}`}>
                        {getToneLabel(insight.tone)}
                      </span>
                    </div>

                    <div className={styles.regionMetricGrid}>
                      <div>
                        <span>파이프라인</span>
                        <strong>{formatRevenue(insight.stat.pipeline)}</strong>
                      </div>
                      <div>
                        <span>확정</span>
                        <strong>{formatRevenue(insight.stat.confirmed)}</strong>
                      </div>
                      <div>
                        <span>오픈</span>
                        <strong>{formatRevenue(insight.openPipeline)}</strong>
                      </div>
                      <div>
                        <span>가중</span>
                        <strong>{formatRevenue(insight.weightedPipeline)}</strong>
                      </div>
                    </div>

                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${insight.valueConversion}%` }}
                        role="progressbar"
                        aria-valuenow={insight.valueConversion}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${insight.region} 금액 전환율 ${insight.valueConversion}%`}
                      />
                    </div>
                    <div className={styles.progressLabel}>
                      <span>금액 전환율</span>
                      <span className={styles.progressLabelAccent}>
                        {insight.valueConversion}%
                      </span>
                    </div>

                    <div className={styles.regionDetailGrid}>
                      <div className={styles.focusItem}>
                        <span>대표 딜</span>
                        <strong>{insight.topDeal?.account ?? "없음"}</strong>
                        <em>{insight.topDeal ? formatRevenue(insight.topDeal.amount) : "-"}</em>
                      </div>
                      <div className={styles.focusItem}>
                        <span>주요 유형</span>
                        <strong>{insight.productMix}</strong>
                        <em>KA {insight.kaCount}건 · 확정 {insight.confirmedRate}%</em>
                      </div>
                      <div className={styles.focusItem}>
                        <span>리스크</span>
                        <strong>{insight.riskCount}건</strong>
                        <em>{formatRevenue(insight.riskValue)}</em>
                      </div>
                      <div className={styles.focusItem}>
                        <span>우선순위</span>
                        <strong>{insight.priorityScore}/100</strong>
                        <em>{insight.priorityLabel}</em>
                      </div>
                    </div>

                    <div className={styles.operatingPanel}>
                      <div>
                        <span>Review focus</span>
                        <strong>{insight.reviewFocus}</strong>
                      </div>
                      <div>
                        <span>Coach prompt</span>
                        <p>{insight.coachPrompt}</p>
                      </div>
                      <div>
                        <span>Proof point</span>
                        <p>{insight.proofPoint}</p>
                      </div>
                    </div>

                    <div className={`${styles.actionNote} ${styles[`toneBorder_${insight.tone}`]}`}>
                      {insight.nextMove}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.regionTableWrap}>
                <div className={styles.regionTable} role="table" aria-label="지역별 상세 현황">
                  <div className={styles.regionHead} role="row">
                    <div className={styles.regionHeadCell} role="columnheader">지역명</div>
                    <div className={styles.regionHeadCell} role="columnheader">딜 수</div>
                    <div className={styles.regionHeadCell} role="columnheader">오픈 금액</div>
                    <div className={styles.regionHeadCell} role="columnheader">확정 금액</div>
                    <div className={styles.regionHeadCell} role="columnheader">리딩 매니저</div>
                  </div>

                  {regionInsights.map((insight) => (
                    <div key={insight.region} className={styles.regionRow} role="row">
                      <div className={styles.regionName} role="cell">
                        <MapPin size={13} aria-hidden />
                        {insight.region}
                      </div>
                      <div
                        className={`${styles.regionCell} ${styles.regionCellMuted}`}
                        role="cell"
                      >
                        {insight.stat.count}건
                      </div>
                      <div
                        className={`${styles.regionCell} ${styles.regionAmount}`}
                        role="cell"
                      >
                        {formatRevenue(insight.openPipeline)}
                      </div>
                      <div
                        className={`${styles.regionCell} ${styles.regionConfirmed}`}
                        role="cell"
                      >
                        {formatRevenue(insight.stat.confirmed)}
                      </div>
                      <div
                        className={`${styles.regionCell} ${styles.regionCellMuted}`}
                        role="cell"
                      >
                        {insight.leadingManager}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
