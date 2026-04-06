// ── Sales Tips Database ─────────────────────────────────────────────────────
// Rotates daily. Use getDailyTip() to get today's tip.

export type MethodologyId = "Challenger" | "SPIN" | "MEDDIC" | "Sandler" | "General" | "Outbound" | "Prospecting" | "Negotiation";

export interface SalesTipEntry {
  id: number;
  methodology: MethodologyId;
  methodologyKr: string;
  color: string;
  tip: string;
  source: string;
}

export const SALES_TIPS: SalesTipEntry[] = [
  // ── Challenger Sale ──────────────────────────────────────────────────────
  {
    id: 1, methodology: "Challenger", methodologyKr: "Challenger Sale", color: "#6366f1",
    tip: "먼저 가르쳐라, 그 다음 피칭하라. 고객이 미처 몰랐던 인사이트로 사고방식을 흔들어라.",
    source: "Matthew Dixon",
  },
  {
    id: 2, methodology: "Challenger", methodologyKr: "Challenger Sale", color: "#6366f1",
    tip: "최고의 영업사원은 관계만 쌓지 않는다 — 고객의 현상 유지를 흔들어 불편한 진실을 직면하게 한다.",
    source: "The Challenger Sale",
  },
  {
    id: 3, methodology: "Challenger", methodologyKr: "Challenger Sale", color: "#6366f1",
    tip: "건설적 긴장(Constructive Tension)이 딜을 만든다. 불편함을 피하지 마라.",
    source: "Brent Adamson",
  },
  {
    id: 4, methodology: "Challenger", methodologyKr: "Challenger Sale", color: "#6366f1",
    tip: "Commercial Teaching: 놀라운 인사이트 → 핵심 문제 연결 → 당신의 솔루션 순서로 전달하라.",
    source: "Challenger Sale Framework",
  },
  {
    id: 5, methodology: "Challenger", methodologyKr: "Challenger Sale", color: "#6366f1",
    tip: "Tailor your pitch: 구매자의 역할, 우선순위, 개인 성향에 맞게 메시지를 재단하라.",
    source: "The Challenger Sale",
  },
  // ── SPIN Selling ─────────────────────────────────────────────────────────
  {
    id: 6, methodology: "SPIN", methodologyKr: "SPIN Selling", color: "#22c55e",
    tip: "Situation → Problem → Implication → Need-Payoff. 이 순서를 어기면 저항이 생긴다.",
    source: "Neil Rackham",
  },
  {
    id: 7, methodology: "SPIN", methodologyKr: "SPIN Selling", color: "#22c55e",
    tip: "Implication 질문이 통증을 증폭시킨다. '이 문제가 계속되면 어떻게 됩니까?'를 최소 3번 물어라.",
    source: "SPIN Selling",
  },
  {
    id: 8, methodology: "SPIN", methodologyKr: "SPIN Selling", color: "#22c55e",
    tip: "Need-Payoff 질문은 고객이 스스로 솔루션을 팔게 만든다. '해결된다면 얼마나 가치 있을까요?'",
    source: "Neil Rackham",
  },
  {
    id: 9, methodology: "SPIN", methodologyKr: "SPIN Selling", color: "#22c55e",
    tip: "대형 딜에서 Implication 질문을 3배 이상 사용하면 클로즈율이 유의미하게 높아진다.",
    source: "SPIN Research Data",
  },
  {
    id: 10, methodology: "SPIN", methodologyKr: "SPIN Selling", color: "#22c55e",
    tip: "솔루션으로 바로 뛰어들지 마라. 진짜 Implication Pain을 먼저 표면화하라.",
    source: "SPIN Selling",
  },
  // ── MEDDIC ───────────────────────────────────────────────────────────────
  {
    id: 11, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "명확한 Economic Buyer 없이는 진짜 딜이 아니다. 첫 번째 미팅에서 누가 최종 승인자인지 파악하라.",
    source: "Jack Napoli",
  },
  {
    id: 12, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "피치 전에 Decision Criteria를 문서화하라. 기준을 먼저 설정하는 자가 이긴다.",
    source: "MEDDIC Framework",
  },
  {
    id: 13, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "Champion은 단순한 팬이 아니다. 내부 권력을 갖고 있어야 하며, 기꺼이 그 권력을 사용해야 한다.",
    source: "MEDDIC",
  },
  {
    id: 14, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "임원 레벨의 Pain을 찾아라. 운영 불편은 예산을 움직이지 않는다. 전략적 위험이어야 한다.",
    source: "MEDDPICC",
  },
  {
    id: 15, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "Paper Process가 Velocity를 죽인다. 계약 전 모든 승인 단계와 담당자를 미리 파악하라.",
    source: "MEDDPICC",
  },
  {
    id: 16, methodology: "MEDDIC", methodologyKr: "MEDDIC/MEDDPICC", color: "#f59e0b",
    tip: "경쟁 분석: 항상 '아무것도 안 하는 것(Status Quo)'을 가장 강력한 경쟁자로 포함하라.",
    source: "MEDDIC",
  },
  // ── Sandler System ───────────────────────────────────────────────────────
  {
    id: 17, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "절대로 고객보다 딜을 더 원하면 안 된다. 간절함은 협상력을 무너뜨린다.",
    source: "David Sandler",
  },
  {
    id: 18, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "Dummy Up before you pitch: 충분히 질문하고 듣기 전까지는 솔루션을 제시하지 마라.",
    source: "Sandler Rules",
  },
  {
    id: 19, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "Negative Reverse Selling: '어쩌면 이게 맞지 않을 수도 있겠네요.' — 역설적으로 참여도가 높아진다.",
    source: "Sandler System",
  },
  {
    id: 20, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "매 통화 시작 시 Up-Front Contract를 맺어라. 기대 결과와 시간을 합의하면 컨트롤이 생긴다.",
    source: "David Sandler",
  },
  {
    id: 21, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "Sandler Rule #7: 오늘 판 것을 내일 다시 사지 마라. 합의된 것을 재검토하지 마라.",
    source: "Sandler 49 Rules",
  },
  {
    id: 22, methodology: "Sandler", methodologyKr: "Sandler System", color: "#ef4444",
    tip: "Budget은 지불 능력이 아니라 투자 의지의 문제다. 의지를 먼저 확인하라.",
    source: "Sandler System",
  },
  // ── General Sales Wisdom ─────────────────────────────────────────────────
  {
    id: 23, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "최고의 후속 이메일은 고객이 직접 언급한 '다음 단계'로 시작한다.",
    source: "Universal Sales Principle",
  },
  {
    id: 24, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "제안 후 침묵은 정보다. 숨쉬게 하라. 먼저 말하는 사람이 협상에서 불리해진다.",
    source: "Negotiation",
  },
  {
    id: 25, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "CRM은 당신의 기억이다. 기록되지 않으면 일어나지 않은 것이다.",
    source: "Sales Operations",
  },
  {
    id: 26, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "Velocity > Volume. 잘 검증된 딜 1개가 유령 딜 10개보다 팀 에너지를 지킨다.",
    source: "Pipeline Management",
  },
  {
    id: 27, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "모든 'No'는 '아직 아니다'가 압축된 것이다. 올바른 질문이 압축을 풀어준다.",
    source: "Sales Psychology",
  },
  {
    id: 28, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "고객의 언어로 말하라. 제품 용어가 아닌 그들의 비즈니스 문제 언어로.",
    source: "Value Selling",
  },
  {
    id: 29, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "클로징은 한 순간이 아니다. 모든 통화에서 작은 합의(Micro-Commitment)를 얻어라.",
    source: "Micro-Commitments",
  },
  {
    id: 30, methodology: "General", methodologyKr: "세일즈 원칙", color: "#818cf8",
    tip: "좋은 영업사원은 듣고, 위대한 영업사원은 질문한다. 최고의 질문이 최고의 인사이트를 만든다.",
    source: "Active Listening",
  },
  // ── Predictable Revenue (Outbound) ───────────────────────────────────────
  {
    id: 31, methodology: "Outbound", methodologyKr: "Predictable Revenue", color: "#0ea5e9",
    tip: "CEO가 직접 콜드콜을 하면 안 된다. 시스템이 파이프라인을 만들어야 한다.",
    source: "Aaron Ross",
  },
  {
    id: 32, methodology: "Outbound", methodologyKr: "Predictable Revenue", color: "#0ea5e9",
    tip: "Cold Calling 2.0: 전화 없이 콜드 이메일로 C레벨에게 적합한 담당자를 소개받아라.",
    source: "Predictable Revenue",
  },
  {
    id: 33, methodology: "Outbound", methodologyKr: "Predictable Revenue", color: "#0ea5e9",
    tip: "Seeds·Nets·Spears — 리드 소스를 3가지로 분류하고 각각 다른 전략을 적용하라.",
    source: "Aaron Ross",
  },
  {
    id: 34, methodology: "Outbound", methodologyKr: "Predictable Revenue", color: "#0ea5e9",
    tip: "SDR 없이 AE가 아웃바운드까지 맡으면 두 가지 모두 제대로 할 수 없다.",
    source: "Predictable Revenue",
  },
  {
    id: 35, methodology: "Outbound", methodologyKr: "Predictable Revenue", color: "#0ea5e9",
    tip: "예측 가능한 매출의 핵심은 인바운드가 아니라 반복 가능한 아웃바운드 시스템이다.",
    source: "Aaron Ross",
  },
  // ── Fanatical Prospecting ─────────────────────────────────────────────────
  {
    id: 36, methodology: "Prospecting", methodologyKr: "Fanatical Prospecting", color: "#8b5cf6",
    tip: "빈 파이프라인이 모든 영업 문제의 근원이다. 프로스펙팅을 멈추는 순간 30일 후 파이프라인이 말라버린다.",
    source: "Jeb Blount",
  },
  {
    id: 37, methodology: "Prospecting", methodologyKr: "Fanatical Prospecting", color: "#8b5cf6",
    tip: "하루 1~2시간을 프로스펙팅 전용 타임블록으로 달력에 고정하라. 비상사태 외에는 절대 건드리지 마라.",
    source: "Fanatical Prospecting",
  },
  {
    id: 38, methodology: "Prospecting", methodologyKr: "Fanatical Prospecting", color: "#8b5cf6",
    tip: "전화·이메일·소셜·대면을 섞어라. 한 채널에 의존하는 순간 파이프라인이 취약해진다.",
    source: "Jeb Blount",
  },
  {
    id: 39, methodology: "Prospecting", methodologyKr: "Fanatical Prospecting", color: "#8b5cf6",
    tip: "프로스펙팅은 미래의 자신에게 보내는 선물이다. 지금의 고통이 다음 분기의 파이프라인이 된다.",
    source: "Fanatical Prospecting",
  },
  {
    id: 40, methodology: "Prospecting", methodologyKr: "Fanatical Prospecting", color: "#8b5cf6",
    tip: "최고의 영업사원은 프로스펙팅을 좋아하지 않는다 — 그냥 한다. 감정은 행동 다음에 온다.",
    source: "Jeb Blount",
  },
  // ── Never Split the Difference (Negotiation) ─────────────────────────────
  {
    id: 41, methodology: "Negotiation", methodologyKr: "Never Split the Difference", color: "#ec4899",
    tip: "타협은 나쁜 결과를 두 번 얻는 것이다. 절대 차이를 나누지 마라.",
    source: "Chris Voss",
  },
  {
    id: 42, methodology: "Negotiation", methodologyKr: "Never Split the Difference", color: "#ec4899",
    tip: "Tactical Empathy: 상대방이 듣고 싶은 말이 아닌, 느끼는 감정을 먼저 명명하라.",
    source: "Never Split the Difference",
  },
  {
    id: 43, methodology: "Negotiation", methodologyKr: "Never Split the Difference", color: "#ec4899",
    tip: "'No'는 대화의 끝이 아니라 진짜 협상의 시작이다. 'No'를 유도해서 안전감을 줘라.",
    source: "Chris Voss",
  },
  {
    id: 44, methodology: "Negotiation", methodologyKr: "Never Split the Difference", color: "#ec4899",
    tip: "Mirroring: 상대의 마지막 3단어를 그대로 반복하면 상대는 더 많이 말하게 된다.",
    source: "Never Split the Difference",
  },
  {
    id: 45, methodology: "Negotiation", methodologyKr: "Never Split the Difference", color: "#ec4899",
    tip: "Calibrated Question: '어떻게 해야 할까요?'는 협박 없이 상대가 스스로 해법을 찾게 만드는 가장 강력한 질문이다.",
    source: "Chris Voss",
  },
];

