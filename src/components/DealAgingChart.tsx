import React from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatRevenue } from "@/lib/formatCurrency";
import type { DealAgingPoint } from "@/types/dashboard";
import Card from "./Card";

interface Props {
  data: DealAgingPoint[];
}


export default function DealAgingChart({ data }: Props) {
  const staleCount = data.filter((point) => point.days > 40 && !point.isDummy).length;
  const hasDummy = data.some((point) => point.isDummy);

  return (
    <Card title="BD account aging">
      <div style={{ height: "300px", width: "100%", marginTop: "1rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis type="number" dataKey="days" name="Aging days" unit="d" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="value" name="Deal value" unit="M" stroke="#666" tick={{ fontSize: 11 }} />
            <ZAxis type="number" dataKey="prob" range={[50, 400]} name="Confidence" unit="%" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#333", borderRadius: "8px" }}
              itemStyle={{ color: "#fff" }}
              formatter={(value, name) => {
                if (name === "Aging days") {
                  return `${value}d`;
                }
                if (name === "Deal value") {
                  return formatRevenue(Number(value ?? 0));
                }
                if (name === "Confidence") {
                  return `${value}%`;
                }
                return value ?? "";
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
            />
            <Scatter
              name="Healthy"
              data={data.filter((point) => point.days <= 40)}
              fill="#6366f1"
              opacity={0.8}
            />
            <Scatter
              name="Needs attention"
              data={data.filter((point) => point.days > 40)}
              fill="#ef4444"
              opacity={0.8}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
        <strong>Action:</strong> {staleCount > 0 ? `${staleCount} accounts are aging past 40 days.` : "No severely aged BD accounts detected."}
      </p>
    </Card>
  );
}
