"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import SalesTip from "@/components/SalesTip";
import {
  Target, Brain, Loader2,
  CheckCircle2, AlertTriangle, XCircle, Lightbulb, Zap,
} from "lucide-react";
import type { RegionData } from "@/components/KoreaProvinceMap";
import type { IndividualData } from "@/app/page";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "okr" | "methodology" | "ai";
type MethodologyId = "Challenger" | "SPIN" | "MEDDIC" | "Sandler";
type KrStatus = "ontrack" | "atrisk" | "behind";

interface KeyResult {
  label: string;
  value: number;
  target: number;
  unit: string;
  status: KrStatus;
}
interface Objective {
  objective: string;
  description: string;
  keyResults: KeyResult[];
}

// ── Methodology Static Data ───────────────────────────────────────────────────
const METHODOLOGIES: Record<MethodologyId, {
  color: string; colorBg: string; emoji: string;
  guru: string; book: string; quote: string;
  stages_flow: { label: string; desc: string }[];
  principles: string[];
  currentTip: string;
}> = {
  Challenger: {
    color: "#6366f1", colorBg: "rgba(99,102,241,0.1)", emoji: "💡",
    guru: "Matthew Dixon & Brent Adamson",
    book: "The Challenger Sale (2011)",
    quote: "최고의 영업사원은 관계를 쌓는 것이 아니라 고객의 현상 유지를 흔드는 사람이다.",
    stages_flow: [
      { label: "Warm Up",          desc: "신뢰 구축, 어젠다 설정" },
      { label: "Reframe",          desc: "고객 관점을 바꾸는 인사이트 제공" },
      { label: "Rational Drowning",desc: "데이터로 현 상황의 위험성 제시" },
      { label: "Emotional Impact", desc: "개인에게 미치는 영향을 감성적으로 연결" },
      { label: "New Way",          desc: "이상적인 해결책 제시" },
      { label: "Solution",         desc: "자연스럽게 솔루션으로 연결" },
    ],
    principles: [
      "Teach for Differentiation — 고객이 몰랐던 인사이트로 차별화하라",
      "Tailor for Resonance — 의사결정권자 개인에게 맞춤 메시지를 전달하라",
      "Take Control of the Sale — 건설적 긴장을 주도하라",
      "Commercial Teaching — 제품이 아닌 비즈니스 문제 해결을 가르쳐라",
      "Reframe the Status Quo — 현재 상황이 '안전'하지 않음을 데이터로 증명하라",
    ],
    currentTip: "현재 87.4% 달성 — Reframe 단계에서 '목표 미달의 분기별 기회비용'을 고객에게 가르칠 최적 타이밍입니다.",
  },
  SPIN: {
    color: "#22c55e", colorBg: "rgba(34,197,94,0.1)", emoji: "❓",
    guru: "Neil Rackham",
    book: "SPIN Selling (1988)",
    quote: "사람들은 감정적으로 구매하고 논리적으로 정당화한다. 당신의 임무는 그들이 이미 느끼는 문제를 발굴하는 것이다.",
    stages_flow: [
      { label: "Situation",    desc: "현 상황 파악 — 고객 배경, 프로세스 이해" },
      { label: "Problem",      desc: "문제 발굴 — 고객이 인식하는 어려움과 불만" },
      { label: "Implication",  desc: "파급효과 — 문제가 방치될 경우의 결과 심화" },
      { label: "Need-Payoff",  desc: "니즈 확인 — 해결책의 가치를 고객이 직접 말하게" },
    ],
    principles: [
      "묻고 또 물어라 — 진술보다 질문이 대형 딜을 만든다",
      "Implied Need를 Explicit Need로 전환하라",
      "Implication 질문이 구매 긴급성을 만든다",
      "Need-Payoff 질문으로 고객 스스로 가치를 발견하게 하라",
      "Situation 질문은 최소화하라 — 지루하고 라포를 낮춘다",
    ],
    currentTip: "부산·대구 재방문 시 Implication 질문: '현재 달성률이 48%라면 Q2 예산에 어떤 영향이 올까요?'",
  },
  MEDDIC: {
    color: "#f59e0b", colorBg: "rgba(245,158,11,0.1)", emoji: "🎯",
    guru: "Jack Napoli (PTC, 1996)",
    book: "MEDDIC / MEDDPICC Framework",
    quote: "Economic Buyer를 찾지 못했다면 딜이 없는 것이다.",
    stages_flow: [
      { label: "Metrics",          desc: "정량적 성과 — ROI, 절감액, 성장률" },
      { label: "Economic Buyer",   desc: "최종 결정권자 파악 및 직접 접근" },
      { label: "Decision Criteria",desc: "구매 기준 파악 — 무엇으로 선택하나" },
      { label: "Decision Process", desc: "의사결정 프로세스 매핑" },
      { label: "Identify Pain",    desc: "핵심 고통 포인트 발굴" },
      { label: "Champion",         desc: "내부 챔피언 육성 — 우리 편 의사결정자" },
    ],
    principles: [
      "Metrics로 시작하라 — 숫자가 없으면 설득이 없다",
      "Economic Buyer는 반드시 직접 만나라 — 참조로는 불충분",
      "Decision Criteria를 초기에 파악해 차별화하라",
      "Champion이 없으면 딜이 죽는다 — 챔피언에게 투자하라",
      "Competition 분석 추가 (MEDDPICC) — 경쟁 우위를 명확히",
    ],
    currentTip: "김민수(200%) 성공 패턴을 분석하세요: 어떤 딜에서 Champion 육성이 Contract 전환을 이끌었는지 확인하세요.",
  },
  Sandler: {
    color: "#ef4444", colorBg: "rgba(239,68,68,0.1)", emoji: "🔴",
    guru: "David H. Sandler",
    book: "You Can't Teach a Kid to Ride a Bike at a Seminar (1995)",
    quote: "프로스펙팅은 좋아할 필요가 없다. 그냥 해야 한다.",
    stages_flow: [
      { label: "Bonding & Rapport", desc: "신뢰 기반 + Up-Front Contract 설정" },
      { label: "Pain",              desc: "지적·감정·재정적 핵심 고통 발굴" },
      { label: "Budget",            desc: "예산 및 투자 의지 검증" },
      { label: "Decision",          desc: "의사결정 구조와 프로세스 파악" },
      { label: "Fulfillment",       desc: "Pain과 직접 연결된 솔루션 제안" },
      { label: "Post-Sell",         desc: "바이어 리모스 방지, 레퍼럴 확보" },
    ],
    principles: [
      "Up-Front Contract — 미팅 전 기대치와 결과를 먼저 합의하라",
      "자격 심사를 빨리 하라 — 가망 없는 딜에 시간 낭비 금지",
      "'NO'를 얻는 것도 성공이다 — 불확실한 YES보다 빠른 NO",
      "Pain 없이 제안하지 마라 — Pain을 반드시 먼저 확인하라",
      "영업은 시스템 — 감정에 의존하지 말고 프로세스를 따라라",
    ],
    currentTip: "Negotiation 병목(44% 전환율) 재진단 — Sandler Pain 질문: '이 문제가 해결 안 되면 조직에 어떤 일이 생기나요?'",
  },
};

