"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { formatRevenue } from "@/lib/formatCurrency";
import { getHeatColor, getStatusLabel } from "@/lib/heatUtils";
import type { FocusAccount, HotDeal, RegionData as DashboardRegionData } from "@/types/dashboard";
import type { RegionData } from "./KoreaProvinceMap";
import styles from "./RegionDrilldown.module.css";

const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>지도 불러오는 중…</div>,
});

const PROVINCE_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  서울: { center: [37.5665, 126.978], zoom: 11 },
  부산: { center: [35.1796, 129.0756], zoom: 11 },
  대구: { center: [35.8714, 128.6014], zoom: 11 },
  인천: { center: [37.4563, 126.7052], zoom: 10 },
  광주: { center: [35.1595, 126.8526], zoom: 11 },
  대전: { center: [36.3504, 127.3845], zoom: 11 },
  울산: { center: [35.5384, 129.3114], zoom: 11 },
  경기: { center: [37.4138, 127.5183], zoom: 9 },
  강원: { center: [37.8228, 128.1555], zoom: 8 },
  충청: { center: [36.6357, 127.4917], zoom: 8 },
  충남: { center: [36.5184, 126.8], zoom: 9 },
  충북: { center: [36.99, 127.93], zoom: 9 },
  전라: { center: [35.7167, 127.1442], zoom: 8 },
  전북: { center: [35.82, 127.15], zoom: 9 },
  전남: { center: [34.9, 126.99], zoom: 9 },
  경북: { center: [36.4919, 128.8889], zoom: 8 },
  경남: { center: [35.4606, 128.2132], zoom: 8 },
  세종: { center: [36.48, 127.29], zoom: 11 },
  제주: { center: [33.4996, 126.5312], zoom: 9 },
};

const DEFAULT_VIEW = { center: [36.5, 127.5] as [number, number], zoom: 8 };

interface Props {
  geoName: string;
  regionData: RegionData | null;
  accounts: FocusAccount[];
  hotDeals: HotDeal[];
  allRegions: DashboardRegionData[];
  periodLabel: string;
  onClose: () => void;
}

// ── 데이터 파생 유틸 ────────────────────────────────────────────
function deriveManagerStats(accounts: FocusAccount[]) {
  const map = new Map<string, { confirmed: number; pipeline: number; deals: number }>();
  for (const acc of accounts) {
    const entry = map.get(acc.manager) ?? { confirmed: 0, pipeline: 0, deals: 0 };
    entry.deals += 1;
    if (acc.firstPayment) {
      entry.confirmed += acc.amount;
    } else {
      entry.pipeline += Math.round(acc.amount * (acc.probability / 100));
    }
    map.set(acc.manager, entry);
  }
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.confirmed - a.confirmed);
}

