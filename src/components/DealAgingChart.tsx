import React from "react";
import { formatRevenue } from "@/lib/formatCurrency";
import type { DealAgingPoint } from "@/types/dashboard";
import Card from "./Card";

interface Props {
  data: DealAgingPoint[];
}

function getAgingColor(days: number): string {
  if (days <= 30) return "#22c55e";
  if (days <= 60) return "#f59e0b";
  return "#ef4444";
}

function getAgingLabel(days: number): string {
  if (days <= 30) return "정상";
  if (days <= 60) return "주의";
  return "위험";
}

export default function DealAgingChart({ data }: Props) {
  const staleCount = data.filter((point) => point.days > 40 && !point.isDummy).length;
  const sorted = [...data].sort((a, b) => b.days - a.days).slice(0, 7);
  const maxDays = Math.max(...sorted.map((d) => d.days), 1);

  return (
    <Card title="파이프라인 체류 현황">
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {/* header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 52px 90px 52px",
          gap: "0.5rem",
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          paddingBottom: "0.4rem",
          borderBottom: "1px solid var(--card-border)",
        }}>
          <span>계정명</span>
          <span>체류 기간</span>
          <span style={{ textAlign: "right" }}>일수</span>
          <span style={{ textAlign: "right" }}>금액</span>
          <span style={{ textAlign: "center" }}>상태</span>
        </div>

        {sorted.map((point) => {
          const color = getAgingColor(point.days);
          const fillPct = Math.min((point.days / maxDays) * 100, 100);
          const staleThresholdPct = Math.min((40 / maxDays) * 100, 100);

          return (
            <div key={point.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 52px 90px 52px",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.3rem 0",
            }}>
              <span style={{
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "var(--foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {point.name}
              </span>

              {/* bar */}
              <div style={{ position: "relative", height: "8px", background: "var(--card-border)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{
                  position: "absolute",
                  left: 0, top: 0, height: "100%",
                  width: `${fillPct}%`,
                  background: color,
                  borderRadius: "4px",
                  transition: "width 0.5s ease",
                  opacity: point.isDummy ? 0.4 : 0.85,
                }} />
                {/* 40-day stale threshold marker */}
                <div style={{
                  position: "absolute",
                  top: 0, bottom: 0,
                  left: `${staleThresholdPct}%`,
                  width: "1.5px",
                  background: "#ef444466",
                }} />
              </div>

              <span style={{ fontSize: "0.78rem", color, fontWeight: 600, textAlign: "right" }}>
                {point.days}일
              </span>

              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                {formatRevenue(point.value)}
              </span>

              <span style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                color,
                background: `${color}18`,
                border: `1px solid ${color}40`,
                borderRadius: "4px",
                padding: "1px 5px",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}>
                {getAgingLabel(point.days)}
              </span>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>
            활성 딜 데이터가 없습니다.
          </p>
        )}
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem", borderTop: "1px solid var(--card-border)", paddingTop: "0.6rem" }}>
        <strong style={{ color: staleCount > 0 ? "#ef4444" : "#22c55e" }}>Action:</strong>{" "}
        {staleCount > 0
          ? `${staleCount}건의 딜이 40일 이상 정체 중 — 즉시 후속 조치 필요.`
          : "장기 체류 딜 없음. 파이프라인 흐름 양호."}
      </p>
    </Card>
  );
}
