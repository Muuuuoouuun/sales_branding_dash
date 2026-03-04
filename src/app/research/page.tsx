"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import SalesTip from "@/components/SalesTip";
import {
  Search, BookOpen, Star, AlertTriangle,
  Target, Zap, Users, Brain, Award, TrendingUp,
} from "lucide-react";
import { SALES_LEGENDS, SalesLegend } from "@/lib/salesTips";

// ── Types ─────────────────────────────────────────────────────────────────────
type ResearchTab = "methodology" | "patterns" | "intel";

// ── Methodology Details ───────────────────────────────────────────────────────
const METHODOLOGY_DETAILS: Record<string, {
  tagline: string;
  bestFor: string;
  coreQuestions: string[];
  stages: string[];
  whenToUse: string;
}> = {
  Challenger: {
    tagline: "고객의 생각을 도전하고 재구성하라",
    bestFor: "복잡한 B2B 솔루션, 변화를 유도해야 하는 상황",
    coreQuestions: [
      "고객이 아직 모르는 비즈니스 위협은 무엇인가?",
      "현재 접근법의 숨겨진 비용은?",
      "경쟁사와 진정한 차별점은?",
    ],
    stages: ["Warm Up", "Reframe", "Rational Drowning", "Emotional Impact", "New Way", "Your Solution"],
    whenToUse: "고객이 현상 유지를 선호하거나 기존 벤더에 만족할 때",
  },
  SPIN: {
    tagline: "올바른 질문으로 고객 스스로 필요를 발견하게 하라",
    bestFor: "복잡한 니즈 발굴, 장기 관계 구축",
    coreQuestions: [
      "S: 현재 프로세스/상황은 어떻습니까?",
      "P: 어떤 어려움이나 불만이 있습니까?",
      "I: 그 문제가 팀/비용에 미치는 영향은?",
      "N: 이상적인 해결책이 있다면 어떤 모습입니까?",
    ],
    stages: ["Situation", "Problem", "Implication", "Need-Payoff"],
    whenToUse: "고객의 문제가 명확하지 않거나 잠재 니즈를 탐색할 때",
  },
  MEDDIC: {
    tagline: "데이터와 프로세스로 딜의 건전성을 검증하라",
    bestFor: "엔터프라이즈 세일즈, 복잡한 의사결정 구조",
    coreQuestions: [
      "Metrics: 고객의 성공 지표(ROI)는 무엇인가?",
      "Economic Buyer: 최종 결정권자는 누구인가?",
      "Decision Criteria: 구매 기준 1위는?",
      "Champion: 내부 지지자가 있는가?",
    ],
    stages: ["Metrics", "Economic Buyer", "Decision Criteria", "Decision Process", "Identify Pain", "Champion"],
    whenToUse: "대형 딜 자격 심사, 파이프라인 건전성 점검",
  },
  Sandler: {
    tagline: "팔려고 하지 말고, 적합성을 검증하라",
    bestFor: "공격적인 영업 문화 개선, 고객 주도 프로세스",
    coreQuestions: [
      "Pain: 고객의 진짜 아픔은 무엇인가?",
      "Budget: 예산이 실질적으로 있는가?",
      "Decision: 누가 Yes를 말할 수 있는가?",
    ],
    stages: ["Bonding & Rapport", "Up-Front Contract", "Pain", "Budget", "Decision", "Fulfillment", "Post-Sell"],
    whenToUse: "자격 미달 리드가 많거나 영업 사이클이 너무 길 때",
  },
};

