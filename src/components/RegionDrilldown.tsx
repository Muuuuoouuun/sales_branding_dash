"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { getHeatColor, getStatusLabel } from "@/lib/heatUtils";
import type { FocusAccount, HotDeal, RegionData as DashboardRegionData } from "@/types/dashboard";
import type { RegionData } from "./KoreaProvinceMap";
import styles from "./RegionDrilldown.module.css";

const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map view…</div>,
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
  전라: { center: [35.7167, 127.1442], zoom: 8 },
  경북: { center: [36.4919, 128.8889], zoom: 8 },
  경남: { center: [35.4606, 128.2132], zoom: 8 },
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

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

function getPriorityMoves(regionData: RegionData | null, accounts: FocusAccount[], hotDeals: HotDeal[]) {
  const items: string[] = [];

  if (!regionData) {
    return ["No regional metrics are available yet. Check source mapping before taking action."];
  }

  if (regionData.progress < 80) {
    items.push(`Recover ${formatRevenue(Math.max(regionData.target - regionData.revenue, 0))} to get the region back on pace.`);
  }

  if ((regionData.velocity ?? 0) < 50) {
    items.push("Activation velocity is soft. Move more open accounts to first payment this week.");
  }

  if (hotDeals.length > 0) {
    items.push(`Close ${hotDeals[0].client} first. It is the cleanest high-value path in the region.`);
  }

  if (accounts.length === 0) {
    items.push("Curate 2-3 focus accounts for this region so managers can review them daily.");
  }

  return items.slice(0, 3);
}

export default function RegionDrilldown({
  geoName,
  regionData,
  accounts,
  hotDeals,
  allRegions,
  periodLabel,
  onClose,
}: Props) {
  const regionName = regionData?.name ?? geoName;
  const view = PROVINCE_VIEW[regionName] ?? DEFAULT_VIEW;
  const color = regionData ? getHeatColor(regionData.progress) : "#6b7280";
  const status = regionData ? getStatusLabel(regionData.progress) : null;
  const progress = regionData?.progress ?? 0;
  const revenueShare =
    regionData && allRegions.length > 0
      ? Math.round(
          (regionData.revenue /
            Math.max(
              allRegions.reduce((sum, region) => sum + region.revenue, 0),
              1,
            )) * 100,
        )
      : 0;
  const sortedRegions = [...allRegions].sort((left, right) => right.progress - left.progress);
  const rank = sortedRegions.findIndex((region) => region.name === regionName) + 1;

  const TrendIcon =
    progress >= 80 ? TrendingUp : progress >= 60 ? Minus : TrendingDown;

  const priorityMoves = getPriorityMoves(regionData, accounts, hotDeals);

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal aria-label={regionName}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header} style={{ borderLeftColor: color }}>
          <div className={styles.headerLeft}>
            <span className={styles.locationIcon} style={{ background: `${color}18`, color }}>
              <MapPin size={15} />
            </span>
            <div>
              <p className={styles.period}>{periodLabel}</p>
              <h2 className={styles.title}>{regionName}</h2>
              {status ? (
                <div className={styles.statusChip} style={{ background: `${color}18`, color }}>
                  <TrendIcon size={11} />
                  {status} · {progress}% attainment
                </div>
              ) : null}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close region panel">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.heroCard}>
              <div className={styles.heroTop}>
                <span className={styles.heroLabel}>Revenue share</span>
                <span className={`${styles.heroValue} metricValue`} style={{ color }}>
                  {revenueShare}%
                </span>
              </div>
              <div className={styles.heroRow}>
                <span>Revenue</span>
                <strong className="metricValue">{formatRevenue(regionData?.revenue ?? 0)}</strong>
              </div>
              <div className={styles.heroRow}>
                <span>Target</span>
                <strong className="metricValue">{formatRevenue(regionData?.target ?? 0)}</strong>
              </div>
              <div className={styles.heroRow}>
                <span>Regional rank</span>
                <strong className="metricValue">{rank > 0 ? `#${rank}` : "-"}</strong>
              </div>
            </div>

            <div className={styles.metricList}>
              <MetricTile
                label="Open accounts"
                value={String(regionData?.deals_active ?? 0)}
                tone="neutral"
              />
              <MetricTile
                label="Activated"
                value={String(regionData?.deals_closed ?? 0)}
                tone="success"
              />
              <MetricTile
                label="Velocity"
                value={`${regionData?.velocity ?? 0}%`}
                tone={(regionData?.velocity ?? 0) >= 60 ? "success" : "warning"}
              />
              <MetricTile
                label="Gap to target"
                value={formatRevenue(Math.max((regionData?.target ?? 0) - (regionData?.revenue ?? 0), 0))}
                tone={progress >= 90 ? "success" : "warning"}
              />
            </div>

            <div className={styles.mapPanel}>
              <LeafletMap center={view.center} zoom={view.zoom} />
            </div>
          </aside>

          <div className={styles.main}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Priority moves</h3>
                <span className={styles.sectionHint}>What the manager should do next</span>
              </div>
              <div className={styles.priorityList}>
                {priorityMoves.map((item) => (
                  <div key={item} className={styles.priorityItem}>
                    <Target size={14} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Focus accounts</h3>
                <span className={styles.sectionHint}>Highest-leverage accounts in this region</span>
              </div>

              {accounts.length === 0 ? (
                <p className={styles.emptyState}>No focus accounts are currently mapped to this region.</p>
              ) : (
                <div className={styles.accountList}>
                  {accounts.map((account) => (
                    <div key={account.id} className={styles.accountCard}>
                      <div>
                        <div className={styles.accountName}>{account.name}</div>
                        <div className={styles.accountMeta}>
                          {account.manager} · {account.type} · {account.status}
                        </div>
                      </div>
                      <div className={styles.accountRight}>
                        <strong className={`${styles.accountAmount} metricValue`}>
                          {formatRevenue(account.amount)}
                        </strong>
                        <span className={styles.accountProb}>{account.probability}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Hot deals</h3>
                <span className={styles.sectionHint}>Fastest routes to recover regional pace</span>
              </div>

              {hotDeals.length === 0 ? (
                <p className={styles.emptyState}>No hot deals are currently tagged for this region.</p>
              ) : (
                <div className={styles.dealList}>
                  {hotDeals.map((deal) => (
                    <div key={deal.id} className={styles.dealCard}>
                      <div>
                        <div className={styles.accountName}>{deal.client}</div>
                        <div className={styles.accountMeta}>
                          {deal.manager} · {deal.version} · {deal.probability}% confidence
                        </div>
                      </div>
                      <strong className={`${styles.accountAmount} metricValue`}>
                        {formatRevenue(deal.value)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className={styles.footerActions}>
              <Link className={styles.crmLink} href={`/crm?region=${encodeURIComponent(regionName)}`}>
                Open CRM filtered view
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
}) {
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
