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
