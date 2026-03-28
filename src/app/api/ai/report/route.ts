import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeTeamAnalytics } from '@/lib/server/analytics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST() {
  try {
    const analytics = await computeTeamAnalytics();

    const topRegions = [...analytics.regionAnalytics]
      .sort((left, right) => right.urgencyScore - left.urgencyScore)
      .slice(0, 4);
    const topLeads = analytics.leadAnalytics.slice(0, 5);
    const criticalCount = analytics.anomalies.filter((entry) => entry.severity === 'critical').length;

    const anomalyLines =
      analytics.anomalies.length > 0
        ? analytics.anomalies
            .map((entry) => `  - [${entry.severity === 'critical' ? 'CRITICAL' : 'WARNING'}] ${entry.message}`)
            .join('\n')
        : '  - No active anomaly signals';

    const prompt = `You are preparing an executive BD briefing for leadership.
Turn the live analytics below into a concise, operator-grade report.
Do not repeat raw tables without interpretation. Focus on what changed, why it matters, and what the team should do next.

Analytics snapshot (${new Date(analytics.computedAt).toLocaleDateString('en-GB')}):

[Team KPI]
  Revenue: KRW ${analytics.totalRevenue.toLocaleString()}M / Target KRW ${analytics.totalTarget.toLocaleString()}M
  Attainment: ${analytics.overallProgress}%
  Win rate: ${analytics.winRate}% (${analytics.leadAnalytics.filter((lead) => lead.stage === 'Contract').length} closed / ${analytics.leadAnalytics.length} leads)
  Average deal size: KRW ${analytics.avgDealSize.toLocaleString()}M
  Pipeline value: KRW ${analytics.pipelineValue.toLocaleString()}M (health ${analytics.pipelineHealthRatio}%)
  Forecast: KRW ${analytics.q1Forecast.toLocaleString()}M (${analytics.forecastVsTarget}% of target)
  Bottleneck stage: ${analytics.bottleneckStage} (${analytics.bottleneckDropRate}% drop from prior stage)

[Highest-pressure regions]
${topRegions
  .map(
    (region) =>
      `  - ${region.name}: attainment ${region.progress}% | velocity ${region.velocity}% | performance index ${region.performanceIndex} | urgency ${region.urgencyScore}/100 [${region.status.toUpperCase()}]`,
  )
  .join('\n')}

[Highest-pressure leads]
${topLeads
  .map(
    (lead) =>
      `  - ${lead.company} (${lead.owner}): urgency ${lead.urgencyScore}/100 | risk ${lead.riskLevel} | expected value KRW ${lead.expectedValue.toLocaleString()}M | last touch ${lead.daysSinceContact}d ago | ${lead.daysUntilDue > 0 ? `D-${lead.daysUntilDue}` : `D+${Math.abs(lead.daysUntilDue)}`}`,
  )
  .join('\n')}

[Owner performance]
${analytics.ownerStats
  .map(
    (owner) =>
      `  - ${owner.name}: win rate ${owner.winRate}% | won KRW ${owner.wonRevenue.toLocaleString()}M | pipeline KRW ${owner.pipelineRevenue.toLocaleString()}M | productivity ${owner.productivityScore}/100`,
  )
  .join('\n')}

[Anomalies]
${anomalyLines}

Write exactly four sections using these headings:

## Executive Summary
Summarize the current BD position in 3-4 sentences with numbers.

## Risk Analysis
Explain the most important risk signals, why they matter, and the likely downside if ignored.

## Action Plan
Give three concrete strategic moves grounded in the analytics above.

## Immediate Next Steps
Give five execution actions for this week with an owner or target group when possible.

Style rules:
- Be direct, analytical, and decision-oriented.
- Use specific numbers from the snapshot.
- Prefer short paragraphs or bullets that leadership can scan quickly.
- Do not invent data that is not present above.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    const result = await model.generateContentStream(prompt);

    const analyticsSummary = {
      totalRevenue: analytics.totalRevenue,
      totalTarget: analytics.totalTarget,
      overallProgress: analytics.overallProgress,
      winRate: analytics.winRate,
      pipelineValue: analytics.pipelineValue,
      pipelineHealthRatio: analytics.pipelineHealthRatio,
      q1Forecast: analytics.q1Forecast,
      forecastVsTarget: analytics.forecastVsTarget,
      anomalyCount: analytics.anomalies.length,
      criticalCount,
      anomalies: analytics.anomalies,
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Analytics': JSON.stringify(analyticsSummary),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('AI Report Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI report.' }, { status: 500 });
  }
}
