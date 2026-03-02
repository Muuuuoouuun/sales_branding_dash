"use client";

// ──────────────────────────────────────────────────────────────────────────────
// RegionDrilldown — Modal overlay with Leaflet map + province stats
// Opens when a province is clicked on KoreaProvinceMap.
// ──────────────────────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";
import { X, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getHeatColor, getStatusLabel } from "@/lib/heatUtils";
import type { RegionData } from "./KoreaProvinceMap";
import styles from "./RegionDrilldown.module.css";

// Dynamic import — Leaflet requires window (browser-only)
const LeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span>지도 불러오는 중…</span>
    </div>
  ),
});

// ── Province center coordinates [lat, lng] + initial zoom ─────────────────────
const PROVINCE_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  "서울특별시":     { center: [37.5665, 126.9780], zoom: 12 },
  "부산광역시":     { center: [35.1796, 129.0756], zoom: 11 },
  "대구광역시":     { center: [35.8714, 128.6014], zoom: 11 },
  "인천광역시":     { center: [37.4563, 126.7052], zoom: 11 },
  "광주광역시":     { center: [35.1595, 126.8526], zoom: 12 },
  "대전광역시":     { center: [36.3504, 127.3845], zoom: 12 },
  "울산광역시":     { center: [35.5384, 129.3114], zoom: 11 },
  "경기도":         { center: [37.4138, 127.5183], zoom: 9  },
  "강원도":         { center: [37.5550, 128.2098], zoom: 8  },
  "충청북도":       { center: [36.6357, 127.4917], zoom: 9  },
  "충청남도":       { center: [36.5184, 126.8000], zoom: 9  },
  "전라북도":       { center: [35.7167, 127.1442], zoom: 9  },
  "전라남도":       { center: [34.8679, 126.9910], zoom: 9  },
  "경상북도":       { center: [36.4919, 128.8889], zoom: 8  },
  "경상남도":       { center: [35.4606, 128.2132], zoom: 9  },
  "제주특별자치도": { center: [33.4996, 126.5312], zoom: 10 },
  "세종특별자치시": { center: [36.4801, 127.2890], zoom: 12 },
};
const DEFAULT_VIEW = { center: [36.5, 127.5] as [number, number], zoom: 9 };

// ── Props & Component ─────────────────────────────────────────────────────────
interface Props {
  geoName: string;
  regionData: RegionData | null;
  onClose: () => void;
}

export default function RegionDrilldown({ geoName, regionData, onClose }: Props) {
  const view    = PROVINCE_VIEW[geoName] ?? DEFAULT_VIEW;
  const color   = regionData ? getHeatColor(regionData.progress) : "#555";
  const status  = regionData ? getStatusLabel(regionData.progress) : null;
  const prog    = regionData?.progress ?? 0;

  const TrendIcon =
    prog >= 80 ? TrendingUp :
    prog >= 60 ? Minus      :
    TrendingDown;

  return (
    /* Backdrop — click outside to close */
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal aria-label={geoName}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={styles.header} style={{ borderLeftColor: color }}>
          <div className={styles.headerLeft}>
            <MapPin size={16} style={{ color, flexShrink: 0 }} />
            <div>
              <h2 className={styles.title}>{geoName}</h2>
              {status && (
                <div className={styles.statusChip} style={{ background: color + "22", color }}>
                  <TrendIcon size={11} />
                  {status} · {prog}% 달성
                </div>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* ── Body: stats + map ────────────────────────────────────────── */}
        <div className={styles.body}>

          {/* Left: stats panel */}
          <aside className={styles.stats}>
            {regionData ? (
              <>
                {/* Progress bar */}
                <div className={styles.progressCard}>
                  <div className={styles.progressHeader}>
                    <span>목표 달성률</span>
                    <span style={{ color, fontWeight: 700 }}>{prog}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.min(prog, 100)}%`, background: color }}
                    />
                  </div>
                </div>

                {/* KPI rows */}
                {[
                  { label: "매출",      value: `₩${regionData.revenue.toLocaleString()}M` },
                  { label: "목표",      value: `₩${regionData.target.toLocaleString()}M`  },
                  { label: "활성 딜",   value: `${regionData.deals_active}건`               },
                  { label: "완료 딜",   value: `${regionData.deals_closed}건`               },
                  {
                    label: "클로즈율",
                    value: regionData.deals_active + regionData.deals_closed > 0
                      ? `${Math.round(
                          (regionData.deals_closed /
                            (regionData.deals_active + regionData.deals_closed)) * 100
                        )}%`
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className={styles.kpiRow}>
                    <span className={styles.kpiLabel}>{label}</span>
                    <span className={styles.kpiValue}>{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className={styles.noData}>이 지역의 판매 데이터가 없습니다.</p>
            )}

            <div className={styles.divider} />
            <p className={styles.mapGuide}>
              🗺 <strong>줌 안내</strong><br />
              스크롤 · 핀치로 확대하면<br />
              시 → 구 → 동 단위로<br />
              세밀하게 볼 수 있습니다.
            </p>
          </aside>

          {/* Right: Leaflet map */}
          <div className={styles.mapArea}>
            <LeafletMap center={view.center} zoom={view.zoom} />
          </div>
        </div>
      </div>
    </div>
  );
}
