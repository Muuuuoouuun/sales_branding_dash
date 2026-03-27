import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeTeamAnalytics } from '@/lib/server/analytics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST() {
  try {
    const a = await computeTeamAnalytics();

    const criticalAnomalies = a.anomalies.filter(x => x.severity === 'critical');
    const topUrgentLead = a.leadAnalytics[0];
    const worstRegion   = [...a.regionAnalytics].sort((x, y) => y.urgencyScore - x.urgencyScore)[0];

    const prompt = `당신은 세일즈 전략 디렉터입니다.
아래 통계 분석 데이터를 바탕으로 경영진에게 전달할 핵심 인사이트를 한국어로 작성하세요.
형식: "Insight: [핵심 분석 1문장]. Action: [즉시 실행 액션 1문장]. Alert: [가장 긴급한 경고 1문장]"
3문장을 넘지 마세요.

[분석 데이터]
달성률: ${a.overallProgress}% | 승률: ${a.winRate}% | Q1 예측: 목표의 ${a.forecastVsTarget}%
가장 긴급한 지역: ${worstRegion?.name}(달성률 ${worstRegion?.progress}%, 전환율 ${worstRegion?.velocity}%)
가장 긴급한 딜: ${topUrgentLead?.company}(긴급도 ${topUrgentLead?.urgencyScore}/100, ${topUrgentLead?.daysSinceContact}일 미연락)
병목 단계: ${a.bottleneckStage}(${a.bottleneckDropRate}% 손실)
CRITICAL 이상 신호: ${criticalAnomalies.length}건 — ${criticalAnomalies.map(x => x.entity).join(', ') || '없음'}`;

    const model  = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    const result = await model.generateContent(prompt);
    const text   = result.response.text();

    return NextResponse.json({
      insight: text,
      analytics: {
        overallProgress:     a.overallProgress,
        winRate:             a.winRate,
        forecastVsTarget:    a.forecastVsTarget,
        anomalyCount:        a.anomalies.length,
        criticalCount:       criticalAnomalies.length,
        bottleneckStage:     a.bottleneckStage,
        bottleneckDropRate:  a.bottleneckDropRate,
        pipelineHealthRatio: a.pipelineHealthRatio,
      },
    });
  } catch (error) {
    console.error('AI Insight Error:', error);
    return NextResponse.json({ insight: 'AI 분석 실패. GEMINI_API_KEY를 확인하세요.' }, { status: 500 });
  }
}