/** 오늘 날짜 기반 팁 반환 (하루 단위 로테이션) */
export function getDailyTip(offset = 0): SalesTipEntry {
  const date = new Date();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const idx = (dayOfYear + offset) % SALES_TIPS.length;
  return SALES_TIPS[(idx + SALES_TIPS.length) % SALES_TIPS.length];
}

/** 특정 methodology의 팁만 반환 */
export function getTipsByMethodology(methodology: MethodologyId): SalesTipEntry[] {
  return SALES_TIPS.filter((t) => t.methodology === methodology);
}

/** 팁 조회 기록 (localStorage) — GrowthWidget 스트릭 카운트용 */
export function recordTipRead(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `tips_today_${today}`;
  const prev = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(prev + 1));
  const total = parseInt(localStorage.getItem("tips_total") || "0", 10);
  localStorage.setItem("tips_total", String(total + 1));
}

export interface SalesLegend {
  id: MethodologyId;
  name: string;
  methodTitle: string;
  title: string;
  emoji: string;
  color: string;
  colorBg: string;
  bio: string;
  quotes: string[];
  principles: string[];
  signatureMove: string;
}

export const SALES_LEGENDS: SalesLegend[] = [
  {
    id: "Challenger",
    name: "Matthew Dixon",
    methodTitle: "The Challenger Sale",
    title: "CEB 수석 연구원",
    emoji: "💡",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.1)",
    bio: "12만 명 이상의 영업사원을 대상으로 한 CEB 연구를 통해 최고 성과자의 공통점을 발견한 Challenger 방법론의 창시자. Brent Adamson과 함께 집필한 『The Challenger Sale』은 출판 즉시 글로벌 B2B 세일즈 필독서가 됐다. 후속작 『The Challenger Customer』에서는 복잡한 구매 의사결정 구조 속에서 어떻게 내부 컨센서스를 이끌어내는지를 심층 분석했다.",
    quotes: [
      "최고의 영업사원은 관계를 쌓는 것이 아니라 고객의 현상 유지를 흔드는 사람이다.",
      "고객은 영업사원이 쉽게 동의해 줄 때가 아니라 무언가를 가르쳐 줄 때 더 가치를 느낀다.",
      "편안한 대화는 좋은 대화가 아니다. 진짜 가치 있는 대화는 불편함을 만든다.",
      "솔루션을 팔기 전에 고객의 사고방식부터 바꿔라. 프레임을 먼저 가져가는 자가 딜을 가져간다.",
    ],
    principles: [
      "가르쳐라 — 고객이 미처 몰랐던 인사이트로 경쟁자와 차별화하라",
      "맞춰라 — 의사결정권자 개인의 우선순위와 성향에 맞게 메시지를 재단하라",
      "장악하라 — 건설적 긴장으로 대화를 주도하고 다음 단계를 먼저 제안하라",
      "Commercial Teaching — 인사이트 → 리프레이밍 → 솔루션 연결의 흐름을 설계하라",
    ],
    signatureMove: "Commercial Teaching — 놀라운 인사이트로 시작해 고객의 사고를 재구성하고 자연스럽게 솔루션으로 연결",
  },
  {
    id: "SPIN",
    name: "Neil Rackham",
    methodTitle: "SPIN Selling",
    title: "35,000건 영업 미팅 분석",
    emoji: "❓",
    color: "#22c55e",
    colorBg: "rgba(34,197,94,0.1)",
    bio: "35,000건 이상의 실제 영업 미팅을 직접 관찰·분석한 영업 과학의 아버지. 질문이 설득보다 강하다는 사실을 데이터로 증명한 최초의 연구자다. 그의 연구는 Xerox·IBM 등 글로벌 기업의 세일즈 트레이닝 표준을 바꿨고, SPIN 모델은 오늘날에도 가장 검증된 B2B 디스커버리 프레임워크로 쓰인다.",
    quotes: [
      "사람들은 감정적으로 구매하고 논리적으로 정당화한다.",
      "최고의 영업사원은 말을 잘하는 사람이 아니라 질문을 잘하는 사람이다.",
      "Implication 질문 하나가 열 번의 Feature 설명보다 강력하다.",
      "고객이 스스로 문제의 심각성을 발견하게 하라. 그것이 진짜 긴급함을 만든다.",
    ],
    principles: [
      "Situation 질문은 최소화 — 지루하고 라포를 낮추며 시간을 낭비한다",
      "Problem 질문으로 불만을 표면화 — 고객이 인지하지 못한 고통을 드러내라",
      "Implication으로 통증을 증폭 — 문제의 파급효과와 비용을 심화하라",
      "Need-Payoff로 마무리 — 고객 스스로 솔루션의 가치를 말하게 하라",
    ],
    signatureMove: "Implication 질문 — '이 문제가 계속된다면 조직 전체에 어떤 영향이 올까요?'",
  },
  {
    id: "MEDDIC",
    name: "Jack Napoli",
    methodTitle: "MEDDIC",
    title: "PTC 전설적 VP of Sales",
    emoji: "🎯",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.1)",
    bio: "PTC에서 MEDDIC을 개발해 연간 매출을 2억 달러에서 10억 달러로 성장시킨 B2B 영업의 전설. 자격 심사가 클로징보다 중요하다는 원칙을 세우고, '딜을 예측하려면 먼저 검증하라'는 철학으로 영업 포캐스팅의 신뢰도를 혁신했다. 오늘날 MEDDIC/MEDDPICC는 SaaS 및 엔터프라이즈 세일즈의 글로벌 표준 자격 심사 프레임워크가 됐다.",
    quotes: [
      "Economic Buyer를 찾지 못했다면 딜이 없는 것이다.",
      "자격 심사(Qualification)는 영업 프로세스의 끝이 아니라 시작이다.",
      "Metrics 없는 가치 제안은 그냥 이야기일 뿐이다.",
      "Champion이 없다면 내부에서 딜을 밀어줄 사람도 없다. 챔피언 육성이 곧 클로징이다.",
    ],
    principles: [
      "Metrics — ROI와 절감액 등 숫자로 말하고 숫자로 증명하라",
      "Economic Buyer — 최종 예산 결정권자를 반드시 직접 만나고 검증하라",
      "Decision Criteria — 구매 기준을 먼저 문서화해 평가 기준을 선점하라",
      "Champion — 내부에서 권력이 있고 기꺼이 쓰려는 사람을 반드시 육성하라",
    ],
    signatureMove: "Champion 테스트 — '이 딜이 막혔을 때 당신이 직접 나서서 밀어붙일 수 있나요?'",
  },
  {
    id: "Sandler",
    name: "David H. Sandler",
    methodTitle: "Sandler Training",
    title: "역발상 영업의 아버지",
    emoji: "🔴",
    color: "#ef4444",
    colorBg: "rgba(239,68,68,0.1)",
    bio: "보험 영업의 연이은 실패 후 인간 심리와 행동 과학을 바탕으로 역발상 영업 시스템을 개발한 Sandler Training의 창시자. 기존의 '밀어붙이기 영업'을 완전히 뒤집어 고객이 먼저 원하게 만드는 방법론을 설계했다. 오늘날 200개국 이상 2,000개 이상의 사무소를 통해 전 세계 영업사원들을 교육하고 있다.",
    quotes: [
      "프로스펙팅은 좋아할 필요가 없다. 그냥 해야 한다.",
      "영업사원이 딜을 고객보다 더 원하는 순간 협상력을 잃는다.",
      "Pain 없이 제안하지 마라. 먼저 Pain을 찾아라.",
      "가장 강력한 클로징 기술은 '아니오'를 기꺼이 받아들이는 자세다.",
    ],
    principles: [
      "Up-Front Contract — 매 미팅 전에 기대와 결과를 먼저 명시적으로 합의하라",
      "Pain 우선 — 지적·감정·재정적 고통의 세 가지 레이어를 모두 발굴하라",
      "'NO'도 성공 — 가망 없는 딜에 시간을 낭비하지 말고 빠르게 정리하라",
      "Dummy Curve — 전문가처럼 보이려 하지 말고, 모르는 척 더 많이 들어라",
    ],
    signatureMove: "Negative Reverse — '어쩌면 이게 지금 맞지 않을 수도 있겠네요.' (역설적 참여 유도로 진짜 의견을 끌어냄)",
  },
  {
    id: "Outbound",
    name: "Aaron Ross",
    methodTitle: "Predictable Revenue",
    title: "Salesforce 아웃바운드 혁신가",
    emoji: "🚀",
    color: "#0ea5e9",
    colorBg: "rgba(14,165,233,0.1)",
    bio: "Salesforce에서 Outbound 2.0 모델을 개발해 연간 1억 달러 파이프라인을 만들어낸 창시자. SDR 역할의 아버지로 불리며 현대 아웃바운드 세일즈의 표준 구조를 설계했다. '예측 가능한 매출'이라는 개념을 B2B 세일즈의 핵심 철학으로 정착시켰으며, 『Predictable Revenue』는 SaaS 세일즈팀의 바이블이 됐다.",
    quotes: [
      "CEO가 직접 콜드콜을 해서는 안 된다. 시스템이 해야 한다.",
      "세일즈를 예측 가능하게 만드는 것이 가장 강력한 성장 엔진이다.",
      "Cold Calling 2.0: 전화보다 먼저 이메일로 레퍼럴을 요청하라.",
      "영웅적 개인에 의존하는 세일즈팀은 확장이 불가능하다. 시스템이 답이다.",
    ],
    principles: [
      "Specialization — AE·SDR·CSM 역할을 분리해 각자의 전문성을 극대화하라",
      "Systems First — 개인 영웅에 의존하지 말고 반복 가능한 아웃바운드 시스템을 구축하라",
      "Seeds·Nets·Spears — 리드 소스를 3가지로 분류하고 각각 다른 전략을 적용하라",
      "Niche First — 타겟을 좁혀야 메시지가 날카로워지고 응답률이 올라간다",
    ],
    signatureMove: "Cold Calling 2.0 — 전화 없이 콜드 이메일로 C레벨 임원에게 적합한 담당자를 소개받는 레퍼럴 방식",
  },
  {
    id: "Prospecting",
    name: "Jeb Blount",
    methodTitle: "Fanatical Prospecting",
    title: "파이프라인 집착의 철학자",
    emoji: "📞",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.1)",
    bio: "Sales Gravy 창립자이자 세계 최고 세일즈 팟캐스트 운영자. '파이프라인 집착'이야말로 세일즈 성공의 가장 확실한 공식임을 수백만 명의 영업사원에게 증명해 온 현장 중심 코치. 7권의 세일즈 베스트셀러를 집필했으며, 그 중 『Fanatical Prospecting』은 출간 이후 전 세계 영업 현장에서 가장 많이 읽히는 파이프라인 관리 교과서가 됐다.",
    quotes: [
      "파이프라인의 공백은 모든 영업 문제의 근원이다.",
      "프로스펙팅은 미래의 자신에게 보내는 선물이다.",
      "30일 규칙: 지금 당장 프로스펙팅을 멈추면 30일 후 파이프라인이 말라버린다.",
      "콜드콜은 죽지 않았다. 콜드콜을 잘 못하는 사람이 없어진 것처럼 보일 뿐이다.",
    ],
    principles: [
      "Fanatical Mindset — 프로스펙팅은 선택이 아니라 세일즈맨의 생존 본능이다",
      "Multi-channel — 전화·이메일·소셜·대면을 섞어 접점을 최대화하라",
      "30-Day Rule — 오늘의 프로스펙팅이 정확히 30일 후 파이프라인을 결정한다",
      "Time Blocking — 프로스펙팅 시간을 달력에 먼저 고정하고 비상사태 외엔 절대 건드리지 마라",
    ],
    signatureMove: "Time Blocking — 하루 최소 1~2시간을 프로스펙팅 전용 블록으로 달력에 고정하고 신성불가침 영역으로 지켜라",
  },
  {
    id: "Negotiation",
    name: "Chris Voss",
    methodTitle: "Never Split the Difference",
    title: "FBI 수석 인질 협상가 출신",
    emoji: "🧠",
    color: "#ec4899",
    colorBg: "rgba(236,72,153,0.1)",
    bio: "FBI 수석 인질 협상가 출신으로, 극한 상황에서 검증된 심리 협상 기술을 B2B 세일즈에 적용해 '절충'이 아닌 '공감 기반 설득'의 새 패러다임을 제시했다. Black Swan Group 창립자로 현재 전 세계 Fortune 500 기업들에게 협상 전략을 코칭 중이다. 그의 책 『Never Split the Difference』는 협상 분야의 가장 실용적인 바이블로 평가받는다.",
    quotes: [
      "타협은 나쁜 결과를 두 번 얻는 것이다. 절대 차이를 나누지 마라.",
      "'No'는 대화의 끝이 아니라 진짜 협상의 시작이다.",
      "Tactical Empathy: 상대방이 듣고 싶은 말이 아닌, 느끼는 감정을 먼저 명명하라.",
      "침묵은 가장 저평가된 협상 도구다. 말하고 싶은 충동을 이기는 자가 주도권을 갖는다.",
    ],
    principles: [
      "Tactical Empathy — 상대의 감정을 먼저 명명해 심리적 안전감을 확보하라",
      "Mirroring — 마지막 1~3단어를 반복해 상대가 스스로 더 많이 말하게 유도하라",
      "Calibrated Questions — '어떻게' '무엇이' 질문으로 상대가 직접 해법을 찾게 만들어라",
      "Accusation Audit — 상대가 할 수 있는 부정적 말을 먼저 꺼내 방어를 무장해제하라",
    ],
    signatureMove: "Late Night FM DJ Voice — 낮고 차분한 목소리 톤으로 상대의 긴장을 낮추고 협상 주도권을 가져와라",
  },
];

