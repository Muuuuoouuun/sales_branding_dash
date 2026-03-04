import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { regionalData, individuals, methodology } = await req.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
당신은 한국 시니어 세일즈 전략 컨설턴트입니다. 다음 영업 데이터를 분석하고 한국어로 전략 인사이트를 제공하세요.

적용 방법론: ${methodology}

지역별 실적:
${JSON.stringify(regionalData, null, 2)}

개인별 실적:
${JSON.stringify(individuals, null, 2)}

아래 정확히 3개의 섹션으로 구분해서 응답하세요 (섹션 제목은 ## 형식 유지):

## 현재상태 진단
현재 팀 성과를 2-3문장으로 요약. 숫자를 반드시 포함.

## 전략 방향성
${methodology} 방법론 관점에서 2-3개 전략 방향. 각 항목은 새 줄로.

## 즉시 실행 플랜
이번 주 내 실행 가능한 3개 액션. 번호(1. 2. 3.) 형식으로.

각 섹션은 간결하고 실행 가능하게 작성하세요.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ insight: text });
  } catch (error) {
    console.error('AI Project Strategy Error:', error);
    return NextResponse.json(
      { insight: 'AI 분석 실패. GEMINI_API_KEY를 확인하세요.' },
      { status: 500 },
    );
  }
}