const STATUS_CONFIG: Record<KrStatus, {
  color: string; bg: string; border: string; label: string; icon: React.ReactNode;
}> = {
  ontrack: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", label: "On Track", icon: <CheckCircle2 size={11} /> },
  atrisk:  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", label: "At Risk",  icon: <AlertTriangle size={11} /> },
  behind:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  label: "Behind",   icon: <XCircle size={11} /> },
};

const METHOD_LIST: { id: MethodologyId; label: string }[] = [
  { id: "Challenger", label: "Challenger Sale" },
  { id: "SPIN",       label: "SPIN Selling" },
  { id: "MEDDIC",     label: "MEDDIC" },
  { id: "Sandler",    label: "Sandler" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectPage() {
  const [tab, setTab]                 = useState<Tab>("okr");
  const [methodology, setMethodology] = useState<MethodologyId>("Challenger");
  const [regions, setRegions]         = useState<RegionData[]>([]);
  const [individuals, setIndividuals] = useState<IndividualData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [aiInsight, setAiInsight]     = useState("");
  const [aiLoading, setAiLoading]     = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/regions")
      .then(r => r.json())
      .then(d => {
        setRegions(d.regional ?? []);
        setIndividuals(d.individuals ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionalData: regions, individuals, methodology }),
      });
      const data = await res.json();
      setAiInsight(data.insight ?? "");
    } catch {
      setAiInsight("AI 분석 실패. API 키를 확인하세요.");
    } finally {
      setAiLoading(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "okr",         label: "OKR / KPI",  icon: <Target size={14} /> },
    { id: "methodology", label: "방법론 코치",   icon: <Lightbulb size={14} /> },
    { id: "ai",          label: "AI 전략 진단", icon: <Brain size={14} /> },
  ];

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Project Strategy</h1>
          <p className={styles.subtitle}>OKR 트래킹 · 방법론 코치 · AI 전략 진단</p>
        </div>
        <span className={styles.qBadge}>Q1 2026</span>
      </header>

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Sales Tip ── */}
      <SalesTip offset={14} />

      {/* ── Content ── */}
      {loading ? (
        <div className={styles.loadingBox}>
          <Loader2 size={32} className={styles.spinner} />
        </div>
      ) : (
        <>
          {tab === "okr"         && <OkrTab regions={regions} individuals={individuals} />}
          {tab === "methodology" && <MethodologyTab methodology={methodology} setMethodology={setMethodology} />}
          {tab === "ai"          && (
            <AiTab
              aiInsight={aiInsight}
              aiLoading={aiLoading}
              methodology={methodology}
              onGenerate={handleGenerateAI}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── OKR Tab ───────────────────────────────────────────────────────────────────
function OkrTab({ regions, individuals }: { regions: RegionData[]; individuals: IndividualData[] }) {
  const teamRevenue  = regions.reduce((s, r) => s + r.revenue, 0);
  const teamTarget   = regions.reduce((s, r) => s + r.target,  0);
  const teamProgress = teamTarget > 0 ? Math.round((teamRevenue / teamTarget) * 100) : 0;
  const sorted       = [...regions].sort((a, b) => a.progress - b.progress);
  const worst        = sorted[0];
  const legendCount  = individuals.filter(p => p.progress >= 115).length;
  const targetLegend = Math.max(Math.round(individuals.length * 0.3), 1);
  const totalActive  = regions.reduce((s, r) => s + (r.deals_active  ?? 0), 0);
  const totalClosed  = regions.reduce((s, r) => s + (r.deals_closed  ?? 0), 0);
  const convRate     = totalActive > 0 ? Math.round((totalClosed / totalActive) * 100) : 0;
  const over100      = individuals.filter(p => p.progress >= 100).length;
  const indivRate    = individuals.length > 0 ? Math.round((over100 / individuals.length) * 100) : 0;

  const getStatus = (v: number, t: number): KrStatus =>
    v >= t ? "ontrack" : v >= t * 0.75 ? "atrisk" : "behind";

  const okrs: Objective[] = [
    {
      objective: "O1. 분기 매출 목표 초과 달성",
      description: `팀 목표 ₩${teamTarget.toLocaleString()}M · 현재 ₩${teamRevenue.toLocaleString()}M (${teamProgress}%)`,
      keyResults: [
        { label: "팀 전체 달성률",              value: teamProgress,     target: 100, unit: "%", status: getStatus(teamProgress, 100) },
        { label: `최저 지역 (${worst?.name ?? "—"}) 회복`, value: worst?.progress ?? 0, target: 80,  unit: "%", status: getStatus(worst?.progress ?? 0, 80) },
        { label: "Legend(115%) 달성 인원",       value: legendCount,      target: targetLegend, unit: "명", status: getStatus(legendCount, targetLegend) },
      ],
    },
    {
      objective: "O2. 파이프라인 건전성 강화",
      description: "딜 전환율 향상 및 Negotiation 병목 해소",
      keyResults: [
        { label: "평균 딜 전환율",          value: convRate,  target: 65, unit: "%", status: getStatus(convRate, 65) },
        { label: "Negotiation 단계 전환율", value: 44,        target: 70, unit: "%", status: "behind" },
        { label: "개인 100% 달성자 비율",   value: indivRate, target: 70, unit: "%", status: getStatus(indivRate, 70) },
      ],
    },
  ];

  return (
    <div className={styles.okrGrid}>
      {okrs.map((okr, i) => <OkrCard key={i} okr={okr} index={i} />)}
    </div>
  );
}

function OkrCard({ okr, index }: { okr: Objective; index: number }) {
  const OBJ_COLORS = ["#6366f1", "#f59e0b"];
  const color = OBJ_COLORS[index] ?? "#818cf8";
  return (
    <div className={styles.okrCard}>
      <div className={styles.okrHeader} style={{ borderLeftColor: color }}>
        <h3 className={styles.okrTitle} style={{ color }}>{okr.objective}</h3>
        <p className={styles.okrDesc}>{okr.description}</p>
      </div>
      <div className={styles.krList}>
        {okr.keyResults.map((kr, j) => {
          const s   = STATUS_CONFIG[kr.status];
          const pct = Math.min((kr.value / Math.max(kr.target, 1)) * 100, 100);
          return (
            <div key={j} className={styles.krItem}>
              <div className={styles.krTop}>
                <span className={styles.krLabel}>{kr.label}</span>
                <div className={styles.krRight}>
                  <span className={styles.krValue} style={{ color: s.color }}>{kr.value}{kr.unit}</span>
                  <span className={styles.krTarget}>/ {kr.target}{kr.unit}</span>
                  <span className={styles.krChip} style={{ color: s.color, background: s.bg, borderColor: s.border }}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
              <div className={styles.krBarOuter}>
                <div
                  className={styles.krBarFill}
                  style={{
                    width: `${pct}%`,
                    background:
                      kr.status === "ontrack" ? "linear-gradient(90deg,#16a34a,#4ade80)"
                      : kr.status === "atrisk" ? "linear-gradient(90deg,#d97706,#fbbf24)"
                      : "linear-gradient(90deg,#b91c1c,#ef4444)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Methodology Tab ───────────────────────────────────────────────────────────
function MethodologyTab({
  methodology, setMethodology,
}: {
  methodology: MethodologyId;
  setMethodology: (m: MethodologyId) => void;
}) {
  const m = METHODOLOGIES[methodology];
  return (
    <div>
      {/* Methodology Selector */}
      <div className={styles.methodSelector}>
        {METHOD_LIST.map(ml => (
          <button
            key={ml.id}
            className={`${styles.methodBtn} ${methodology === ml.id ? styles.methodBtnActive : ""}`}
            style={methodology === ml.id ? {
              background:   METHODOLOGIES[ml.id].colorBg,
              color:        METHODOLOGIES[ml.id].color,
              borderColor: `${METHODOLOGIES[ml.id].color}55`,
            } : {}}
            onClick={() => setMethodology(ml.id)}
          >
            {ml.label}
          </button>
        ))}
      </div>

      {/* Guru Card (full width) */}
      <div className={styles.guruCard} style={{ borderColor: `${m.color}33` }}>
        <div className={styles.guruHeader}>
          <div className={styles.guruAvatar} style={{ background: m.colorBg, borderColor: `${m.color}55` }}>
            <span style={{ fontSize: "1.6rem" }}>{m.emoji}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p className={styles.guruName}>{m.guru}</p>
            <p className={styles.guruBook}>{m.book}</p>
          </div>
        </div>
        <blockquote className={styles.guruQuote} style={{ borderLeftColor: m.color }}>
          &ldquo;{m.quote}&rdquo;
        </blockquote>
        <div className={styles.guruTip} style={{ background: m.colorBg, borderColor: `${m.color}33` }}>
          <Zap size={12} style={{ color: m.color, flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: m.color, fontSize: "0.75rem", lineHeight: 1.5 }}>
            💡 {m.currentTip}
          </span>
        </div>
      </div>

      {/* Stages + Principles 2-col grid */}
      <div className={styles.methodGrid}>
        {/* Framework Stages */}
        <div className={styles.methodCard}>
          <h4 className={styles.sectionTitle}>프레임워크 단계</h4>
          <div className={styles.stageList}>
            {m.stages_flow.map((s, i) => (
              <div key={i} className={styles.stageItem}>
                <div className={styles.stageNum} style={{ background: `${m.color}22`, color: m.color }}>
                  {i + 1}
                </div>
                <div>
                  <span className={styles.stageLabel} style={{ color: m.color }}>{s.label}</span>
                  <span className={styles.stageDesc}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Core Principles */}
        <div className={styles.methodCard}>
          <h4 className={styles.sectionTitle}>핵심 원칙</h4>
          <ul className={styles.principleList}>
            {m.principles.map((p, i) => (
              <li key={i} className={styles.principleItem}>
                <span style={{ color: m.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── AI Strategy Tab ───────────────────────────────────────────────────────────
function AiTab({
  aiInsight, aiLoading, methodology, onGenerate,
}: {
  aiInsight: string; aiLoading: boolean;
  methodology: MethodologyId; onGenerate: () => void;
}) {
  const m = METHODOLOGIES[methodology];

  const parseSection = (heading: string): string => {
    const regex = new RegExp(`##\\s*${heading}([\\s\\S]*?)(?=##|$)`, "i");
    return (aiInsight.match(regex)?.[1] ?? "").trim();
  };

  const sections = aiInsight ? [
    { heading: "현재상태 진단", text: parseSection("현재상태 진단"), color: "#818cf8", icon: "📊" },
    { heading: "전략 방향성",   text: parseSection("전략 방향성"),   color: "#fbbf24", icon: "🧭" },
    { heading: "즉시 실행 플랜",text: parseSection("즉시 실행 플랜"),color: "#4ade80", icon: "⚡" },
  ] : [];

  return (
    <div className={styles.aiTab}>
      <div className={styles.aiHeader}>
        <div>
          <h3 className={styles.aiTitle}>AI 전략 진단</h3>
          <p className={styles.aiSubtitle}>
            적용 방법론: <span style={{ color: m.color, fontWeight: 700 }}>{methodology}</span> · Gemini 2.0 Flash
          </p>
        </div>
        <button
          className={styles.aiGenBtn}
          onClick={onGenerate}
          disabled={aiLoading}
          style={{ borderColor: `${m.color}44`, color: m.color, background: m.colorBg }}
        >
          {aiLoading
            ? <><Loader2 size={13} className={styles.spinner} /> 분석 중...</>
            : <><Brain size={13} /> 전략 생성</>}
        </button>
      </div>

      {!aiInsight && !aiLoading && (
        <div className={styles.aiPlaceholder}>
          <Brain size={44} style={{ color: "rgba(255,255,255,0.12)", marginBottom: "0.875rem" }} />
          <p>「전략 생성」을 클릭하면 Gemini가</p>
          <p><strong style={{ color: m.color }}>{methodology}</strong> 방법론 관점에서 실시간 분석을 제공합니다.</p>
        </div>
      )}

      {aiLoading && (
        <div className={styles.aiPlaceholder}>
          <Loader2 size={36} className={styles.spinner} style={{ marginBottom: "0.875rem" }} />
          <p>Gemini가 분기 데이터를 분석 중입니다...</p>
        </div>
      )}

      {aiInsight && !aiLoading && (
        <div className={styles.aiGrid}>
          {sections.map((sec, i) => (
            <div key={i} className={styles.aiSection} style={{ borderTopColor: sec.color }}>
              <h4 className={styles.aiSectionTitle} style={{ color: sec.color }}>
                {sec.icon} {sec.heading}
              </h4>
              <p className={styles.aiText} style={{ whiteSpace: "pre-line" }}>
                {sec.text || aiInsight}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
