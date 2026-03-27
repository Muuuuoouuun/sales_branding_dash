import React from "react";
import Card from "./Card";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from "recharts";

const data = [
  { days: 10, value: 50,  prob: 80, name: "A사 리뉴얼", stage: "Contract" },
  { days: 22, value: 120, prob: 60, name: "B사 도입",   stage: "Negotiation" },
  { days: 45, value: 300, prob: 40, name: "C사 시스템", stage: "Proposal" },
  { days: 68, value: 200, prob: 30, name: "D사 통합",   stage: "Meeting" },
  { days: 90, value: 450, prob: 10, name: "E사 장기",   stage: "Lead" }, // Needs attention!
  { days: 15, value: 90,  prob: 90, name: "F사 파일럿", stage: "Contract" },
  { days: 5,  value: 40,  prob: 50, name: "G사 문의",   stage: "Lead" },
];

export default function DealAgingChart() {
  return (
    <Card title="파이프라인 건전성 (Deal Aging)">
      <div style={{ height: "300px", width: "100%", marginTop: "1rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis type="number" dataKey="days" name="체류 일수" unit="일" stroke="#666" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="value" name="예상 금액" unit="M" stroke="#666" tick={{ fontSize: 11 }} />
            <ZAxis type="number" dataKey="prob" range={[50, 400]} name="성공 확률" unit="%" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: "#18181b", borderColor: "#333", borderRadius: "8px" }}
              itemStyle={{ color: "#fff" }}
              formatter={(v: any, n: string | undefined) => {
                if (n === '체류 일수') return `${v}일`;
                if (n === '예상 금액') return `₩${v}M`;
                if (n === '성공 확률') return `${v}%`;
                return v;
              }}
              labelFormatter={() => ""}
            />
            {/* Split scatters by healthy vs aging based on days > 60 for instance */}
            <Scatter name="건강한 파이프라인 (<= 40일)" data={data.filter(d => d.days <= 40)} fill="#6366f1" opacity={0.8} />
            <Scatter name="장기 점검 요망 (> 40일)" data={data.filter(d => d.days > 40)} fill="#ef4444" opacity={0.8} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
        <strong>Action:</strong> 40일 이상 머무른 딜(우측 빨간 버블)이 총 3건입니다. Lost 여부를 확정하여 파이프라인 거품을 제거하세요.
      </p>
    </Card>
  );
}
