// ── Sales Tips Database ─────────────────────────────────────────────────────
// Rotates daily. Use getDailyTip() to get today's tip.

export type MethodologyId = "Challenger" | "SPIN" | "MEDDIC" | "Sandler" | "General";

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

// ── Sales Legends (Hall of Fame) ─────────────────────────────────────────────
export interface SalesLegend {
  id: MethodologyId;
  name: string;
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
    title: "The Challenger Sale 저자 · CEB 수석 연구원",
    emoji: "💡",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.1)",
    bio: "12만 명 이상의 영업사원을 대상으로 한 CEB 연구를 통해 최고 성과자의 공통점을 발견. Challenger 방법론의 창시자.",
    quotes: [
      "최고의 영업사원은 관계를 쌓는 것이 아니라 고객의 현상 유지를 흔드는 사람이다.",
      "고객은 영업사원이 쉽게 동의해 줄 때가 아니라 무언가를 가르쳐 줄 때 더 가치를 느낀다.",
      "편안한 대화는 좋은 대화가 아니다. 진짜 가치 있는 대화는 불편함을 만든다.",
    ],
    principles: [
      "가르쳐라 — 고객이 모르는 인사이트로 차별화하라",
      "맞춰라 — 의사결정권자 개인의 우선순위에 맞게 재단하라",
      "장악하라 — 건설적 긴장으로 대화를 주도하라",
    ],
    signatureMove: "Commercial Teaching — 놀라운 인사이트로 시작해 자연스럽게 솔루션으로 연결",
  },
  {
    id: "SPIN",
    name: "Neil Rackham",
    title: "SPIN Selling 저자 · 35,000건 영업 미팅 분석",
    emoji: "❓",
    color: "#22c55e",
    colorBg: "rgba(34,197,94,0.1)",
    bio: "35,000건 이상의 영업 미팅을 직접 관찰·분석한 영업 과학의 아버지. 질문이 설득보다 강하다는 사실을 데이터로 증명했다.",
    quotes: [
      "사람들은 감정적으로 구매하고 논리적으로 정당화한다.",
      "최고의 영업사원은 말을 잘하는 사람이 아니라 질문을 잘하는 사람이다.",
      "Implication 질문 하나가 열 번의 Feature 설명보다 강력하다.",
    ],
    principles: [
      "Situation 질문은 최소화 — 지루하고 라포를 낮춘다",
      "Implication으로 통증을 증폭 — 문제의 파급효과를 심화하라",
      "Need-Payoff로 마무리 — 고객 스스로 가치를 말하게 하라",
    ],
    signatureMove: "Implication 질문 — '이 문제가 계속된다면 조직에 어떤 영향이 올까요?'",
  },
  {
    id: "MEDDIC",
    name: "Jack Napoli",
    title: "MEDDIC 창시자 · PTC 전설적 VP of Sales",
    emoji: "🎯",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.1)",
    bio: "PTC에서 MEDDIC을 개발해 매출을 2억 달러에서 10억 달러로 성장시킨 B2B 영업의 전설. 자격 심사가 클로징보다 중요하다는 원칙을 세웠다.",
    quotes: [
      "Economic Buyer를 찾지 못했다면 딜이 없는 것이다.",
      "자격 심사(Qualification)는 영업 프로세스의 끝이 아니라 시작이다.",
      "Metrics 없는 가치 제안은 그냥 이야기일 뿐이다.",
    ],
    principles: [
      "Metrics — 숫자로 말하라, ROI와 절감액으로 증명하라",
      "Economic Buyer — 최종 결정권자를 반드시 직접 만나라",
      "Champion — 내부 권력이 있고 기꺼이 쓰는 사람을 육성하라",
    ],
    signatureMove: "Champion 테스트 — '이 딜이 막히면 당신이 나서서 밀어붙일 수 있나요?'",
  },
  {
    id: "Sandler",
    name: "David H. Sandler",
    title: "Sandler Training 창업자 · 역발상 영업의 아버지",
    emoji: "🔴",
    color: "#ef4444",
    colorBg: "rgba(239,68,68,0.1)",
    bio: "보험 영업 실패 후 인간 심리를 바탕으로 역발상 영업 시스템을 개발. 200개국 이상에 확산된 Sandler Training의 창시자.",
    quotes: [
      "프로스펙팅은 좋아할 필요가 없다. 그냥 해야 한다.",
      "영업사원이 딜을 고객보다 더 원하는 순간 협상력을 잃는다.",
      "Pain 없이 제안하지 마라. 먼저 Pain을 찾아라.",
    ],
    principles: [
      "Up-Front Contract — 매 미팅 전 기대와 결과를 먼저 합의하라",
      "Pain 우선 — 지적·감정·재정적 고통을 모두 발굴하라",
      "'NO'도 성공 — 가망 없는 딜에 시간 낭비 금지",
    ],
    signatureMove: "Negative Reverse — '어쩌면 이게 지금 맞지 않을 수 있겠네요.' (역설적 참여 유도)",
  },
];

/** 오늘의 레전드 (주 단위 로테이션, 4명 순환) */
export function getLegendOfDay(): SalesLegend {
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  return SALES_LEGENDS[week % SALES_LEGENDS.length];
}
