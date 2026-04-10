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
                <span>"{query}"에 해당하는 딜을 찾을 수 없습니다.</span>
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
        <section>
          {sortedManagers.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={32} className={styles.emptyStateIcon} />
              <span>매니저 데이터 없음</span>
            </div>
          ) : (
            <div className={styles.managerGrid}>
              {sortedManagers.map(([name, stat]) => {
                const fillPct = toPercent(stat.confirmed, stat.pipeline);
                return (
                  <div key={name} className={styles.managerCard}>
                    {/* Card header */}
                    <div className={styles.managerHeader}>
                      <div className={styles.managerAvatar} aria-hidden>
                        {getInitials(name)}
                      </div>
                      <span className={styles.managerName} title={name}>
                        {name}
                      </span>
                      <span className={styles.managerDealCount}>
                        {stat.count}건
                      </span>
                    </div>

                    {/* Stats grid */}
                    <div className={styles.managerStats}>
                      <div className={styles.managerStat}>
                        <span className={styles.managerStatLabel}>파이프라인</span>
                        <span className={styles.managerStatValue}>
                          {formatRevenue(stat.pipeline)}
                        </span>
                      </div>
                      <div className={styles.managerStat}>
                        <span className={styles.managerStatLabel}>확정 매출</span>
                        <span
                          className={`${styles.managerStatValue} ${styles.managerStatValueAccent}`}
                        >
                          {formatRevenue(stat.confirmed)}
                        </span>
                      </div>
                      <div className={styles.managerStat}>
                        <span className={styles.managerStatLabel}>전체 딜</span>
                        <span className={styles.managerStatValue}>
                          {stat.count}건
                        </span>
                      </div>
                      <div className={styles.managerStat}>
                        <span className={styles.managerStatLabel}>확정 딜</span>
                        <span className={styles.managerStatValue}>
                          {stat.confirmedCount}건
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${fillPct}%` }}
                        role="progressbar"
                        aria-valuenow={fillPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`확정 비율 ${fillPct.toFixed(0)}%`}
                      />
                    </div>
                    <div className={styles.progressLabel}>
                      <span>확정 비율</span>
                      <span className={styles.progressLabelAccent}>
                        {fillPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab: 지역별 ── */}
      {activeTab === "region" && (
        <section>
          {sortedRegions.length === 0 ? (
            <div className={styles.emptyState}>
              <MapPin size={32} className={styles.emptyStateIcon} />
              <span>지역 데이터 없음</span>
            </div>
          ) : (
            <div className={styles.regionTableWrap}>
            <div className={styles.regionTable} role="table" aria-label="지역별 현황">
              {/* Head */}
              <div className={styles.regionHead} role="row">
                <div className={styles.regionHeadCell} role="columnheader">지역명</div>
                <div className={styles.regionHeadCell} role="columnheader">딜 수</div>
                <div className={styles.regionHeadCell} role="columnheader">파이프라인 금액</div>
                <div className={styles.regionHeadCell} role="columnheader">확정 금액</div>
              </div>

              {/* Rows */}
              {sortedRegions.map(([region, stat]) => (
                <div key={region} className={styles.regionRow} role="row">
                  <div className={styles.regionName} role="cell">
                    <MapPin size={13} aria-hidden />
                    {region}
                  </div>
                  <div
                    className={`${styles.regionCell} ${styles.regionCellMuted}`}
                    role="cell"
                  >
                    {stat.count}건
                  </div>
                  <div
                    className={`${styles.regionCell} ${styles.regionAmount}`}
                    role="cell"
                  >
                    {formatRevenue(stat.pipeline)}
                  </div>
                  <div
                    className={`${styles.regionCell} ${styles.regionConfirmed}`}
                    role="cell"
                  >
                    {formatRevenue(stat.confirmed)}
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