// ── Success Pattern Data ──────────────────────────────────────────────────────
const GOLDEN_PATTERNS = [
  {
    id: 1,
    tag: "협상",
    tagColor: "#f59e0b",
    tagBg: "rgba(245,158,11,0.12)",
    title: '"Reciprocity Loop" 클로징 스크립트',
    desc: "소규모 양보를 먼저 제안해 심리적 부채를 만들고, 클로징 단계에서 본 조건을 협상하는 기법. 대형 딜 전환율 23% 향상.",
    usedBy: "Top 10% performers",
    winRate: 78,
    methodology: "Challenger",
    region: "서울/수도권",
  },
  {
    id: 2,
    tag: "오프닝",
    tagColor: "#8b5cf6",
    tagBg: "rgba(139,92,246,0.12)",
    title: "30초 침묵 오프너",
    desc: "자료 배포 후 30초 침묵으로 C-Level 집중도 확보. Executive 대상 미팅 성공률 35% 향상.",
    usedBy: "김민수",
    winRate: 85,
    methodology: "Sandler",
    region: "전국",
  },
  {
    id: 3,
    tag: "니즈 발굴",
    tagColor: "#22c55e",
    tagBg: "rgba(34,197,94,0.12)",
    title: "Implication Question 시퀀스",
    desc: "문제의 파급효과(Implication)를 연속 3개 질문으로 확장. Proposal 전환율을 기존 대비 41% 개선.",
    usedBy: "SPIN 고급 적용",
    winRate: 71,
    methodology: "SPIN",
    region: "부산/경남",
  },
  {
    id: 4,
    tag: "자격심사",
    tagColor: "#6366f1",
    tagBg: "rgba(99,102,241,0.12)",
    title: "MEDDIC 5분 체크리스트",
    desc: "미팅 직후 6항목 점수화(각 1-5점). 20점 미만은 자격 미달로 분류해 영업 사이클 52% 단축.",
    usedBy: "Jack Napoli 원칙 적용",
    winRate: 90,
    methodology: "MEDDIC",
    region: "전국",
  },
];

// ── Intel Data ────────────────────────────────────────────────────────────────
const INTEL_CARDS = [
  {
    id: 1,
    urgency: "high" as const,
    region: "부산/경남",
    title: "경쟁사 A — 가격 덤핑 포착",
    desc: "Q1에 부산 권역에서 15-20% 가격 인하 공세. 대응 전략: 'Lifetime Support' 비용 포함 TCO 비교 제안.",
    counter: "TCO 비교표 활용 → 5년 총 소유 비용으로 전환",
    date: "2026-02-28",
  },
  {
    id: 2,
    urgency: "medium" as const,
    region: "서울",
    title: "경쟁사 B — 신규 파트너십",
    desc: "대형 SI사와 전략적 제휴 체결. 서울 대기업 채널 강화 예상. 접근 전용 채널 조기 선점 필요.",
    counter: "기존 관계사 레퍼런스 강화, Decision Maker 직접 접촉 우선",
    date: "2026-02-20",
  },
  {
    id: 3,
    urgency: "low" as const,
    region: "수도권",
    title: "시장 트렌드 — AI 기반 솔루션 수요 급증",
    desc: "AI/자동화 기능 탑재 솔루션 RFP 요청 30% 증가. 기술 역량 포지셔닝 강화 기회.",
    counter: "AI 기능 데모 시나리오 준비, 파일럿 프로그램 제안",
    date: "2026-03-01",
  },
];

// ────────────────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<ResearchTab>("methodology");
  const [query, setQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const TABS: { id: ResearchTab; label: string; icon: React.ReactNode }[] = [
    { id: "methodology", label: "방법론 라이브러리", icon: <BookOpen size={14} /> },
    { id: "patterns",    label: "성공 패턴",         icon: <Star size={14} /> },
    { id: "intel",       label: "경쟁 인텔",          icon: <AlertTriangle size={14} /> },
  ];

  return (
    <div className={styles.container}>
      <SalesTip />
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Research Hub</h1>
        <p className={styles.subtitle}>방법론 라이브러리 · 성공 패턴 · 경쟁 인텔</p>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          type="text"
          placeholder="방법론, 패턴, 스크립트 검색..."
          className={styles.searchInput}
        />
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "methodology" && (
        <MethodologyTab query={query} selected={selectedMethod} setSelected={setSelectedMethod} />
      )}
      {activeTab === "patterns" && <PatternsTab query={query} />}
      {activeTab === "intel" && <IntelTab />}
    </div>
  );
}

// ── Methodology Tab ───────────────────────────────────────────────────────────
function MethodologyTab({
  query,
  selected,
  setSelected,
}: {
  query: string;
  selected: string | null;
  setSelected: (s: string | null) => void;
}) {
  const legends = SALES_LEGENDS.filter(
    l =>
      !query ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={styles.methodGrid}>
      {legends.map(leg => (
        <MethodCard
          key={leg.id}
          legend={leg}
          details={METHODOLOGY_DETAILS[leg.id]}
          expanded={selected === leg.id}
          onToggle={() => setSelected(selected === leg.id ? null : leg.id)}
        />
      ))}
    </div>
  );
}

