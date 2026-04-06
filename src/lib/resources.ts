// ── Sales Resources Database ─────────────────────────────────────────────────
// Curated books, podcasts, blogs, and newsletters for the Research Library.
// addedAt: ISO date string — used to compute "NEW" badge (within 14 days).

import type { MethodologyId } from "./salesTips";

export type ResourceCategory = "book" | "podcast" | "blog" | "newsletter";

export interface Resource {
  id: string;
  category: ResourceCategory;
  title: string;
  author: string;
  authorTitle: string;
  emoji: string;
  color: string;
  colorBg: string;
  tagline: string;
  description: string;
  keyTakeaways: string[];
  bestFor: string;
  whyItMatters: string;
  methodology: MethodologyId;
  addedAt: string; // ISO date — "NEW" badge if within 14 days
  duration: string; // e.g. "272 pages", "~25 min/episode"
  tags: string[];
}

export const RESOURCES: Resource[] = [
  // ── Books ──────────────────────────────────────────────────────────────────
  {
    id: "book-challenger-sale",
    category: "book",
    title: "The Challenger Sale",
    author: "Matthew Dixon & Brent Adamson",
    authorTitle: "CEB 수석 연구원",
    emoji: "💡",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.08)",
    tagline: "최고의 영업사원은 관계를 쌓지 않는다 — 현상 유지를 흔든다.",
    description:
      "12만 명 이상의 영업사원을 대상으로 한 CEB 연구에서 출발한 이 책은, 최고 성과자들이 공통적으로 쓰는 'Challenger' 패턴을 해부한다. 고객을 불편하게 만들어야 가치를 인정받는다는 역설적 진실을 데이터로 증명한다.",
    keyTakeaways: [
      "최고 성과자는 Relationship Builder가 아니라 Challenger 유형이다",
      "Commercial Teaching: 놀라운 인사이트 → 핵심 문제 연결 → 솔루션 순서로 전달하라",
      "건설적 긴장(Constructive Tension)이 고객의 결정을 앞당긴다",
      "구매자 개인의 역할·우선순위에 맞게 메시지를 재단(Tailoring)하라",
      "대화를 주도(Take Control)하지 못하면 가격 협상만 남는다",
    ],
    bestFor: "복잡한 B2B 세일즈, 고객의 현상 유지를 깨야 하는 상황",
    whyItMatters:
      "대부분의 BD 팀이 관계 구축에 집중하지만, 데이터는 반대를 말한다. 이 책은 '좋은 관계'보다 '날카로운 관점'이 클로징에 더 효과적임을 실증하며, 팀의 피칭 패턴을 근본적으로 재설계하게 만든다.",
    methodology: "Challenger",
    addedAt: "2025-11-01",
    duration: "240 pages",
    tags: ["B2B", "기업영업", "피칭", "인사이트"],
  },
  {
    id: "book-spin-selling",
    category: "book",
    title: "SPIN Selling",
    author: "Neil Rackham",
    authorTitle: "35,000건 영업 미팅 분석",
    emoji: "❓",
    color: "#22c55e",
    colorBg: "rgba(34,197,94,0.08)",
    tagline: "최고의 영업사원은 말을 잘하는 사람이 아니라 질문을 잘하는 사람이다.",
    description:
      "35,000건 이상의 실제 영업 미팅을 직접 관찰·분석해 만들어낸 SPIN 프레임워크. 고객의 고통(Pain)을 4단계 질문으로 증폭시키고, 고객 스스로 솔루션의 가치를 말하게 만드는 방법론을 체계화했다.",
    keyTakeaways: [
      "Situation 질문은 최소화하라 — 지루하고 라포를 낮춘다",
      "Problem 질문으로 잠재된 불만을 표면화하라",
      "Implication 질문이 통증을 증폭시킨다 — 최소 3번 활용하라",
      "Need-Payoff 질문은 고객이 스스로 솔루션을 팔게 만든다",
      "대형 딜에서 Implication 질문 비중이 높을수록 클로즈율이 올라간다",
    ],
    bestFor: "디스커버리 중심의 딜, 고객이 문제를 인지하지 못한 상황",
    whyItMatters:
      "영업에서 '얼마나 잘 설명하느냐'보다 '얼마나 좋은 질문을 하느냐'가 중요하다는 사실을 실증 데이터로 처음 증명한 책. 팀이 피칭 위주에서 질문 위주로 전환해야 할 때 가장 먼저 읽어야 한다.",
    methodology: "SPIN",
    addedAt: "2025-11-01",
    duration: "216 pages",
    tags: ["디스커버리", "질문 기술", "B2B", "고통 발굴"],
  },
  {
    id: "book-predictable-revenue",
    category: "book",
    title: "Predictable Revenue",
    author: "Aaron Ross & Marylou Tyler",
    authorTitle: "Salesforce 아웃바운드 혁신가",
    emoji: "🚀",
    color: "#0ea5e9",
    colorBg: "rgba(14,165,233,0.08)",
    tagline: "세일즈를 예측 가능한 시스템으로 만드는 것이 가장 강력한 성장 엔진이다.",
    description:
      "Salesforce에서 연간 1억 달러 파이프라인을 만들어낸 Outbound 2.0 방법론의 바이블. SDR이라는 직무를 세상에 알렸고, 현대 아웃바운드 세일즈의 표준 플레이북이 된 책이다.",
    keyTakeaways: [
      "Cold Calling 2.0: 전화 없이 이메일로 C레벨에게 적합한 담당자를 소개받아라",
      "Seeds(유기적)·Nets(마케팅)·Spears(아웃바운드) 리드 소스를 분리하라",
      "AE·SDR·CSM 역할 전문화 없이는 예측 가능한 매출도 없다",
      "CEO가 직접 영업하는 구조는 확장이 불가능하다",
      "프로스펙팅 이메일은 짧고(3~5문장), 관련성이 높고, 강압적이지 않아야 한다",
    ],
    bestFor: "아웃바운드 팀 구축, SDR 모델 도입, 파이프라인 예측성 확보",
    whyItMatters:
      "한국 BD 팀 대부분이 인바운드 또는 관계 영업에 의존한다. 이 책은 체계적인 아웃바운드 시스템이 어떻게 예측 가능한 성장을 만드는지 보여주며, 팀 구조를 재설계할 때 가장 현실적인 레퍼런스가 된다.",
    methodology: "Outbound",
    addedAt: "2026-03-20",
    duration: "214 pages",
    tags: ["아웃바운드", "SDR", "파이프라인", "스케일업"],
  },
  {
    id: "book-fanatical-prospecting",
    category: "book",
    title: "Fanatical Prospecting",
    author: "Jeb Blount",
    authorTitle: "Sales Gravy 창립자",
    emoji: "📞",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.08)",
    tagline: "파이프라인의 공백은 모든 영업 문제의 근원이다.",
    description:
      "세일즈 베스트셀러 작가 Jeb Blount가 수백만 명의 영업사원에게 증명해 온 파이프라인 집착의 철학. 전화·이메일·소셜·대면을 섞는 멀티채널 프로스펙팅 전략과 실행 루틴을 구체적으로 다룬다.",
    keyTakeaways: [
      "30일 규칙: 오늘 프로스펙팅을 멈추면 30일 후 파이프라인이 말라버린다",
      "하루 1~2시간을 프로스펙팅 전용 타임블록으로 달력에 고정하라",
      "전화·이메일·소셜·대면을 혼합한 멀티채널 시퀀스를 구성하라",
      "프로스펙팅은 좋아할 필요 없다 — 그냥 해야 한다",
      "콜드콜은 죽지 않았다 — 잘 못하는 사람만 없어졌다",
    ],
    bestFor: "파이프라인이 얇거나 팀의 아웃리치 빈도가 낮을 때",
    whyItMatters:
      "대부분의 BD 팀은 프로스펙팅 부족 문제를 전략 문제로 착각한다. 이 책은 문제의 본질이 실행 빈도와 리듬임을 직설적으로 지적하며, 당장 내일부터 바꿀 수 있는 구체적 루틴을 제시한다.",
    methodology: "Prospecting",
    addedAt: "2026-03-20",
    duration: "304 pages",
    tags: ["프로스펙팅", "콜드콜", "파이프라인", "실행 루틴"],
  },
  {
    id: "book-never-split-the-difference",
    category: "book",
    title: "Never Split the Difference",
    author: "Chris Voss",
    authorTitle: "FBI 수석 인질 협상가 출신",
    emoji: "🧠",
    color: "#ec4899",
    colorBg: "rgba(236,72,153,0.08)",
    tagline: "타협은 나쁜 결과를 두 번 얻는 것이다. 절대 차이를 나누지 마라.",
    description:
      "FBI 수석 인질 협상가가 극한 상황에서 검증한 심리 협상 전술을 B2B 세일즈에 적용한 책. '합리적 설득'이 아닌 '감정 기반 공감'이 협상을 주도한다는 새로운 패러다임을 제시한다.",
    keyTakeaways: [
      "Tactical Empathy: 상대의 감정을 명명(Labeling)해 심리적 안전감을 확보하라",
      "Mirroring: 마지막 3단어를 반복하면 상대가 더 많이 말한다",
      "Calibrated Questions: '어떻게 해야 할까요?'로 상대가 해법을 직접 찾게 하라",
      "'No'를 먼저 유도하면 상대는 안전함을 느끼고 협상이 실질적으로 시작된다",
      "Late Night FM DJ Voice: 낮고 차분한 목소리가 긴장을 낮추고 주도권을 준다",
    ],
    bestFor: "클로징 단계의 가격·조건 협상, 바이어의 저항이 높은 상황",
    whyItMatters:
      "BD 팀이 가격 협상에서 가장 많이 실수하는 것은 '합리적 양보'다. 이 책은 심리학적으로 왜 양보가 역효과를 내는지 설명하고, 포기 없이 원하는 결과를 얻는 실전 협상 기술을 가르쳐준다.",
    methodology: "Negotiation",
    addedAt: "2026-03-25",
    duration: "288 pages",
    tags: ["협상", "심리", "클로징", "가격 협상"],
  },
  {
    id: "book-new-sales-simplified",
    category: "book",
    title: "New Sales. Simplified.",
    author: "Mike Weinberg",
    authorTitle: "B2B 세일즈 컨설턴트",
    emoji: "🎯",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.08)",
    tagline: "신규 고객 개발이 없는 세일즈팀은 재고 처분 조직이다.",
    description:
      "기업들이 신규 고객 개발(New Business)에서 반복적으로 실패하는 이유를 직설적으로 진단하고, 현장에서 즉시 적용 가능한 신규 영업 전략을 체계적으로 정리한 실전 가이드.",
    keyTakeaways: [
      "Sales Story: 고객의 문제 언어로 자신의 솔루션을 설명하라",
      "타겟 어카운트 리스트 없이는 신규 영업도 없다",
      "전화를 가장 빠른 신뢰 구축 도구로 복권하라",
      "인바운드에만 의존하는 팀은 천천히 죽어간다",
      "영업 관리자의 코칭 부재가 팀 성과 하락의 첫 번째 원인이다",
    ],
    bestFor: "신규 고객 개발이 약하거나 인바운드 의존도가 높은 팀",
    whyItMatters:
      "기존 고객 유지에 치우쳐 신규 파이프라인이 약해진 팀에게 가장 직접적인 처방전을 제시한다. 화려한 이론 없이 현장 BD 팀이 내일부터 당장 바꿀 수 있는 행동 변화에 집중한다.",
    methodology: "General",
    addedAt: "2026-04-01",
    duration: "224 pages",
    tags: ["신규영업", "파이프라인", "B2B", "실전 전략"],
  },
  // ── Podcasts ───────────────────────────────────────────────────────────────
  {
    id: "podcast-30mpc",
    category: "podcast",
    title: "30 Minutes to President's Club",
    author: "Nick Cegelski & Armand Farrokh",
    authorTitle: "세일즈 팟캐스트 Top 1%",
    emoji: "🎙️",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.08)",
    tagline: "이론 없이 현장 AE·SDR이 지금 당장 쓸 수 있는 전술만 다룬다.",
    description:
      "현직 세일즈 톱퍼포머들이 직접 출연해 실제로 쓰는 콜 오프닝, 오브젝션 핸들링, 클로징 전술을 30분 안에 압축해 공유하는 팟캐스트. 추상적인 이론 대신 스크립트와 프레이밍 실례가 풍부하다.",
    keyTakeaways: [
      "콜 오프닝 30초가 미팅 전체의 방향을 결정한다",
      "오브젝션은 거절이 아니라 추가 정보 요청이다",
      "멀티스레딩: 한 명의 챔피언에 의존하지 말고 3명 이상의 스테이크홀더를 확보하라",
      "'다음 단계' 없는 미팅은 기회 낭비다",
      "클로징은 마지막 한 방이 아니라 전체 프로세스다",
    ],
    bestFor: "AE·SDR의 실전 전술 업그레이드, 팀 스크립트 개선",
    whyItMatters:
      "국내 세일즈 팟캐스트가 거의 없는 상황에서 영어권 최고 실전 팟캐스트다. 에피소드당 30분이라 이동 중에 듣기 좋고, 매 에피소드마다 즉시 적용 가능한 전술 한두 가지가 나온다.",
    methodology: "Challenger",
    addedAt: "2026-03-20",
    duration: "~30 min / episode",
    tags: ["팟캐스트", "AE", "SDR", "콜 전술", "클로징"],
  },
  {
    id: "podcast-sales-gravy",
    category: "podcast",
    title: "Sales Gravy Podcast",
    author: "Jeb Blount",
    authorTitle: "Sales Gravy 창립자",
    emoji: "📻",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.08)",
    tagline: "파이프라인 집착과 프로스펙팅 마인드셋을 매주 충전한다.",
    description:
      "Jeb Blount가 직접 진행하는 세일즈 팟캐스트. 프로스펙팅·파이프라인 관리·영업 심리에 대한 심층 인터뷰와 단독 에피소드를 매주 제공한다. 현장 세일즈맨의 언어로 말하는 게 특징이다.",
    keyTakeaways: [
      "파이프라인 관리는 전략이 아니라 습관의 문제다",
      "거절 민감성(Rejection Sensitivity)을 극복하는 마인드셋 훈련법",
      "영업 슬럼프의 95%는 프로스펙팅 부족에서 온다",
      "멀티채널 시퀀스 설계의 실전 사례",
      "고성과 영업사원의 하루 루틴 공개",
    ],
    bestFor: "프로스펙팅 마인드셋 유지, 영업 슬럼프 극복",
    whyItMatters:
      "세일즈는 기술보다 마인드셋이 먼저다. 이 팟캐스트는 매주 필드의 현실적인 언어로 '왜 지금 해야 하는가'를 상기시켜 준다. 출근길 15분이 팀의 실행력을 유지하는 루틴이 될 수 있다.",
    methodology: "Prospecting",
    addedAt: "2026-03-20",
    duration: "~20 min / episode",
    tags: ["팟캐스트", "프로스펙팅", "마인드셋", "파이프라인"],
  },
  {
    id: "podcast-negotiation-made-simple",
    category: "podcast",
    title: "Negotiate Anything",
    author: "Kwame Christian",
    authorTitle: "American Negotiation Institute 창립자",
    emoji: "🤝",
    color: "#ec4899",
    colorBg: "rgba(236,72,153,0.08)",
    tagline: "협상은 특별한 상황이 아니다 — 모든 대화가 협상이다.",
    description:
      "협상 전문 변호사이자 강연가 Kwame Christian이 운영하는 협상 전문 팟캐스트. 비즈니스 딜부터 내부 스테이크홀더 설득까지, 실생활 협상 케이스를 심리학 기반으로 분석한다.",
    keyTakeaways: [
      "Compassionate Curiosity: 공감 → 탐색 → 해법 순서로 접근하라",
      "모든 협상은 감정 관리에서 시작된다",
      "내부 협상(상사·동료)이 외부 협상만큼 중요하다",
      "앵커링(최초 제시 숫자)이 최종 합의에 미치는 영향",
      "침묵은 가장 강력한 협상 도구 중 하나다",
    ],
    bestFor: "협상 스킬 개발, 가격·조건 논의 준비, 내부 설득",
    whyItMatters:
      "BD 팀이 놓치기 쉬운 것이 내부 협상(예산 확보, 경영진 설득)이다. Chris Voss가 기술을 가르친다면 Kwame는 일상의 협상 맥락을 넓혀준다. 둘을 함께 들으면 협상 역량이 층위가 달라진다.",
    methodology: "Negotiation",
    addedAt: "2026-04-01",
    duration: "~30 min / episode",
    tags: ["팟캐스트", "협상", "심리", "내부 설득"],
  },
  // ── Blogs / Newsletters ───────────────────────────────────────────────────
  {
    id: "blog-sales-hacker",
    category: "blog",
    title: "Sales Hacker (Pavilion)",
    author: "Pavilion Community",
    authorTitle: "글로벌 세일즈 커뮤니티",
    emoji: "✍️",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.08)",
    tagline: "B2B 세일즈의 전략·전술·툴·케이스 스터디를 가장 빠르게 다룬다.",
    description:
      "전 세계 세일즈 리더들이 직접 기고하는 B2B 세일즈 미디어. 아웃바운드 시퀀스 설계부터 세일즈 AI 활용법까지 현장 중심의 콘텐츠를 빠르게 다룬다. Pavilion 커뮤니티와 연동되어 네트워크 가치도 있다.",
    keyTakeaways: [
      "매주 새로운 SDR·AE 전술 케이스 스터디",
      "세일즈 테크 스택 비교·추천 (CRM, 시퀀서, 인텔리전스 툴)",
      "리버뉴 오퍼레이션(RevOps) 트렌드 조기 파악 가능",
      "글로벌 세일즈 리더들의 전략적 인터뷰",
      "세일즈 채용·온보딩·코칭 프레임워크 다수",
    ],
    bestFor: "세일즈 트렌드 파악, 전략적 아이디어 소싱, 팀 온보딩 자료",
    whyItMatters:
      "국내 BD 팀이 글로벌 세일즈 트렌드와 단절되기 쉬운 환경에서, Sales Hacker는 검증된 해외 사례를 실시간으로 공급한다. 주 1회 뉴스레터 구독만으로도 팀 전략 회의의 질이 달라진다.",
    methodology: "General",
    addedAt: "2026-03-20",
    duration: "주 2~3편",
    tags: ["블로그", "B2B", "세일즈 테크", "RevOps", "케이스 스터디"],
  },
  {
    id: "newsletter-leapsome-rev",
    category: "newsletter",
    title: "The Revenue Architect",
    author: "Kyle Poyar (OpenView)",
    authorTitle: "OpenView Venture Partners 파트너",
    emoji: "📧",
    color: "#0ea5e9",
    colorBg: "rgba(14,165,233,0.08)",
    tagline: "PLG·세일즈 모션·GTM 전략을 가장 정확하게 분석하는 뉴스레터.",
    description:
      "OpenView의 파트너 Kyle Poyar가 운영하는 GTM 전략 뉴스레터. Product-Led Growth와 Sales-Led Growth의 교차점에서 발생하는 실전 이슈들을 데이터 기반으로 분석한다. SaaS B2B에 특히 유용하다.",
    keyTakeaways: [
      "PLG + SLG 하이브리드 모션의 실전 설계 방법",
      "세일즈 모션에 영향을 주는 제품·가격 전략 연계",
      "GTM팀의 실험 설계와 결과 해석 프레임워크",
      "세일즈 속도(Velocity) 지표 최적화 케이스",
      "업계 벤치마크 데이터 정기 공유",
    ],
    bestFor: "SaaS BD팀, GTM 전략 수립, 세일즈 모션 재설계",
    whyItMatters:
      "세일즈 실행에 집중하다 보면 제품·가격·GTM 전략의 큰 그림을 놓치기 쉽다. 이 뉴스레터는 BD 팀이 전략적 시야를 유지하면서 실행과 전략을 연결하는 언어를 제공한다.",
    methodology: "Outbound",
    addedAt: "2026-04-05",
    duration: "주 1회",
    tags: ["뉴스레터", "PLG", "GTM", "SaaS", "전략"],
  },
  {
    id: "newsletter-anthony-iannarino",
    category: "newsletter",
    title: "The Sales Blog",
    author: "Anthony Iannarino",
    authorTitle: "B2B 세일즈 작가·강연가",
    emoji: "📝",
    color: "#22c55e",
    colorBg: "rgba(34,197,94,0.08)",
    tagline: "매일 짧고 날카로운 한 가지 세일즈 원칙을 전달한다.",
    description:
      "Anthony Iannarino가 15년 넘게 매일 발행하는 세일즈 블로그. 700단어 안팎의 짧은 포스트로 하나의 원칙을 깊게 파고드는 방식이 특징이다. 읽는 데 5분, 적용하면 하루가 달라진다.",
    keyTakeaways: [
      "가치 창출은 솔루션 설명이 아니라 고객 관점의 재구성이다",
      "영업 심리와 마인드셋에 대한 깊이 있는 일상 성찰",
      "ONE-UP: 고객보다 한 수 위의 전문성을 갖춰야 진짜 가치를 줄 수 있다",
      "영업 리더십: 코칭과 관리의 차이",
      "세일즈 프로세스 설계와 실행의 간극을 메우는 방법",
    ],
    bestFor: "매일 5분 세일즈 사고력 훈련, 팀 아침 브리핑 자료",
    whyItMatters:
      "세일즈는 지식보다 사고의 습관이다. 매일 하나의 원칙을 읽는 루틴이 팀의 영업 언어와 사고 방식을 서서히 바꾼다. 뉴스레터 구독 후 팀에 주 1회 공유하는 것만으로도 코칭 효과가 생긴다.",
    methodology: "General",
    addedAt: "2026-04-05",
    duration: "매일 1편 (~5분)",
    tags: ["블로그", "뉴스레터", "마인드셋", "B2B", "리더십"],
  },
];

/** 카테고리 레이블 */
export const RESOURCE_CATEGORY_LABEL: Record<ResourceCategory, string> = {
  book: "Book",
  podcast: "Podcast",
  blog: "Blog",
  newsletter: "Newsletter",
};

/** 카테고리 아이콘 이모지 */
export const RESOURCE_CATEGORY_EMOJI: Record<ResourceCategory, string> = {
  book: "📚",
  podcast: "🎙️",
  blog: "✍️",
  newsletter: "📧",
};

/** 추가된 지 N일 이내인지 확인 (NEW 배지) */
export function isNewResource(addedAt: string, withinDays = 14): boolean {
  const added = new Date(addedAt).getTime();
  const now = Date.now();
  return now - added < withinDays * 86_400_000;
}

/** 주간 추천 리소스 (주 단위 로테이션) */
export function getWeeklyResource(): Resource {
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  return RESOURCES[week % RESOURCES.length];
}
