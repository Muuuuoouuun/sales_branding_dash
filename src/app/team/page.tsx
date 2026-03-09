"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lead {
  id: number;
  company: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  due_label: string;
}

interface FocusScore {
  name: string;
  score: number;
  label: string;
  won: number;
  pipeline: number;
  deals: number;
}

interface Activity {
  id: string;
  lead_id: number;
  type: string;
  date: string;
  title: string;
  rep: string;
  outcome?: string;
  company?: string;
}

interface RepStats {
  name: string;
  color: string;
  wonRevenue: number;
  pipelineRevenue: number;
  target: number;
  progress: number;
  deals_total: number;
  deals_won: number;
  focusScore: number;
  focusLabel: string;
  dealsByStage: Record<string, number>;
  criticalDeals: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const OWNER_COLORS: Record<string, string> = {
  "김민수": "#6366f1",
  "이지원": "#22c55e",
  "박웨이": "#f59e0b",
};

const STAGE_ORDER = ["Lead", "Proposal", "Negotiation", "Contract"];
const STAGE_KR: Record<string, string> = {
  Lead: "리드", Proposal: "제안", Negotiation: "협상", Contract: "계약",
};
const STAGE_COLORS: Record<string, string> = {
  Lead: "#64748b", Proposal: "#6366f1", Negotiation: "#f59e0b", Contract: "#22c55e",
};

const ACTIVITY_EMOJIS: Record<string, string> = {
  call: "📞", email: "✉️", meeting: "🤝", demo: "🖥️", proposal: "📄", note: "📝",
};

const REP_TARGETS: Record<string, number> = {
  "김민수": 20000,
  "이지원": 12000,
  "박웨이": 8000,
};

// ── Helper ────────────────────────────────────────────────────────────────────
function isCritical(lead: Lead): boolean {
  if (lead.stage === "Contract") return false;
  const overdue = lead.due_label.includes("초과");
  return overdue || lead.probability < 40;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RepCard({ rep }: { rep: RepStats }) {
  const pct = Math.min(rep.progress, 100);
  return (
    <div className={styles.repCard} style={{ borderTopColor: rep.color }}>
      <div className={styles.repHeader}>
        <div
          className={styles.repAvatar}
          style={{ background: `${rep.color}18`, borderColor: rep.color, color: rep.color }}
        >
          {rep.name[0]}
        </div>
        <div>
          <div className={styles.repName}>{rep.name}</div>
          <span
            className={styles.focusBadge}
            style={{
              background: `${rep.color}18`,
              color: rep.color,
            }}
          >
            {rep.focusLabel}
          </span>
        </div>
        <span className={styles.repScoreNum} style={{ color: rep.color }}>
          {rep.focusScore}
        </span>
      </div>

      <div className={styles.repProgressLabel}>
        <span>목표 달성률</span>
        <span style={{ color: rep.color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div className={styles.repProgressBar}>
        <div style={{ width: `${pct}%`, background: rep.color }} />
      </div>

      <div className={styles.repStats}>
        <div className={styles.repStat}>
          <span className={styles.repStatVal} style={{ color: "#22c55e" }}>
            ₩{rep.wonRevenue >= 1000 ? `${(rep.wonRevenue / 1000).toFixed(1)}B` : `${rep.wonRevenue}M`}
          </span>
          <span className={styles.repStatLabel}>계약</span>
        </div>
        <div className={styles.repStat}>
          <span className={styles.repStatVal}>
            ₩{rep.pipelineRevenue >= 1000 ? `${(rep.pipelineRevenue / 1000).toFixed(1)}B` : `${rep.pipelineRevenue}M`}
          </span>
          <span className={styles.repStatLabel}>파이프</span>
        </div>
        <div className={styles.repStat}>
          <span className={styles.repStatVal}>{rep.deals_total}</span>
          <span className={styles.repStatLabel}>총 딜</span>
        </div>
        <div className={styles.repStat}>
          <span
            className={styles.repStatVal}
            style={{ color: rep.criticalDeals > 0 ? "#f87171" : "var(--foreground)" }}
          >
            {rep.criticalDeals}
          </span>
          <span className={styles.repStatLabel}>위험</span>
        </div>
      </div>
    </div>
  );
}

function StageDistribution({ reps, leads }: { reps: RepStats[]; leads: Lead[] }) {
  const maxDealsInStage = Math.max(
    ...STAGE_ORDER.map(st => leads.filter(l => l.stage === st).length),
    1,
  );

  return (
    <div className={styles.stageDistCard}>
      <p className={styles.cardTitle}>딜 분포 (단계 × 담당자)</p>
      {STAGE_ORDER.map(stage => {
        return (
          <div key={stage} className={styles.stageDistRow}>
            <span className={styles.stageDistLabel}>{STAGE_KR[stage]}</span>
            <div className={styles.stageDistBars}>
              {reps.map(rep => {
                const count = rep.dealsByStage[stage] ?? 0;
                if (count === 0) return null;
                const widthPct = Math.round((count / maxDealsInStage) * 160);
                return (
                  <div
                    key={rep.name}
                    className={styles.stageBar}
                    style={{
                      width: widthPct,
                      background: rep.color,
                      opacity: 0.85,
                    }}
                    title={`${rep.name}: ${count}건`}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className={styles.stageDistLegend}>
        {reps.map(rep => (
          <div key={rep.name} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: rep.color }} />
            <span>{rep.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className={styles.feedCard}>
        <p className={styles.cardTitle}>팀 최근 활동</p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>활동 기록이 없습니다.</p>
      </div>
    );
  }
  return (
    <div className={styles.feedCard}>
      <p className={styles.cardTitle}>팀 최근 활동 ({activities.length}건)</p>
      {activities.map(act => {
        const repColor = OWNER_COLORS[act.rep] ?? "#64748b";
        return (
          <div key={act.id} className={styles.feedItem}>
            <div
              className={styles.feedDot}
              style={{ background: `${repColor}18`, color: repColor }}
            >
              {ACTIVITY_EMOJIS[act.type] ?? "📌"}
            </div>
            <div className={styles.feedContent}>
              <p className={styles.feedTitle}>{act.title}</p>
              <div className={styles.feedMeta}>
                <span className={styles.feedCompany}>{act.company}</span>
                <span>·</span>
                <span>{act.date}</span>
                <span>·</span>
                <span
                  className={styles.feedRepBadge}
                  style={{ background: `${repColor}18`, color: repColor }}
                >
                  {act.rep}
                </span>
                {act.outcome && (
                  <span style={{ color: act.outcome === "positive" ? "#4ade80" : act.outcome === "negative" ? "#f87171" : "#fbbf24" }}>
                    {act.outcome === "positive" ? "긍정" : act.outcome === "negative" ? "부정" : "중립"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [focusScores, setFocusScores] = useState<FocusScore[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/leads").then(r => r.json()),
      fetch("/api/team/activities").then(r => r.json()),
    ]).then(([crmData, actData]) => {
      setLeads(crmData.leads ?? []);
      setFocusScores(crmData.scores ?? []);
      setActivities(actData.activities ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // Build RepStats
  const reps: RepStats[] = Object.keys(OWNER_COLORS).map(name => {
    const repLeads    = leads.filter(l => l.owner === name);
    const wonLeads    = repLeads.filter(l => l.stage === "Contract");
    const pipeLeads   = repLeads.filter(l => l.stage !== "Contract");
    const wonRevenue  = wonLeads.reduce((s, l) => s + l.revenue_potential, 0);
    const pipeRevenue = Math.round(pipeLeads.reduce((s, l) => s + l.revenue_potential * l.probability / 100, 0));
    const target      = REP_TARGETS[name] ?? 10000;
    const progress    = Math.round(wonRevenue / target * 100);
    const fs          = focusScores.find(s => s.name === name);
    const dealsByStage = Object.fromEntries(
      STAGE_ORDER.map(st => [st, repLeads.filter(l => l.stage === st).length]),
    );

    return {
      name,
      color:       OWNER_COLORS[name],
      wonRevenue,
      pipelineRevenue: pipeRevenue,
      target,
      progress,
      deals_total: repLeads.length,
      deals_won:   wonLeads.length,
      focusScore:  fs?.score ?? 0,
      focusLabel:  fs?.label ?? "—",
      dealsByStage,
      criticalDeals: repLeads.filter(l => isCritical(l)).length,
    };
  });

  const totalRevenue  = reps.reduce((s, r) => s + r.wonRevenue, 0);
  const totalPipeline = reps.reduce((s, r) => s + r.pipelineRevenue, 0);
  const totalDeals    = leads.length;
  const totalTarget   = Object.values(REP_TARGETS).reduce((a, b) => a + b, 0);
  const teamProgress  = Math.round(totalRevenue / totalTarget * 100);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "var(--text-muted)", gap: "0.5rem" }}>
        <span>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>팀 관리</h1>
        <p className={styles.subtitle}>영업팀 성과 현황 · 딜 분포 · 최근 활동</p>
      </div>

      {/* Team Summary Bar */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryVal} style={{ color: "#22c55e" }}>
            ₩{(totalRevenue / 1000).toFixed(1)}B
          </span>
          <span className={styles.summaryLabel}>팀 계약 매출</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryVal} style={{ color: "#6366f1" }}>
            ₩{(totalPipeline / 1000).toFixed(1)}B
          </span>
          <span className={styles.summaryLabel}>파이프라인</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryVal}>{totalDeals}</span>
          <span className={styles.summaryLabel}>전체 딜</span>
        </div>
        <div className={styles.summaryCard}>
          <span
            className={styles.summaryVal}
            style={{ color: teamProgress >= 80 ? "#22c55e" : teamProgress >= 50 ? "#f59e0b" : "#f87171" }}
          >
            {teamProgress}%
          </span>
          <span className={styles.summaryLabel}>목표 달성률</span>
        </div>
      </div>

      {/* Rep Cards */}
      <div className={styles.repGrid}>
        {reps.map((rep, i) => (
          <div key={rep.name} className={`stagger-${i + 1}`}>
            <RepCard rep={rep} />
          </div>
        ))}
      </div>

      {/* Stage Distribution */}
      <StageDistribution reps={reps} leads={leads} />

      {/* Activity Feed */}
      <ActivityFeed activities={activities} />
    </div>
  );
}
