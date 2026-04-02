"use client";

import React, { useState, useMemo, useCallback } from "react";
import styles from "./RegionHeatmap.module.css";
import { getHeatColor, getGlowColor, getBubbleRadius, getStatusLabel } from "@/lib/heatUtils";

export interface RegionData {
  name: string;
  revenue: number;
  target: number;
  progress: number;
  velocity: number;
  deals_active: number;
  deals_closed: number;
  coordinates: [number, number];
  status: "good" | "warning" | "critical";
}

interface RegionHeatmapProps {
  data: RegionData[];
  filter?: "all" | "good" | "warning" | "critical";
}

// SVG 좌표 (viewBox 0 0 340 445)
const POSITIONS: Record<string, [number, number]> = {
  '서울':  [170,  88],
  '인천':  [128, 100],
  '경기':  [192, 118],
  '강원':  [262,  86],
  '대전':  [168, 184],
  '충청':  [136, 200],
  '광주':  [130, 282],
  '전라':  [116, 308],
  '대구':  [238, 228],
  '경북':  [258, 178],
  '경남':  [230, 292],
  '부산':  [268, 312],
  '울산':  [280, 272],
};

// 한반도 남부 외곽선 (simplified polygon)
const KOREA_PATH =
  "M138,28 L162,24 L190,26 L218,34 L248,52 L272,68 L294,90 " +
  "L316,118 L330,148 L336,182 L334,218 L326,254 L314,282 " +
  "L298,308 L278,332 L258,350 L238,366 L214,378 L192,382 " +
  "L170,378 L148,366 L126,348 L106,322 L86,294 " +
  "L68,262 L56,228 L54,194 L58,162 L66,134 " +
  "L78,108 L92,86 L106,68 L120,52 L132,38 Z";

