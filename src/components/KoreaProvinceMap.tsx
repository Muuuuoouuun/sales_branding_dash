"use client";

import { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { getHeatColor, getStatusLabel } from "@/lib/heatUtils";
import styles from "./KoreaProvinceMap.module.css";

// ── Korean province GeoJSON (local public folder) ────────────────────────────
const GEO_URL = "/korea-provinces.json";

// GeoJSON feature name → CSV short name
const GEO_TO_DATA: Record<string, string> = {
  "서울특별시":     "서울",
  "부산광역시":     "부산",
  "대구광역시":     "대구",
  "인천광역시":     "인천",
  "광주광역시":     "광주",
  "대전광역시":     "대전",
  "울산광역시":     "울산",
  "경기도":         "경기",
  "강원도":         "강원",
  "충청북도":       "충청",
  "충청남도":       "충청",
  "전라북도":       "전라",
  "전라남도":       "전라",
  "경상북도":       "경북",
  "경상남도":       "경남",
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RegionData {
  name: string;
  revenue: number;
  target: number;
  progress: number;
  deals_active: number;
  deals_closed: number;
  status: string;
  velocity?: number;
}

export type FilterType = "all" | "good" | "warning" | "critical";

interface TooltipState {
  geoName: string;
  data: RegionData | null;
  x: number;
  y: number;
}

interface Props {
  data: RegionData[];
  filter: FilterType;
  onRegionClick: (geoName: string, regionData: RegionData | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isVisible(data: RegionData | null, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (!data) return false;
  if (filter === "good")     return data.progress >= 80;
  if (filter === "warning")  return data.progress >= 60 && data.progress < 80;
  if (filter === "critical") return data.progress < 60;
  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function KoreaProvinceMap({ data, filter, onRegionClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const getDataForGeo = useCallback(
    (geoName: string): RegionData | null => {
      const dataName = GEO_TO_DATA[geoName];
      if (!dataName) return null;
      return data.find((d) => d.name === dataName) ?? null;
    },
    [data]
  );

  return (
    <div className={styles.wrap}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [127.7, 35.95], scale: 5100 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup center={[127.7, 35.95]} zoom={1} minZoom={0.8} maxZoom={14}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // southkorea-maps/kostat uses "name" (Korean) field
                const geoName: string =
                  (geo.properties.name as string | undefined) ?? "";
                const regionData = getDataForGeo(geoName);
                const visible    = isVisible(regionData, filter);
                const heatColor  = regionData
                  ? getHeatColor(regionData.progress)
                  : "#1e1e30";
                const fillBase   = visible ? heatColor + "c0" : "#1a1a2a";
                const fillHover  = visible ? heatColor        : "#252540";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={-1}
                    style={{
                      default: {
                        fill: fillBase,
                        stroke: "#08080f",
                        strokeWidth: 0.5,
                        outline: "none",
                        cursor: regionData ? "pointer" : "default",
                        transition: "fill 0.2s",
                      },
                      hover: {
                        fill: fillHover,
                        stroke: "#08080f",
                        strokeWidth: 0.8,
                        outline: "none",
                        filter: regionData
                          ? `drop-shadow(0 0 6px ${heatColor}90)`
                          : "none",
                      },
                      pressed: {
                        fill: fillHover,
                        outline: "none",
                      },
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      const svg = (e.currentTarget as Element).closest("svg");
                      const rect = svg?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({
                        geoName,
                        data: regionData,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                    onMouseMove={(e: React.MouseEvent<SVGPathElement>) => {
                      const svg = (e.currentTarget as Element).closest("svg");
                      const rect = svg?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip((prev) =>
                        prev
                          ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }
                          : prev
                      );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onRegionClick(geoName, regionData)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y - 8 }}
          aria-hidden
        >
          <p className={styles.ttName}>{tooltip.geoName}</p>
          {tooltip.data ? (
            <>
              <div className={styles.ttRow}>
                <span>매출</span>
                <span>₩{tooltip.data.revenue.toLocaleString()}M</span>
              </div>
              <div className={styles.ttRow}>
                <span>달성률</span>
                <span style={{ color: getHeatColor(tooltip.data.progress), fontWeight: 600 }}>
                  {tooltip.data.progress}%
                </span>
              </div>
              <div className={styles.ttRow}>
                <span>딜 (활성/완료)</span>
                <span>
                  {tooltip.data.deals_active} / {tooltip.data.deals_closed}
                </span>
              </div>
              <div className={styles.ttRow}>
                <span>상태</span>
                <span>{getStatusLabel(tooltip.data.progress)}</span>
              </div>
              <p className={styles.ttHint}>🔍 클릭 → 시/군/구 상세 보기</p>
            </>
          ) : (
            <p className={styles.ttNoData}>데이터 없음</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>달성률</span>
        <div className={styles.legendBar} />
        <div className={styles.legendTicks}>
          <span>~50%</span>
          <span>70%</span>
          <span>90%</span>
          <span>100%+</span>
        </div>
      </div>

      {/* Zoom hint */}
      <p className={styles.zoomHint}>마우스 휠로 확대 · 드래그로 이동</p>
    </div>
  );
}