/** 오늘의 레전드 (주 단위 로테이션, 4명 순환) */
export function getLegendOfDay(): SalesLegend {
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  return SALES_LEGENDS[week % SALES_LEGENDS.length];
}

// ── Guru Tips for contextual pages ──────────────────────────────────────────
// Short, game-tip-style one-liners paired with a guru source.

export interface GuruTip {
  text: string;
  guru: string;
  methodology: MethodologyId;
  color: string;
}

/** Research 페이지 전용 — 방법론 학습 맥락 팁 */
const RESEARCH_GURU_TIPS: GuruTip[] = [
  { text: "먼저 가르쳐라, 그 다음 피칭하라.", guru: "Matthew Dixon", methodology: "Challenger", color: "#6366f1" },
  { text: "최고의 영업사원은 현상 유지를 흔드는 사람이다.", guru: "The Challenger Sale", methodology: "Challenger", color: "#6366f1" },
  { text: "Implication 질문 하나가 Feature 설명 10번보다 강력하다.", guru: "Neil Rackham", methodology: "SPIN", color: "#22c55e" },
  { text: "고객 스스로 가치를 말하게 하라 — Need-Payoff 질문이 답이다.", guru: "Neil Rackham", methodology: "SPIN", color: "#22c55e" },
  { text: "Economic Buyer를 찾지 못했다면 딜이 없는 것이다.", guru: "Jack Napoli", methodology: "MEDDIC", color: "#f59e0b" },
  { text: "Champion은 내부 권력이 있고 기꺼이 쓰는 사람이어야 한다.", guru: "MEDDIC Framework", methodology: "MEDDIC", color: "#f59e0b" },
  { text: "절대로 고객보다 딜을 더 원하면 안 된다.", guru: "David Sandler", methodology: "Sandler", color: "#ef4444" },
  { text: "Up-Front Contract: 기대와 결과를 미팅 전에 먼저 합의하라.", guru: "David Sandler", methodology: "Sandler", color: "#ef4444" },
  { text: "좋은 패턴은 팀의 공통 언어가 된다. 문서화하라.", guru: "Sales Ops", methodology: "General", color: "#818cf8" },
  { text: "Velocity > Volume. 검증된 딜 1개가 유령 딜 10개보다 낫다.", guru: "Pipeline Wisdom", methodology: "General", color: "#818cf8" },
  { text: "CEO가 직접 콜드콜을 해서는 안 된다. 시스템이 파이프라인을 만들어야 한다.", guru: "Aaron Ross", methodology: "Outbound", color: "#0ea5e9" },
  { text: "SDR·AE·CSM 역할 분리 없이는 예측 가능한 매출도 없다.", guru: "Predictable Revenue", methodology: "Outbound", color: "#0ea5e9" },
  { text: "파이프라인의 공백이 모든 영업 문제의 근원이다. 지금 당장 프로스펙팅하라.", guru: "Jeb Blount", methodology: "Prospecting", color: "#8b5cf6" },
  { text: "30일 규칙: 오늘 멈추면 30일 후 파이프라인이 말라버린다.", guru: "Fanatical Prospecting", methodology: "Prospecting", color: "#8b5cf6" },
  { text: "타협은 나쁜 결과를 두 번 얻는 것이다. 절대 차이를 나누지 마라.", guru: "Chris Voss", methodology: "Negotiation", color: "#ec4899" },
  { text: "Tactical Empathy: 상대의 감정을 명명해 심리적 안전감을 만들어라.", guru: "Never Split the Difference", methodology: "Negotiation", color: "#ec4899" },
];

