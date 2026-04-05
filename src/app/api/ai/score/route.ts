import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { computeTeamAnalytics } from '@/lib/server/analytics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();

    const analytics = await computeTeamAnalytics();
    const lead = analytics.leadAnalytics.find(l => l.id === Number(leadId));

    if (!lead) {
      return NextResponse.json({ error: '리드를 찾을 수 없습니다.' }, { status: 404 });
    }

    const dueLabel = lead.daysUntilDue > 0
      ? `D-${lead.daysUntilDue} (${lead.daysUntilDue}일 후 마감)`
      : lead.daysUntilDue === 0
        ? '오늘 마감'
        : `D+${Math.abs(lead.daysUntilDue)} (${Math.abs(lead.daysUntilDue)}일 초과)`;

    const prompt = `당신은 한국 최고 B2B 세일즈 코치입니다.
다음 리드에 대해 통계 분석 기반 콜 스크립트를 작성하세요.
자연스러운 한국어 비즈니스 대화체로 작성하고, 실제로 전화에서 바로 쓸 수 있게 하세요.

━━━━━━━━━━━━━━━━━━
[리드 분석 데이터]
  회사        : ${lead.company}
  담당자      : ${lead.contact}
  영업단계    : ${lead.stage}
  성공확률    : ${lead.probability}%
  예상계약가치 : ${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}${lead.expectedValue.toLocaleString()}M
  마지막 연락 : ${lead.daysSinceContact}일 전
  마감일      : ${dueLabel}
  위험도      : ${lead.riskLevel.toUpperCase()}
  긴급도 점수 : ${lead.urgencyScore}/100
  담당 영업   : ${lead.owner}
━━━━━━━━━━━━━━━━━━

아래 5개 섹션으로 작성하세요:

## 상황 분석
이 리드의 현재 상황, 위험 요소, 기회 포인트를 2-3문장으로 요약하세요.

## 콜 오프닝 (첫 30초)
전화를 받는 순간부터 어색하지 않게 본론으로 연결하는 실제 대화 스크립트.
[영업: "..."] 형식으로 작성.

## 핵심 확인 질문 3가지
이번 통화에서 반드시 파악해야 할 정보를 얻기 위한 질문.
SPIN 또는 Challenger 방법론 적용. 질문 의도도 간략히 설명.

## 예상 반론 & 대응
가장 가능성 높은 거절/지연 이유 2가지와 각각의 대응 스크립트.

## 이번 통화 목표 (Next Step)
이번 전화로 반드시 합의해야 하는 Next Step 1가지. 구체적 날짜/행동 포함.`;

    const model  = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });
    const result = await model.generateContent(prompt);
    const callScript = result.response.text();

    return NextResponse.json({
      lead: {
        id:            lead.id,
        company:       lead.company,
        contact:       lead.contact,
        stage:         lead.stage,
        probability:   lead.probability,
        revenue_potential: lead.revenue_potential,
        owner:         lead.owner,
      },
      score: {
        urgencyScore:      lead.urgencyScore,
        riskLevel:         lead.riskLevel,
        expectedValue:     lead.expectedValue,
        daysSinceContact:  lead.daysSinceContact,
        daysUntilDue:      lead.daysUntilDue,
        dueLabel,
      },
      callScript,
    });
  } catch (error) {
    console.error('AI Score Error:', error);
    return NextResponse.json({ error: 'AI 분석 실패. API 키를 확인하세요.' }, { status: 500 });
  }
}