function buildPriorityMoves(
  regionData: RegionData | null,
  confirmedAccounts: FocusAccount[],
  pipelineAccounts: FocusAccount[],
): string[] {
  if (!regionData) {
    return ["지역 데이터가 아직 없습니다. 소스 매핑을 먼저 확인하세요."];
  }

  const items: string[] = [];
  const gap = Math.max(regionData.target - regionData.revenue, 0);

  if (gap > 0) {
    items.push(`목표 달성까지 ${formatRevenue(gap)} 추가 확보 필요합니다.`);
  }

  if ((regionData.velocity ?? 0) < 50) {
    items.push("전환 속도가 낮습니다. 이번 주 안에 오픈 고객사를 첫 결제로 전환하는 데 집중하세요.");
  }

  const topPipeline = pipelineAccounts
    .filter((a) => a.probability >= 75)
    .sort((a, b) => b.amount - a.amount)[0];
  if (topPipeline) {
    items.push(`${topPipeline.name} (${formatRevenue(topPipeline.amount)}, ${topPipeline.probability}% 확률) — 가장 빠른 클로징 경로입니다.`);
  }

  if (confirmedAccounts.length === 0) {
    items.push("이 지역 확정 매출이 아직 없습니다. 첫 계약 확정에 우선순위를 두세요.");
  }

  if (items.length === 0) {
    items.push("현재 페이스가 목표를 초과하고 있습니다. 상위 고객사 유지 관리에 집중하세요.");
  }

  return items.slice(0, 3);
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function RegionDrilldown({
  geoName,
  regionData,
  accounts,
  hotDeals: _hotDeals,
  allRegions,
  periodLabel,
  onClose,
}: Props) {
  const regionName = regionData?.name ?? geoName;
  const view = PROVINCE_VIEW[regionName] ?? DEFAULT_VIEW;
  const color = regionData ? getHeatColor(regionData.progress) : "#6b7280";
  const status = regionData ? getStatusLabel(regionData.progress) : null;
  const progress = regionData?.progress ?? 0;

  const totalTeamRevenue = allRegions.reduce((s, r) => s + r.revenue, 0);
  const revenueShare =
    regionData && totalTeamRevenue > 0
      ? Math.round((regionData.revenue / totalTeamRevenue) * 100)
      : 0;
  const sortedRegions = [...allRegions].sort((a, b) => b.progress - a.progress);
  const rank = sortedRegions.findIndex((r) => r.name === regionName) + 1;

  const TrendIcon = progress >= 80 ? TrendingUp : progress >= 60 ? Minus : TrendingDown;

  const confirmedAccounts = accounts.filter((a) => Boolean(a.firstPayment));
  const pipelineAccounts = accounts
    .filter((a) => !a.firstPayment)
    .sort((a, b) => b.probability - a.probability || b.amount - a.amount);
  const managerStats = deriveManagerStats(accounts);
  const maxManagerConfirmed = Math.max(...managerStats.map((m) => m.confirmed), 1);
  const priorityMoves = buildPriorityMoves(regionData, confirmedAccounts, pipelineAccounts);

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal aria-label={regionName}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <div className={styles.header} style={{ borderLeftColor: color }}>
          <div className={styles.headerLeft}>
            <span className={styles.locationIcon} style={{ background: `${color}18`, color }}>
              <MapPin size={15} />
            </span>
            <div>
              <p className={styles.period}>{periodLabel}</p>
              <h2 className={styles.title}>{regionName}</h2>
              {status && (
                <div className={styles.statusChip} style={{ background: `${color}18`, color }}>
                  <TrendIcon size={11} />
                  {status} · {progress}% 달성
                </div>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {/* ── 사이드바 ── */}
          <aside className={styles.sidebar}>

            {/* 핵심 지표 */}
            <div className={styles.heroCard}>
              <div className={styles.heroTop}>
                <span className={styles.heroLabel}>팀 매출 비중</span>
                <span className={`${styles.heroValue} metricValue`} style={{ color }}>
                  {revenueShare}%
                </span>
              </div>
              <div className={styles.heroRow}>
                <span>확정 매출</span>
                <strong className="metricValue">{formatRevenue(regionData?.revenue ?? 0)}</strong>
              </div>
              <div className={styles.heroRow}>
                <span>목표</span>
                <strong className="metricValue">{formatRevenue(regionData?.target ?? 0)}</strong>
              </div>
              <div className={styles.heroRow}>
                <span>목표 대비 격차</span>
                <strong className="metricValue" style={{ color }}>
                  {progress >= 100
                    ? "달성 완료"
                    : formatRevenue(Math.max((regionData?.target ?? 0) - (regionData?.revenue ?? 0), 0))}
                </strong>
              </div>
              <div className={styles.heroRow}>
                <span>지역 순위</span>
                <strong className="metricValue">{rank > 0 ? `#${rank}` : "—"}</strong>
              </div>
            </div>

            {/* 활동 지표 */}
            <div className={styles.metricList}>
              <MetricTile label="전체 고객사" value={String(regionData?.deals_active ?? 0)} tone="neutral" />
              <MetricTile label="확정 고객사" value={String(regionData?.deals_closed ?? 0)} tone="success" />
              <MetricTile
                label="전환 속도"
                value={`${regionData?.velocity ?? 0}%`}
                tone={(regionData?.velocity ?? 0) >= 60 ? "success" : "warning"}
              />
              <MetricTile
                label="달성률"
                value={`${progress}%`}
                tone={progress >= 100 ? "success" : progress >= 75 ? "neutral" : "warning"}
              />
            </div>

            {/* 담당자별 현황 */}
            {managerStats.length > 0 && (
              <div className={styles.managerBlock}>
                <span className={styles.blockLabel}>담당자별 현황</span>
                {managerStats.map((mgr) => {
                  const barWidth = Math.round((mgr.confirmed / maxManagerConfirmed) * 100);
                  return (
                    <div key={mgr.name} className={styles.mgrRow}>
                      <div className={styles.mgrMeta}>
                        <span className={styles.mgrName}>{mgr.name}</span>
                        <span className={styles.mgrDeals}>{mgr.deals}건</span>
                      </div>
                      <div className={styles.mgrBarTrack}>
                        <div
                          className={styles.mgrBarFill}
                          style={{ width: `${barWidth}%`, background: color }}
                        />
                      </div>
                      <div className={styles.mgrAmounts}>
                        <span style={{ color: "var(--foreground)", fontWeight: 600 }}>
                          {formatRevenue(mgr.confirmed)}
                        </span>
                        {mgr.pipeline > 0 && (
                          <span style={{ color: "var(--primary)", fontSize: "0.65rem" }}>
                            +{formatRevenue(mgr.pipeline)} 파이프
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 지도 */}
            <div className={styles.mapPanel}>
              <LeafletMap center={view.center} zoom={view.zoom} />
            </div>
          </aside>

          {/* ── 메인 콘텐츠 ── */}
          <div className={styles.main}>

            {/* 실행 포인트 */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>실행 포인트</h3>
                <span className={styles.sectionHint}>담당 매니저가 지금 해야 할 것</span>
              </div>
              <div className={styles.priorityList}>
                {priorityMoves.map((item) => (
                  <div key={item} className={styles.priorityItem}>
                    <Target size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 확정 계약 */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <CheckCircle2 size={15} style={{ color: "#22c55e" }} />
                  확정 계약
                  <span className={styles.countBadge} style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>
                    {confirmedAccounts.length}건
                  </span>
                </h3>
                <span className={styles.sectionHint}>firstPayment 완료된 딜</span>
              </div>

              {confirmedAccounts.length === 0 ? (
                <p className={styles.emptyState}>이 지역의 확정 계약이 아직 없습니다.</p>
              ) : (
                <div className={styles.accountList}>
                  {confirmedAccounts
                    .sort((a, b) => b.amount - a.amount)
                    .map((acc) => (
                      <div key={acc.id} className={styles.accountCard}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.accountName}>{acc.name}</div>
                          <div className={styles.accountMeta}>
                            {acc.manager} · {acc.type} · {acc.status}
                            {acc.importance && ` · ${acc.importance}`}
                          </div>
                        </div>
                        <div className={styles.accountRight}>
                          <strong className={`${styles.accountAmount} metricValue`}>
                            {formatRevenue(acc.amount)}
                          </strong>
                          {acc.firstPayment && (
                            <span className={styles.confirmedDate}>
                              <CheckCircle2 size={10} /> {acc.firstPayment}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* 파이프라인 딜 */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={15} style={{ color: "var(--primary)" }} />
                  파이프라인
                  <span className={styles.countBadge} style={{ background: "var(--primary-soft)", color: "var(--primary-foreground)", border: "1px solid var(--primary-border)" }}>
                    {pipelineAccounts.length}건
                  </span>
                </h3>
                <span className={styles.sectionHint}>확률 높은 순 정렬</span>
              </div>

              {pipelineAccounts.length === 0 ? (
                <p className={styles.emptyState}>이 지역의 파이프라인 딜이 없습니다.</p>
              ) : (
                <div className={styles.accountList}>
                  {pipelineAccounts.map((acc) => {
                    const probColor = acc.probability >= 80 ? "#22c55e" : acc.probability >= 60 ? "#f59e0b" : "#6b7280";
                    return (
                      <div key={acc.id} className={styles.accountCard}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.accountName}>{acc.name}</div>
                          <div className={styles.accountMeta}>
                            {acc.manager} · {acc.type} · {acc.status}
                            {acc.remark ? ` — ${acc.remark}` : ""}
                          </div>
                        </div>
                        <div className={styles.accountRight}>
                          <strong className={`${styles.accountAmount} metricValue`}>
                            {formatRevenue(acc.amount)}
                          </strong>
                          <span className={styles.accountProb} style={{ color: probColor }}>
                            {acc.probability}% 확률
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className={styles.footerActions}>
              <Link className={styles.crmLink} href={`/crm?region=${encodeURIComponent(regionName)}`}>
                CRM 필터 보기
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: string; tone: "neutral" | "success" | "warning" }) {
  const colorMap = {
    neutral: "var(--foreground)",
    success: "var(--success-foreground)",
    warning: "var(--warning-foreground)",
  } satisfies Record<typeof tone, string>;

  return (
    <div className={styles.metricTile}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={`${styles.metricValue} metricValue`} style={{ color: colorMap[tone] }}>
        {value}
      </strong>
    </div>
  );
}
