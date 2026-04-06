import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRevenue } from "@/lib/formatCurrency";
import type { RevenuePacingPoint } from "@/types/dashboard";
import Card from "./Card";

interface Props {
  data: RevenuePacingPoint[];
  periodLabel: string;
}

export default function RevenuePacingChart({ data, periodLabel }: Props) {
  const lastPoint = data[data.length - 1];
  const delta = lastPoint ? lastPoint.actual - lastPoint.target : 0;
  const attainmentPct =
    lastPoint && lastPoint.target > 0
      ? Math.round((lastPoint.actual / lastPoint.target) * 100)
      : 0;
  const isAhead = delta >= 0;

  // Find current month index for "오늘" reference line
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentLabel = data.find((p) => p.month === currentMonth)?.label ?? null;

  return (
    <Card
      title="분기 매출 진행 현황"
      action={
        lastPoint ? (
          <span style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: isAhead ? "#22c55e" : "#ef4444",
            background: isAhead ? "#22c55e18" : "#ef444418",
            border: `1px solid ${isAhead ? "#22c55e44" : "#ef444444"}`,
            borderRadius: "6px",
            padding: "2px 8px",
          }}>
            {isAhead ? `▲ +${formatRevenue(delta)}` : `▼ ${formatRevenue(Math.abs(delta))}`}
          </span>
        ) : null
      }
    >
      {/* summary bar */}
      <div style={{
        display: "flex",
        gap: "1.5rem",
        marginTop: "0.75rem",
        marginBottom: "0.25rem",
        fontSize: "0.8rem",
      }}>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginBottom: "2px" }}>누적 실적</div>
          <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
            {lastPoint ? formatRevenue(lastPoint.actual) : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginBottom: "2px" }}>선형 목표</div>
          <div style={{ fontWeight: 700, color: "var(--text-muted)" }}>
            {lastPoint ? formatRevenue(lastPoint.target) : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginBottom: "2px" }}>달성률</div>
          <div style={{ fontWeight: 700, color: isAhead ? "#22c55e" : "#ef4444" }}>
            {attainmentPct}%
          </div>
        </div>
      </div>

      <div style={{ height: "240px", width: "100%", marginTop: "0.5rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isAhead ? "#22c55e" : "#ef4444"} stopOpacity={0.12} />
                <stop offset="100%" stopColor={isAhead ? "#22c55e" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={60}
              tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", borderRadius: "12px" }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value: number | undefined) => (value != null ? formatRevenue(value) : "")}
            />
            {currentLabel && (
              <ReferenceLine
                x={currentLabel}
                stroke="var(--primary)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: "오늘", position: "insideTopRight", fontSize: 10, fill: "var(--primary)" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="target"
              stroke="var(--text-muted)"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              fill="none"
              name="target"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorActual)"
              name="actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", borderTop: "1px solid var(--card-border)", paddingTop: "0.6rem" }}>
        <strong style={{ color: isAhead ? "#22c55e" : "#ef4444" }}>
          {isAhead ? "▲ 순조" : "▼ 주의"}
        </strong>{" "}
        {lastPoint
          ? isAhead
            ? `목표 대비 ${formatRevenue(delta)} 앞서는 중 (${attainmentPct}% 달성).`
            : `목표 대비 ${formatRevenue(Math.abs(delta))} 부족 (${attainmentPct}% 달성). 가속화 필요.`
          : "분기 페이싱 데이터를 불러오는 중입니다."}
      </p>
    </Card>
  );
}