export default function RegionHeatmap({ data, filter = "all" }: RegionHeatmapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const maxRevenue = useMemo(
    () => Math.max(...data.map(d => d.revenue), 1),
    [data]
  );

  const dataByName = useMemo(() => {
    const map: Record<string, RegionData> = {};
    data.forEach(d => { map[d.name] = d; });
    return map;
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const filteredNames = useMemo(
    () => Object.keys(POSITIONS).filter(name => {
      const region = dataByName[name];
      if (!region) return false;
      return filter === "all" || region.status === filter;
    }),
    [dataByName, filter]
  );

  // 툴팁이 오른쪽/하단으로 넘어가지 않도록 방향 조정
  const tooltipStyle = useMemo(() => {
    const offset = 14;
    const tw = 172; // tooltip width approx
    const th = 120; // tooltip height approx
    const containerW = 340;
    const x = mousePos.x + offset + tw > containerW ? mousePos.x - tw - offset : mousePos.x + offset;
    const y = mousePos.y - offset - th < 0 ? mousePos.y + offset : mousePos.y - offset - th;
    return { left: x, top: y };
  }, [mousePos]);

  return (
    <div
      className={styles.container}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredRegion(null)}
    >
      <svg viewBox="0 0 340 445" className={styles.svg} aria-label="Korea Region Heatmap">
        <defs>
          {/* glow gradient per region */}
          {data.map(region => (
            <radialGradient
              key={`glow-${region.name}`}
              id={`glow-${region.name}`}
              cx="50%" cy="50%" r="50%"
            >
              <stop offset="0%"   stopColor={getGlowColor(region.progress)} stopOpacity="0.7" />
              <stop offset="100%" stopColor={getGlowColor(region.progress)} stopOpacity="0"   />
            </radialGradient>
          ))}

          {/* background grid */}
          <pattern id="heatGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--glass-border)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* background */}
        <rect width="340" height="445" fill="url(#heatGrid)" />

        {/* Korea mainland outline */}
        <path
          d={KOREA_PATH}
          fill="rgba(99,102,241,0.05)"
          stroke="rgba(99,102,241,0.22)"
          strokeWidth="1.5"
        />

        {/* Jeju island */}
        <ellipse
          cx="155" cy="422" rx="30" ry="11"
          fill="rgba(99,102,241,0.05)"
          stroke="rgba(99,102,241,0.22)"
          strokeWidth="1.5"
        />

        {/* heatmap glow layers */}
        {filteredNames.map(name => {
          const region = dataByName[name];
          const [cx, cy] = POSITIONS[name];
          const r = getBubbleRadius(region.revenue, maxRevenue);
          return (
            <circle
              key={`glow-circle-${name}`}
              cx={cx} cy={cy}
              r={r * 3.2}
              fill={`url(#glow-${name})`}
            />
          );
        })}

        {/* region bubbles */}
        {filteredNames.map(name => {
          const region = dataByName[name];
          const [cx, cy] = POSITIONS[name];
          const r = getBubbleRadius(region.revenue, maxRevenue);
          const color = getHeatColor(region.progress);
          const dimmed = hoveredRegion !== null && hoveredRegion.name !== name;

          return (
            <g
              key={name}
              className={styles.regionGroup}
              onMouseEnter={() => setHoveredRegion(region)}
              style={{ opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.2s' }}
            >
              {/* critical pulse ring */}
              {region.status === 'critical' && (
                <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={color} strokeWidth="1.5">
                  <animate attributeName="r"       from={r + 5}  to={r + 20}  dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6"    to="0"       dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}

              {/* outer ring */}
              <circle
                cx={cx} cy={cy} r={r + 3}
                fill="none"
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth="1"
              />

              {/* main bubble */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={color}
                fillOpacity={0.88}
                stroke={color}
                strokeWidth="1.5"
                className={styles.bubble}
              />

              {/* progress % inside bubble (only if large enough) */}
              {r >= 13 && (
                <text x={cx} y={cy + 4} textAnchor="middle" className={styles.progressText}>
                  {region.progress}%
                </text>
              )}

              {/* region label below bubble */}
              <text x={cx} y={cy + r + 12} textAnchor="middle" className={styles.label}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* floating tooltip */}
      {hoveredRegion && (
        <div className={styles.tooltip} style={tooltipStyle}>
          <h4 className={styles.tooltipTitle}>
            {hoveredRegion.name}
            <span
              className={styles.tooltipBadge}
              style={{ background: getHeatColor(hoveredRegion.progress) + '22',
                       color: getHeatColor(hoveredRegion.progress),
                       border: `1px solid ${getHeatColor(hoveredRegion.progress)}44` }}
            >
              {getStatusLabel(hoveredRegion.progress)}
            </span>
          </h4>
          <div className={styles.tooltipRow}>
            <span>매출</span>
            <span>₩{hoveredRegion.revenue.toLocaleString()}M</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>목표</span>
            <span>₩{hoveredRegion.target.toLocaleString()}M</span>
          </div>
          <div className={styles.tooltipRow}>
            <span>달성률</span>
            <span style={{ color: getHeatColor(hoveredRegion.progress), fontWeight: 700 }}>
              {hoveredRegion.progress}%
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span>딜 클로즈</span>
            <span>{hoveredRegion.deals_closed} / {hoveredRegion.deals_active}</span>
          </div>
          <div className={styles.tooltipProgressBar}>
            <div
              className={styles.tooltipProgressFill}
              style={{
                width: `${Math.min(hoveredRegion.progress, 100)}%`,
                background: getHeatColor(hoveredRegion.progress),
              }}
            />
          </div>
        </div>
      )}

      {/* legend */}
      <div className={styles.legend}>
        <span className={styles.legendTitle}>달성률</span>
        <div className={styles.legendGradient} />
        <div className={styles.legendLabels}>
          <span>0%</span>
          <span>50%</span>
          <span>100%+</span>
        </div>
        <span className={styles.legendNote}>● 크기 = 매출 규모</span>
      </div>
    </div>
  );
}
