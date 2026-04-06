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
import { formatRevenue } from "@/lib/formatCurrency";
import type { RevenuePacingPoint } from "@/types/dashboard";
import Card from "./Card";

interface Props {
  data: RevenuePacingPoint[];
  periodLabel: string;
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
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", borderRadius: "12px", boxShadow: "var(--shadow-soft)" }}
              itemStyle={{ color: "var(--foreground)" }}
              formatter={(value: number | undefined) => (value != null ? formatRevenue(value) : "")}
            />
            <Area
              type="monotone"
              dataKey="target"
              stroke="var(--text-muted)"
              strokeDasharray="5 5"
              fill="none"
              name="Linear target"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--accent)"
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
      </p>
    </Card>
  );
}
