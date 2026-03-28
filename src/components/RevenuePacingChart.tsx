import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePacingPoint } from "@/types/dashboard";
import Card from "./Card";

interface Props {
  data: RevenuePacingPoint[];
  periodLabel: string;
}

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

export default function RevenuePacingChart({ data, periodLabel }: Props) {
  const hasDummy = data.some((point) => point.isDummy);
  const lastPoint = data[data.length - 1];
  const delta = lastPoint ? lastPoint.actual - lastPoint.target : 0;

  return (
    <Card title={`${periodLabel} revenue pacing`}>
      <div style={{ height: "300px", width: "100%", marginTop: "1rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#333", borderRadius: "8px" }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number | undefined) => (value != null ? formatRevenue(value) : "")}
            />
            <Area
              type="monotone"
              dataKey="target"
              stroke="#666"
              strokeDasharray="5 5"
              fill="none"
              name="Linear target"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorActual)"
              name="Sheet actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
        <strong>Insight:</strong>{" "}
        {lastPoint
          ? delta >= 0
            ? `Current quarter pacing is ahead by ${formatRevenue(delta)}.`
            : `Current quarter pacing is behind by ${formatRevenue(Math.abs(delta))}.`
          : "Quarter pacing data is not available yet."}
        {hasDummy ? " Some points are marked as -더미-." : ""}
      </p>
    </Card>
  );
}
