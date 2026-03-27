import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeTeamAnalytics } from '@/lib/server/analytics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST() {
  try {
    const a = await computeTeamAnalytics();

    const top4Regions = [...a.regionAnalytics]
      .sort((b, c) => c.urgencyScore - b.urgencyScore)
      .slice(0, 4);

    const top5Leads = a.leadAnalytics.slice(0, 5);

    const anomalyLines = a.anomalies.length > 0
      ? a.anomalies.map(x => `  - [${x.severity === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING'}] ${x.message}`).join('\n')
      : '  - 감지된 이상 신호 없음';

    const prompt = `당신은 한국 최고 세일즈 전략 컨설턴트입니다.
아래 **통계 분석 엔진이 계산한 데이터**를 바탕으로 경영진 수준의 심층 전략 리포트를 작성하세요.
원시 데이터 나열이 아닌, 원인 분석과 실행 전략에 집중하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 통계 분석 결과 (${new Date(a.computedAt).toLocaleDateString('ko-KR')} 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[전체 팀 KPI]
  총매출     : ₩${a.totalRevenue.toLocaleString()}M / 목표 ₩${a.totalTarget.toLocaleString()}M
  달성률     : ${a.overallProgress}%
  승률       : ${a.winRate}% (${a.leadAnalytics.filter(l => l.stage === 'Contract').length}건 계약 / 전체 ${a.leadAnalytics.length}건)
  평균딜규모  : ₩${a.avgDealSize.toLocaleString()}M
  파이프라인  : ₩${a.pipelineValue.toLocaleString()}M (건강도 ${a.pipelineHealthRatio}%)
  Q1 예측    : ₩${a.q1Forecast.toLocaleString()}M → 목표의 ${a.forecastVsTarget}% 달성 예측
  병목 단계  : ${a.bottleneckStage} (이전 단계 대비 ${a.bottleneckDropRate}% 전환 손실)

[지역별 성과 — 긴급도 상위]
${top4Regions.map(r =>
  `  - ${r.name}: 달성률 ${r.progress}% | 전환속도 ${r.velocity}% | 퍼포먼스 인덱스 ${r.performanceIndex} | 긴급도 ${r.urgencyScore}/100 [${r.status.toUpperCase()}]`
).join('\n')}

[리드 우선순위 — 긴급도 상위 5]
${top5Leads.map(l =>
  `  - ${l.company}(${l.owner}): 긴급도 ${l.urgencyScore}/100 | 위험도 ${l.riskLevel} | 예상가치 ₩${l.expectedValue.toLocaleString()}M | ${l.daysSinceContact}일 미연락 | ${l.daysUntilDue > 0 ? `D-${l.daysUntilDue}` : `D+${Math.abs(l.daysUntilDue)} 초과`}`
).join('\n')}

[담당자별 성과]
${a.ownerStats.map(o =>
  `  - ${o.name}: 승률 ${o.winRate}% | 계약 ₩${o.wonRevenue.toLocaleString()}M | 파이프 ₩${o.pipelineRevenue.toLocaleString()}M | 생산성 ${o.productivityScore}/100`
).join('\n')}

[자동 감지된 이상 신호 — ${a.anomalies.length}건]
${anomalyLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 분석을 바탕으로 아래 4개 섹션으로 전략 리포트를 작성하세요.
각 섹션은 구체적 수치를 인용하고, 실행 가능한 내용으로 작성하세요.

## 현황 진단
(현재 팀 성과의 핵심 패턴 2-3가지. 수치 기반. 3-4문장)

## 위험 신호 분석
(감지된 이상 신호의 근본 원인과 비즈니스 임팩트. 각 위험의 확산 시나리오 포함)

## 전략 방향
(3가지 전략 방향. 각각 근거 수치와 적용 방법론 포함. 지역/담당자 차별화 전략)

## 즉시 실행 플랜
(이번 주 내 실행할 5가지 액션. 담당자 명시. 예상 효과 수치화)`;

    const model  = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    const result = await model.generateContentStream(prompt);

    // Analytics summary to send as header (for client-side cards)
    const analyticsSummary = {
      totalRevenue:      a.totalRevenue,
      totalTarget:       a.totalTarget,
      overallProgress:   a.overallProgress,
      winRate:           a.winRate,
      pipelineValue:     a.pipelineValue,
      pipelineHealthRatio: a.pipelineHealthRatio,
      q1Forecast:        a.q1Forecast,
      forecastVsTarget:  a.forecastVsTarget,
      anomalyCount:      a.anomalies.length,
      criticalCount:     a.anomalies.filter(x => x.severity === 'critical').length,
      anomalies:         a.anomalies,
    };

    const encoder = new TextEncoder();
    const stream  = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'X-Analytics':   JSON.stringify(analyticsSummary),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('AI Report Error:', error);
    return NextResponse.json({ error: 'AI 리포트 생성 실패' }, { status: 500 });
  }
}