/** Report 페이지 전용 — 분석·실행 맥락 팁 */
const REPORT_GURU_TIPS: GuruTip[] = [
  { text: "데이터는 이야기가 아니다. 데이터 뒤의 왜(Why)를 찾아라.", guru: "Matthew Dixon", methodology: "Challenger", color: "#6366f1" },
  { text: "Metrics 없는 가치 제안은 그냥 이야기일 뿐이다.", guru: "Jack Napoli", methodology: "MEDDIC", color: "#f59e0b" },
  { text: "리포트를 읽기 전에 Risk부터 확인하라. 기회는 그 다음이다.", guru: "MEDDPICC", methodology: "MEDDIC", color: "#f59e0b" },
  { text: "숫자는 행동을 유발해야 한다. 그렇지 않으면 단순 통계다.", guru: "Neil Rackham", methodology: "SPIN", color: "#22c55e" },
  { text: "Pain이 없으면 긴급함도 없다. 임원 레벨 Pain을 먼저 찾아라.", guru: "David Sandler", methodology: "Sandler", color: "#ef4444" },
  { text: "좋은 브리핑은 다음 행동 한 가지를 명확하게 만든다.", guru: "Sales Leadership", methodology: "General", color: "#818cf8" },
  { text: "CRM은 당신의 기억이다. 기록되지 않으면 일어나지 않은 것이다.", guru: "Sales Operations", methodology: "General", color: "#818cf8" },
  { text: "건설적 긴장이 딜을 만든다. 보고서도 마찬가지다.", guru: "Brent Adamson", methodology: "Challenger", color: "#6366f1" },
];

/** 오늘 날짜 기반 컨텍스트 팁 (하루 단위 로테이션) */
export function getContextualTip(context: "research" | "report", offset = 0): GuruTip {
  const pool = context === "research" ? RESEARCH_GURU_TIPS : REPORT_GURU_TIPS;
  const date = new Date();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const idx = (dayOfYear + offset) % pool.length;
  return pool[(idx + pool.length) % pool.length];
}
