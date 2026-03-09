"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle, Loader2, Pencil, Plus, X } from "lucide-react";
import styles from "./page.module.css";
import { useToast } from "@/components/Toast";

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

interface EditDraft {
  stage?: string;
  probability?: number;
  revenue_potential?: number;
  due_date?: string;
  source?: string;
  competitor?: string;
  budget_confirmed?: boolean;
  champion?: string;
  contact?: string;
}

interface ActDraft {
  type: string;
  date: string;
  title: string;
  description: string;
  outcome: string;
  next_step: string;
  duration_min: string;
  rep: string;
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className={styles.container}>
      <div className="skeleton-block" style={{ width: 160, height: 22, marginBottom: "1.25rem", borderRadius: 6 }} />
      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", alignItems: "center" }}>
        <div className="skeleton-block" style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div className="skeleton-block" style={{ width: 200, height: 26, borderRadius: 6 }} />
          <div className="skeleton-block" style={{ width: 280, height: 16, borderRadius: 6 }} />
        </div>
      </div>
      <div className={styles.card} style={{ marginBottom: "1rem" }}>
        <div className="skeleton-block" style={{ width: 90, height: 13, marginBottom: 16, borderRadius: 4 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-block" style={{ flex: 1, height: 60, borderRadius: 8 }} />
          ))}
        </div>
      </div>
      <div className={styles.metricGrid} style={{ marginBottom: "1rem" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.metricCard} skeleton-block`} style={{ height: 70, border: "none" }} />
        ))}
      </div>
      <div className={styles.card}>
        <div className="skeleton-block" style={{ width: 120, height: 13, marginBottom: 12, borderRadius: 4 }} />
        <div className="skeleton-block" style={{ width: "80%", height: 16, marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton-block" style={{ width: "60%", height: 14, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CrmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router    = useRouter();
  const { toast } = useToast();

  // 데이터 상태
  const [leadId, setLeadId]         = useState<string | null>(null);
  const [lead, setLead]             = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // 딜 정보 편집 상태
  const [editMode, setEditMode]     = useState(false);
  const [editDraft, setEditDraft]   = useState<EditDraft>({});
  const [saving, setSaving]         = useState(false);

  // 활동 추가 상태
  const [showActForm, setShowActForm] = useState(false);
  const [actDraft, setActDraft]       = useState<ActDraft>({
    type: "call", date: todayStr(), title: "", description: "",
    outcome: "neutral", next_step: "", duration_min: "", rep: "",
  });
  const [actSaving, setActSaving]   = useState(false);

  // params 해제
  useEffect(() => { params.then(({ id }) => setLeadId(id)); }, [params]);

  // 데이터 로드
  const reload = useCallback(async () => {
    if (!leadId) return;
    try {
      const res  = await fetch(`/api/crm/leads/${leadId}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setLead(data.lead);
      setActivities(data.activities ?? []);
      setError(null);
    } catch {
      setError("고객사 데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { reload(); }, [reload]);

  // 딜 정보 저장
  async function saveLead() {
    if (!lead || !leadId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "저장 실패");
      }
      await reload();
      setEditMode(false);
      setEditDraft({});
      toast("저장되었습니다.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "저장 중 오류 발생", "error");
    } finally {
      setSaving(false);
    }
  }

  // 활동 저장
  async function saveActivity() {
    if (!leadId) return;
    if (!actDraft.title.trim()) { toast("제목을 입력해 주세요.", "error"); return; }
    setActSaving(true);
    try {
      const body: Record<string, unknown> = {
        type:        actDraft.type,
        date:        actDraft.date,
        title:       actDraft.title,
        description: actDraft.description,
        rep:         actDraft.rep || (lead?.owner ?? ""),
        outcome:     actDraft.outcome || undefined,
        next_step:   actDraft.next_step || undefined,
      };
      if (actDraft.duration_min) body.duration_min = Number(actDraft.duration_min);

      const res = await fetch(`/api/crm/leads/${leadId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "저장 실패");
      }
      await reload();
      setShowActForm(false);
      setActDraft({ type: "call", date: todayStr(), title: "", description: "", outcome: "neutral", next_step: "", duration_min: "", rep: "" });
      toast("활동이 기록되었습니다.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "저장 중 오류 발생", "error");
    } finally {
      setActSaving(false);
    }
  }

  // ── 로딩 / 에러 ────────────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton />;

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

      {/* ── 딜 상세 정보 (인라인 편집) ────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <p className={styles.cardTitle}>딜 상세 정보</p>
          {!editMode ? (
            <button
              className={styles.editBtn}
              onClick={() => {
                setEditDraft({
                  stage:             lead.stage,
                  probability:       lead.probability,
                  revenue_potential: lead.revenue_potential,
                  due_date:          lead.due_date,
                  source:            lead.source,
                  competitor:        lead.competitor === "—" ? "" : lead.competitor,
                  budget_confirmed:  lead.budget_confirmed,
                  champion:          lead.champion === "—" ? "" : lead.champion,
                  contact:           lead.contact,
                });
                setEditMode(true);
              }}
            >
              <Pencil size={12} />
              편집
            </button>
          ) : (
            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={() => { setEditMode(false); setEditDraft({}); }} disabled={saving}>
                <X size={12} /> 취소
              </button>
              <button className={styles.saveBtn} onClick={saveLead} disabled={saving}>
                {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={12} />}
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          )}
        </div>

        {!editMode ? (
          /* ── 읽기 모드 ── */
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
        ) : (
          /* ── 편집 모드 ── */
          <div className={styles.editGrid}>
            {/* 단계 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>단계</label>
              <select
                className={styles.editSelect}
                value={editDraft.stage ?? lead.stage}
                onChange={e => setEditDraft(d => ({ ...d, stage: e.target.value }))}
              >
                <option value="Lead">리드</option>
                <option value="Proposal">제안</option>
                <option value="Negotiation">협상</option>
                <option value="Contract">계약</option>
              </select>
            </div>
            {/* 확률 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>성사 확률 (%)</label>
              <input
                type="number" min={0} max={100}
                className={styles.editInput}
                value={editDraft.probability ?? lead.probability}
                onChange={e => setEditDraft(d => ({ ...d, probability: Number(e.target.value) }))}
              />
            </div>
            {/* 예상 매출 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>예상 매출 (백만원)</label>
              <input
                type="number" min={0}
                className={styles.editInput}
                value={editDraft.revenue_potential ?? lead.revenue_potential}
                onChange={e => setEditDraft(d => ({ ...d, revenue_potential: Number(e.target.value) }))}
              />
            </div>
            {/* 마감일 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>마감일</label>
              <input
                type="date"
                className={styles.editInput}
                value={editDraft.due_date ?? lead.due_date}
                onChange={e => setEditDraft(d => ({ ...d, due_date: e.target.value }))}
              />
            </div>
            {/* 유입 경로 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>유입 경로</label>
              <select
                className={styles.editSelect}
                value={editDraft.source ?? lead.source}
                onChange={e => setEditDraft(d => ({ ...d, source: e.target.value }))}
              >
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
                <option value="Referral">Referral</option>
                <option value="Event">Event</option>
              </select>
            </div>
            {/* 경쟁사 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>경쟁사</label>
              <input
                type="text"
                className={styles.editInput}
                placeholder="없음"
                value={editDraft.competitor ?? ""}
                onChange={e => setEditDraft(d => ({ ...d, competitor: e.target.value }))}
              />
            </div>
            {/* 예산 확정 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>예산 확정</label>
              <label className={styles.editCheckboxLabel}>
                <input
                  type="checkbox"
                  className={styles.editCheckbox}
                  checked={editDraft.budget_confirmed ?? lead.budget_confirmed}
                  onChange={e => setEditDraft(d => ({ ...d, budget_confirmed: e.target.checked }))}
                />
                <span>{(editDraft.budget_confirmed ?? lead.budget_confirmed) ? "✓ 확정" : "✗ 미확정"}</span>
              </label>
            </div>
            {/* 챔피언 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>내부 챔피언</label>
              <input
                type="text"
                className={styles.editInput}
                placeholder="이름"
                value={editDraft.champion ?? ""}
                onChange={e => setEditDraft(d => ({ ...d, champion: e.target.value }))}
              />
            </div>
            {/* 담당 연락처 */}
            <div className={styles.editItem}>
              <label className={styles.editLabel}>담당 연락처</label>
              <input
                type="text"
                className={styles.editInput}
                placeholder="이름"
                value={editDraft.contact ?? lead.contact}
                onChange={e => setEditDraft(d => ({ ...d, contact: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 활동 히스토리 ────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <p className={styles.cardTitle}>활동 히스토리 ({activities.length}건)</p>
          {!showActForm && (
            <button className={styles.addBtn} onClick={() => {
              setActDraft(d => ({ ...d, rep: lead.owner, date: todayStr() }));
              setShowActForm(true);
            }}>
              <Plus size={12} />
              활동 추가
            </button>
          )}
        </div>

        {/* 활동 추가 폼 */}
        {showActForm && (
          <div className={styles.actForm}>
            <div className={styles.actFormGrid}>
              {/* 유형 */}
              <div className={styles.actFormItem}>
                <label className={styles.editLabel}>유형 *</label>
                <select
                  className={styles.editSelect}
                  value={actDraft.type}
                  onChange={e => setActDraft(d => ({ ...d, type: e.target.value }))}
                >
                  <option value="call">📞 콜</option>
                  <option value="email">✉️ 이메일</option>
                  <option value="meeting">🤝 미팅</option>
                  <option value="demo">🖥️ 데모</option>
                  <option value="proposal">📄 견적/계약</option>
                  <option value="note">📝 노트</option>
                </select>
              </div>
              {/* 날짜 */}
              <div className={styles.actFormItem}>
                <label className={styles.editLabel}>날짜 *</label>
                <input
                  type="date"
                  className={styles.editInput}
                  value={actDraft.date}
                  onChange={e => setActDraft(d => ({ ...d, date: e.target.value }))}
                />
              </div>
              {/* 담당자 */}
              <div className={styles.actFormItem}>
                <label className={styles.editLabel}>담당자 *</label>
                <input
                  type="text"
                  className={styles.editInput}
                  placeholder={lead.owner}
                  value={actDraft.rep}
                  onChange={e => setActDraft(d => ({ ...d, rep: e.target.value }))}
                />
              </div>
              {/* 소요시간 */}
              <div className={styles.actFormItem}>
                <label className={styles.editLabel}>소요시간 (분)</label>
                <input
                  type="number" min={0}
                  className={styles.editInput}
                  placeholder="60"
                  value={actDraft.duration_min}
                  onChange={e => setActDraft(d => ({ ...d, duration_min: e.target.value }))}
                />
              </div>
            </div>
            {/* 제목 */}
            <div className={styles.actFormFull}>
              <label className={styles.editLabel}>제목 *</label>
              <input
                type="text"
                className={styles.editInput}
                placeholder="예: 현대자동차 니즈 발굴 미팅"
                value={actDraft.title}
                onChange={e => setActDraft(d => ({ ...d, title: e.target.value }))}
              />
            </div>
            {/* 설명 */}
            <div className={styles.actFormFull}>
              <label className={styles.editLabel}>내용</label>
              <textarea
                className={styles.editTextarea}
                rows={3}
                placeholder="미팅 내용, 논의 사항, 고객 반응 등을 기록하세요."
                value={actDraft.description}
                onChange={e => setActDraft(d => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className={styles.actFormGrid}>
              {/* 결과 */}
              <div className={styles.actFormItem}>
                <label className={styles.editLabel}>결과</label>
                <select
                  className={styles.editSelect}
                  value={actDraft.outcome}
                  onChange={e => setActDraft(d => ({ ...d, outcome: e.target.value }))}
                >
                  <option value="positive">✅ 긍정</option>
                  <option value="neutral">➖ 중립</option>
                  <option value="negative">❌ 부정</option>
                </select>
              </div>
              {/* 다음 액션 */}
              <div className={styles.actFormItem} style={{ gridColumn: "span 1" }}>
                <label className={styles.editLabel}>다음 액션</label>
                <input
                  type="text"
                  className={styles.editInput}
                  placeholder="다음에 할 일"
                  value={actDraft.next_step}
                  onChange={e => setActDraft(d => ({ ...d, next_step: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.actFormFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowActForm(false)}
                disabled={actSaving}
              >
                <X size={12} /> 취소
              </button>
              <button className={styles.saveBtn} onClick={saveActivity} disabled={actSaving}>
                {actSaving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={12} />}
                {actSaving ? "저장 중..." : "활동 저장"}
              </button>
            </div>
          </div>
        )}

        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}
