import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { stats, regional, individuals, scores } = await req.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
당신은 한국 시니어 세일즈 전략 컨설턴트입니다. 다음 Q1 2026 영업 실적 데이터를 분석하고 경영진 보고용 전략 리포트를 한국어로 작성하세요.

[KPI 요약]
${JSON.stringify(stats, null, 2)}

[지역별 실적]
${JSON.stringify(regional, null, 2)}

[개인별 성과]
${JSON.stringify(individuals, null, 2)}

[Focus Score]
${JSON.stringify(scores, null, 2)}

아래 정확히 4개의 섹션으로 구분해서 응답하세요 (섹션 제목은 ## 형식 유지):

## 종합 성과 진단
전체 팀 Q1 실적을 3-4문장으로 요약. 핵심 숫자(달성률, 매출, 건수) 반드시 포함. 강점과 약점 모두 언급.

## 지역별 분석
성과 상위/하위 지역을 각각 1-2개 선정해 원인 분석. 각 항목은 "- 지역명:" 으로 시작.

## 개인 성과 인사이트
Top performer와 Bottom performer 각 1명씩 분석. 격차 원인과 코칭 포인트 포함.

## 즉시 실행 액션플랜
이번 주 내 실행 가능한 4개 액션 아이템. "1." "2." "3." "4." 번호 형식. 담당자/지역 명시.

각 섹션은 실무자가 바로 활용할 수 있을 만큼 구체적으로 작성하세요.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ report: text });
  } catch (error) {
    console.error('AI Report Error:', error);
    return NextResponse.json(
      { report: 'AI 리포트 생성 실패. GEMINI_API_KEY를 확인하세요.' },
      { status: 500 },
    );
  }
}