function MethodCard({
  legend,
  details,
  expanded,
  onToggle,
}: {
  legend: SalesLegend;
  details: (typeof METHODOLOGY_DETAILS)[string];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`${styles.methodCard} ${expanded ? styles.methodCardExpanded : ""}`}
      style={{ borderColor: expanded ? legend.color : undefined }}
    >
      <div className={styles.methodTop} onClick={onToggle}>
        <div className={styles.methodLeft}>
          <span className={styles.methodEmoji}>{legend.emoji}</span>
          <div>
            <div className={styles.methodId} style={{ color: legend.color }}>
              {legend.id}
            </div>
            <div className={styles.methodName}>{legend.name}</div>
          </div>
        </div>
        <span
          className={styles.methodChevron}
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </div>

      <p className={styles.methodTagline}>{details.tagline}</p>

      <div className={styles.methodStages}>
        {details.stages.map((s, i) => (
          <span
            key={i}
            className={styles.stageChip}
            style={{ borderColor: legend.color + "44", color: legend.color }}
          >
            {s}
          </span>
        ))}
      </div>

      {expanded && (
        <div className={styles.methodDetail}>
          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>
              <Target size={12} /> 핵심 질문
            </div>
            <ul className={styles.detailList}>
              {details.coreQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>
                <Users size={12} /> 적합 상황
              </div>
              <p className={styles.detailText}>{details.whenToUse}</p>
            </div>
            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>
                <Zap size={12} /> 시그니처 무브
              </div>
              <p className={styles.detailText}>{legend.signatureMove}</p>
            </div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailLabel}>
              <Brain size={12} /> 핵심 인용구
            </div>
            <blockquote className={styles.detailQuote}>
              &ldquo;{legend.quotes[0]}&rdquo;
            </blockquote>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patterns Tab ──────────────────────────────────────────────────────────────
function PatternsTab({ query }: { query: string }) {
  const filtered = GOLDEN_PATTERNS.filter(
    p =>
      !query ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.desc.toLowerCase().includes(query.toLowerCase()) ||
      p.methodology.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={styles.patternGrid}>
      {filtered.map(p => (
        <div key={p.id} className={styles.patternCard}>
          <div className={styles.patternTop}>
            <span
              className={styles.patternTag}
              style={{ color: p.tagColor, background: p.tagBg }}
            >
              {p.tag}
            </span>
            <span className={styles.patternMethod}>{p.methodology}</span>
          </div>
          <h3 className={styles.patternTitle}>{p.title}</h3>
          <p className={styles.patternDesc}>{p.desc}</p>
          <div className={styles.patternMeta}>
            <div className={styles.winRateBlock}>
              <span
                className={styles.winNum}
                style={{
                  color:
                    p.winRate >= 80 ? "#4ade80" : p.winRate >= 70 ? "#f59e0b" : "#94a3b8",
                }}
              >
                {p.winRate}%
              </span>
              <span className={styles.winLabel}>Win Rate</span>
            </div>
            <div className={styles.patternMetaRight}>
              <div className={styles.metaLine}>
                <Award size={11} /> {p.usedBy}
              </div>
              <div className={styles.metaLine}>
                <TrendingUp size={11} /> {p.region}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Intel Tab ─────────────────────────────────────────────────────────────────
function IntelTab() {
  const urgencyColors: Record<string, string> = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#6366f1",
  };
  const urgencyLabels: Record<string, string> = {
    high: "🔴 HIGH",
    medium: "🟡 MED",
    low: "🔵 LOW",
  };

  return (
    <div className={styles.intelList}>
      {INTEL_CARDS.map(card => (
        <div
          key={card.id}
          className={styles.intelCard}
          style={{ borderLeftColor: urgencyColors[card.urgency] }}
        >
          <div className={styles.intelTop}>
            <div>
              <span
                className={styles.urgencyBadge}
                style={{
                  color: urgencyColors[card.urgency],
                  borderColor: urgencyColors[card.urgency] + "44",
                }}
              >
                {urgencyLabels[card.urgency]}
              </span>
              <span className={styles.intelRegion}>{card.region}</span>
            </div>
            <span className={styles.intelDate}>{card.date}</span>
          </div>
          <h3 className={styles.intelTitle}>{card.title}</h3>
          <p className={styles.intelDesc}>{card.desc}</p>
          <div className={styles.counterBox}>
            <span className={styles.counterLabel}>💡 대응 전략</span>
            <span className={styles.counterText}>{card.counter}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
