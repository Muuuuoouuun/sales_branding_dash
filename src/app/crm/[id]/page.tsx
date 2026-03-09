"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Activity {
  id: string;
  lead_id: number;
  type: "call" | "email" | "meeting" | "demo" | "proposal" | "note";
  date: string;
  title: string;
  description: string;
  rep: string;
  outcome?: "positive" | "neutral" | "negative";
  next_step?: string;
  duration_min?: number;
}

interface LeadDetail {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  due_label: string;
  action: string;
  source: string;
  competitor: string;
  budget_confirmed: boolean;
  champion: string;
  stage_entered: string;
  dealAge: number;
  engagementScore: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ROADMAP_STAGES = [
  { label: "리드",    emoji: "🎯", color: "#64748b" },
  { label: "컨택",   emoji: "📞", color: "#8b5cf6" },
  { label: "데모",    emoji: "🖥️", color: "#6366f1" },
  { label: "트라이얼", emoji: "🔬", color: "#f59e0b" },
  { label: "견적서",  emoji: "📄", color: "#0ea5e9" },
  { label: "결제",   emoji: "💳", color: "#22c55e" },
];

const STAGE_FLOOR: Record<string, number> = {
  Lead: 0, Proposal: 2, Negotiation: 3, Contract: 5,
};

const OWNER_COLORS: Record<string, string> = {
  "김민수": "#6366f1",
  "이지원": "#22c55e",
  "박웨이": "#f59e0b",
};

const STAGE_KR: Record<string, string> = {
  Lead: "리드", Proposal: "제안", Negotiation: "협상", Contract: "계약",
};

const ACTIVITY_COLORS: Record<string, string> = {
  call:     "#8b5cf6",
  email:    "#6366f1",
  meeting:  "#f59e0b",
  demo:     "#0ea5e9",
  proposal: "#22c55e",
  note:     "#64748b",
};

const ACTIVITY_EMOJIS: Record<string, string> = {
  call:     "📞",
  email:    "✉️",
  meeting:  "🤝",
  demo:     "🖥️",
  proposal: "📄",
  note:     "📝",
};

const ACTIVITY_LABELS: Record<string, string> = {
  call:     "콜",
  email:    "이메일",
  meeting:  "미팅",
  demo:     "데모",
  proposal: "견적/계약",
  note:     "노트",
};

const OUTCOME_COLOR: Record<string, string> = {
  positive: "#22c55e",
  neutral:  "#f59e0b",
  negative: "#ef4444",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeRoadmapStep(lead: LeadDetail, activities: Activity[]): number {
  if (lead.stage === "Contract") return 5;
  const hasProposal = activities.some(a => a.type === "proposal");
  const hasTrial    = activities.some(a => a.type === "demo" && a.outcome === "positive");
  const hasDemo     = activities.some(a => a.type === "demo");
  const hasContact  = activities.some(a => ["call", "email", "meeting"].includes(a.type));
  if (hasProposal) return 4;
  if (hasTrial)    return 3;
  if (hasDemo)     return 2;
  if (hasContact)  return 1;
  return Math.max(0, STAGE_FLOOR[lead.stage] ?? 0);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RoadmapTracker({ currentStep }: { currentStep: number }) {
  return (
    <div className={styles.roadmap}>
      {ROADMAP_STAGES.map((s, idx) => {
        const isDone    = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <React.Fragment key={s.label}>
            <div className={[
              styles.roadmapStep,
              isDone    ? styles.roadmapStepDone    : "",
              isCurrent ? styles.roadmapStepCurrent : "",
            ].filter(Boolean).join(" ")}>
              <div
                className={styles.roadmapCircle}
                style={{
                  borderColor: (isCurrent || isDone) ? s.color : undefined,
                  background:  isCurrent             ? `${s.color}22` : undefined,
                  boxShadow:   isCurrent             ? `0 0 0 4px ${s.color}28` : undefined,
                }}
              >
                {isDone ? "✓" : s.emoji}
              </div>
              <span className={styles.roadmapLabel}>{s.label}</span>
            </div>
            {idx < ROADMAP_STAGES.length - 1 && (
              <div className={[styles.roadmapConnector, isDone ? styles.roadmapConnectorDone : ""].filter(Boolean).join(" ")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatusBadge({ prob, stage, dueLabel }: { prob: number; stage: string; dueLabel: string }) {
  if (stage === "Contract") return <span className={styles.statusBadge} style={{ color: "#22c55e", borderColor: "#22c55e44", background: "rgba(34,197,94,0.1)" }}>✓ 계약 완료</span>;
  const isOverdue = dueLabel.includes("초과");
  const isCritical = isOverdue || prob < 40;
  const isWarning  = !isCritical && (dueLabel === "오늘" || dueLabel === "내일" || prob < 65);
  if (isCritical) return <span className={styles.statusBadge} style={{ color: "#f87171", borderColor: "#f8717144", background: "rgba(248,113,113,0.1)" }}>⚠ 위험</span>;
  if (isWarning)  return <span className={styles.statusBadge} style={{ color: "#fbbf24", borderColor: "#fbbf2444", background: "rgba(251,191,36,0.1)" }}>● 주의</span>;
  return <span className={styles.statusBadge} style={{ color: "#4ade80", borderColor: "#4ade8044", background: "rgba(74,222,128,0.1)" }}>● 양호</span>;
}

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>아직 기록된 활동이 없습니다.</p>;
  }
  return (
    <div className={styles.timeline}>
      {activities.map(act => {
        const color = ACTIVITY_COLORS[act.type] ?? "#64748b";
        return (
          <div key={act.id} className={styles.timelineItem}>
            <div className={styles.timelineDot} style={{ background: `${color}18`, color }}>
              {ACTIVITY_EMOJIS[act.type]}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <span
                  className={styles.activityTypeBadge}
                  style={{ background: `${color}18`, color }}
                >
                  {ACTIVITY_LABELS[act.type]}
                </span>
                {act.outcome && (
                  <span
                    className={styles.activityOutcome}
                    style={{ background: OUTCOME_COLOR[act.outcome] ?? "#64748b" }}
                    title={act.outcome === "positive" ? "긍정" : act.outcome === "negative" ? "부정" : "중립"}
                  />
                )}
                <span className={styles.activityDate}>{formatDate(act.date)}{act.duration_min ? ` · ${act.duration_min}분` : ""}</span>
              </div>
              <p className={styles.activityTitle}>{act.title}</p>
              <p className={styles.activityDesc}>{act.description}</p>
              {act.next_step && (
                <p className={styles.activityNextStep}>→ 다음 액션: {act.next_step}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CrmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [lead, setLead]           = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/crm/leads/${id}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => {
          setLead(data.lead);
          setActivities(data.activities ?? []);
        })
        .catch(() => setError("고객사 데이터를 불러올 수 없습니다."))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span>불러오는 중...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className={styles.loading}>
        <span>{error ?? "데이터를 찾을 수 없습니다."}</span>
      </div>
    );
  }

  const roadmapStep = computeRoadmapStep(lead, activities);
  const ownerColor  = OWNER_COLORS[lead.owner] ?? "#6366f1";
  const stageColor  = { Lead: "#64748b", Proposal: "#6366f1", Negotiation: "#f59e0b", Contract: "#22c55e" }[lead.stage] ?? "#64748b";

  return (
    <div className={styles.container}>
      {/* Back */}
      <button className={styles.backBtn} onClick={() => router.push("/crm")}>
        <ChevronLeft size={15} />
        CRM Tactics로 돌아가기
      </button>

      {/* Header */}
      <div className={styles.companyHeader}>
        <div
          className={styles.companyAvatar}
          style={{ background: `${ownerColor}18`, color: ownerColor }}
        >
          {lead.company.charAt(0)}
        </div>
        <div className={styles.companyInfo}>
          <h1 className={styles.companyName}>{lead.company}</h1>
          <div className={styles.headerBadges}>
            <span
              className={styles.stageBadge}
              style={{ color: stageColor, borderColor: `${stageColor}44`, background: `${stageColor}12` }}
            >
              {STAGE_KR[lead.stage] ?? lead.stage}
            </span>
            <StatusBadge prob={lead.probability} stage={lead.stage} dueLabel={lead.due_label} />
            <span
              className={styles.ownerBadge}
              style={{ background: `${ownerColor}18`, color: ownerColor }}
            >
              {lead.owner}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {lead.region} · {lead.contact}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Roadmap */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>세일즈 로드맵</p>
        <RoadmapTracker currentStep={roadmapStep} />
      </div>

      {/* KPI Metrics */}
      <div className={styles.metricGrid} style={{ marginBottom: "1rem" }}>
        <div className={styles.metricCard}>
          <span className={styles.metricVal} style={{ color: "#22c55e" }}>
            ₩{(lead.revenue_potential / 1000).toFixed(1)}B
          </span>
          <span className={styles.metricLabel}>예상 매출</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricVal} style={{ color: lead.probability >= 70 ? "#22c55e" : lead.probability >= 45 ? "#f59e0b" : "#f87171" }}>
            {lead.probability}%
          </span>
          <span className={styles.metricLabel}>성사 확률</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricVal} style={{ color: lead.dealAge > 30 ? "#f87171" : "var(--foreground)" }}>
            {lead.dealAge}일
          </span>
          <span className={styles.metricLabel}>딜 체류기간</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricVal} style={{ color: lead.engagementScore >= 60 ? "#22c55e" : lead.engagementScore >= 35 ? "#f59e0b" : "#f87171" }}>
            {lead.engagementScore}
          </span>
          <span className={styles.metricLabel}>참여 점수</span>
        </div>
      </div>

      {/* Next Action */}
      <div className={styles.nextActionCard}>
        <p className={styles.nextActionLabel}>다음 액션</p>
        <p className={styles.nextActionText}>{lead.action}</p>
        <p className={styles.nextActionDue}>마감: {lead.due_label} ({lead.due_date})</p>
      </div>

      {/* Info Grid */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>딜 상세 정보</p>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>유입 경로</span>
            <span className={styles.infoValue}>{lead.source}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>경쟁사</span>
            <span className={styles.infoValue}>{lead.competitor}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>예산 확정</span>
            <span className={`${styles.infoValue} ${styles.infoBool}`} style={{ color: lead.budget_confirmed ? "#4ade80" : "#f87171" }}>
              {lead.budget_confirmed ? "✓ 확정" : "✗ 미확정"}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>내부 챔피언</span>
            <span className={styles.infoValue}>{lead.champion}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>최근 연락</span>
            <span className={styles.infoValue}>{formatDate(lead.last_contact)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>단계 진입일</span>
            <span className={styles.infoValue}>{formatDate(lead.stage_entered)}</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>활동 히스토리 ({activities.length}건)</p>
        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}
