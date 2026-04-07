import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeTeamAnalytics } from '@/lib/server/analytics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type BriefingType = 'daily' | 'weekly' | 'monthly' | 'risk-only';

const BRIEFING_FRAMING: Record<BriefingType, { horizon: string; tone: string; focus: string }> = {
  daily: {
    horizon: 'last 24 hours',
    tone: 'tactical, action-first, max 1 page',
    focus: "today's blockers and the next 2 working days",
  },
  weekly: {
    horizon: 'last 7 days',
    tone: 'analytical, momentum-aware, executive briefing',
    focus: 'week-over-week trend, biggest swings, and where to focus next week',
  },
  monthly: {
    horizon: 'last 30 days',
    tone: 'strategic, pattern-aware, board-ready',
    focus: 'structural shifts, anomalies, and strategic pivots for the upcoming month',
  },
  'risk-only': {
    horizon: 'current state',
    tone: 'risk-first, blunt, stop-doing oriented',
    focus: 'only what could slip — no good news, no fluff',
  },
};

export async function POST(req: Request) {
  try {
    let briefingType: BriefingType = 'daily';
    try {
      const body = await req.json();
      if (body?.briefingType && body.briefingType in BRIEFING_FRAMING) {
        briefingType = body.briefingType as BriefingType;
      }
    } catch {
      /* No body — use default */
    }
    const framing = BRIEFING_FRAMING[briefingType];

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

    const prompt = `You are preparing a ${briefingType.toUpperCase()} BD briefing for leadership.
Time horizon: ${framing.horizon}
Tone: ${framing.tone}
Focus: ${framing.focus}

Turn the live analytics below into a concise, operator-grade report.
Do not repeat raw tables without interpretation. Focus on what changed, why it matters, and what the team should do next.
IMPORTANT: Write in Korean (한국어). Use natural, business-grade Korean.

Analytics snapshot (${new Date(analytics.computedAt).toLocaleDateString('ko-KR')}):

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

Write exactly four sections in Korean using these headings (영어 헤딩 유지 — 프론트가 파싱):

## Executive Summary
현재 BD 포지션을 3-4문장으로 요약 (구체적 수치 포함).

## Risk Analysis
가장 중요한 리스크 신호, 그 의미, 무시할 경우 예상되는 손실을 설명.

## Action Plan
위 분석에 근거한 3개의 구체적인 전략적 액션.

## Immediate Next Steps
이번 ${briefingType === 'daily' ? '하루' : briefingType === 'weekly' ? '한 주' : '한 달'} 내 실행 가능한 5개의 액션 — 가능한 경우 담당자/대상 명시.

스타일 규칙:
- 직설적이고 분석적이며 의사결정 중심.
- 위 스냅샷의 구체적 수치를 활용.
- 리더가 빠르게 스캔할 수 있는 짧은 단락이나 불릿.
- 데이터에 없는 내용을 만들어내지 말 것.
- 자연스러운 비즈니스 한국어 사용.`;

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
