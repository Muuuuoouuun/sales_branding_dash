import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBdDashboardData } from "@/lib/server/bdDashboard";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST() {
  try {
    const dashboard = await getBdDashboardData();
    const topRiskRegion =
      [...dashboard.regional].sort((left, right) => left.progress - right.progress)[0] ?? null;
    const weakestStage =
      [...dashboard.bottleneck].sort(
        (left, right) => (left.progress ?? 0) - (right.progress ?? 0),
      )[0] ?? null;
    const topDeal = dashboard.hotDeals[0] ?? null;

    const prompt = `You are a BD operations strategist. Write exactly three short sentences in Korean.
Format:
Insight: ...
Action: ...
Alert: ...

Use only this live BD sheet summary:
- Period: ${dashboard.periodLabel}
- Data source: ${dashboard.dataSource}
- Team attainment: ${dashboard.teamSummary.attainment.toFixed(1)}%
- Revenue: ${dashboard.teamSummary.actualRevenue}M / ${dashboard.teamSummary.targetRevenue}M
- Remaining gap: ${dashboard.teamSummary.gapRevenue}M
- Active accounts: ${dashboard.teamSummary.accountCount}
- Activated accounts: ${dashboard.teamSummary.activatedCount}
- Top rep: ${dashboard.teamSummary.topManager}
- Highest-risk region: ${topRiskRegion ? `${topRiskRegion.name} ${topRiskRegion.progress}%` : "n/a"}
- Weakest activity stage: ${weakestStage ? `${weakestStage.stage} ${weakestStage.progress ?? 0}%` : "n/a"}
- Top hot deal: ${topDeal ? `${topDeal.client} ${topDeal.probability}%` : "n/a"}

Keep it concise, numeric, and operator-friendly.`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({
      insight: text,
      analytics: {
        overallProgress: dashboard.teamSummary.attainment,
        accountCount: dashboard.teamSummary.accountCount,
        activatedCount: dashboard.teamSummary.activatedCount,
        bottleneckStage: weakestStage?.stage ?? "",
        bottleneckProgress: weakestStage?.progress ?? 0,
        topRiskRegion: topRiskRegion?.name ?? "",
      },
    });
  } catch (error) {
    console.error("AI Insight Error:", error);
    return NextResponse.json(
      { insight: "AI insight could not be generated. Check Gemini or sheet connectivity." },
      { status: 500 },
    );
  }
}
