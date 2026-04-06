"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import { getHeatColor } from "@/lib/heatUtils";
import type { IndividualData, RegionData } from "@/types/dashboard";
import styles from "./QuarterlyTracker.module.css";

const MILESTONES = [
  { pct: 25,  label: "Discovery",   marker: "P1",  color: "var(--danger)",             desc: "타겟 25% 달성" },
  { pct: 50,  label: "Proposal",    marker: "P2",  color: "var(--warning)",            desc: "타겟 50% 달성" },
  { pct: 75,  label: "Commit",      marker: "P3",  color: "var(--primary)",            desc: "타겟 75% 달성" },
  { pct: 100, label: "Quota",       marker: "TGT", color: "var(--accent)",             desc: "Quota 100% 달성" },
  { pct: 115, label: "Overachieve", marker: "STR", color: "var(--success-foreground)", desc: "115% 초과 달성" },
] as const;

const BAR_MAX = 115;

interface Props {
  data: RegionData[];
  individuals: IndividualData[];
  periodLabel: string;
  yearlyTarget?: number;
  yearlyActual?: number;
}

function fmt(value: number): string {
  const symbol = typeof window !== "undefined" && localStorage.getItem("app-currency") === "USD" ? "$" : "¥";
  return `${symbol}${Math.round(value).toLocaleString()}M`;
}

export default function QuarterlyTracker({ data, individuals, periodLabel, yearlyTarget, yearlyActual }: Props) {
  const [view, setView]     = useState<"team" | "individual">("team");
  const [period, setPeriod] = useState<"Q" | "Y">("Q");

  const quarterRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const quarterTarget  = data.reduce((s, r) => s + r.target,  0);

  const displayRevenue = period === "Y" ? (yearlyActual  ?? quarterRevenue) : quarterRevenue;
  const displayTarget  = period === "Y" ? (yearlyTarget  ?? quarterTarget)  : quarterTarget;

  const progress      = displayTarget > 0 ? (displayRevenue / displayTarget) * 100 : 0;
  const remaining     = Math.max(0, displayTarget - displayRevenue);
  const barFillPct    = Math.min((progress / BAR_MAX) * 100, 100);
  const currentMs     = [...MILESTONES].reverse().find(m => progress >= m.pct) ?? null;

  const periodBadge = period === "Y"
    ? periodLabel.replace(/Q\d/, "FY")
    : periodLabel;

  // 팀 KPI 완료율 (individuals 집계)
  const totalKpiGoal   = individuals.reduce((s, p) => s + (p.activityGoal   ?? 0), 0);
  const totalKpiActual = individuals.reduce((s, p) => s + (p.activityActual ?? 0), 0);
  const teamKpiPct     = totalKpiGoal > 0 ? (totalKpiActual / totalKpiGoal) * 100 : 0;

  return (
    <div className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.qBadge}>{periodBadge}</span>
          <div>
            <h3 className={styles.title}>BD Target Tracker</h3>
            <p className={styles.sub}>
              성과&nbsp;<strong>{fmt(displayRevenue)}</strong>
              &nbsp;/&nbsp;목표&nbsp;{fmt(displayTarget)}
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.toggleGroup}>
            <button className={`${styles.toggle} ${period === "Q" ? styles.toggleOn : ""}`} onClick={() => setPeriod("Q")} type="button">Q</button>
            <button className={`${styles.toggle} ${period === "Y" ? styles.toggleOn : ""}`} onClick={() => setPeriod("Y")} type="button">Y</button>
          </div>
          <div className={styles.toggleGroup}>
            <button className={`${styles.toggle} ${view === "team" ? styles.toggleOn : ""}`} onClick={() => setView("team")} type="button">
              <Users size={12} /> Team
            </button>
            <button className={`${styles.toggle} ${view === "individual" ? styles.toggleOn : ""}`} onClick={() => setView("individual")} type="button">
              <User size={12} /> Rep
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <ProgressTrack progress={progress} barFillPct={barFillPct} currentMilestone={currentMs} />

      {/* ── Panel ── */}
      {view === "team" ? (
        <TeamPanel
          totalRevenue={displayRevenue}
          totalTarget={displayTarget}
          remaining={remaining}
          progress={progress}
          currentMilestone={currentMs}
          topRep={individuals[0]?.name ?? "TBD"}
          teamKpiPct={teamKpiPct}
        />
      ) : (
        <IndividualPanel individuals={individuals} />
      )}
    </div>
  );
}

/* ─────────────────────────── Progress Track ─────────────────────────── */
function ProgressTrack({
  progress, barFillPct, currentMilestone,
}: {
  progress: number;
  barFillPct: number;
  currentMilestone: (typeof MILESTONES)[number] | null;
}) {
  return (
    <div className={styles.trackArea}>
      <div className={styles.milestoneRow}>
        {MILESTONES.map(m => (
          <div key={m.pct} className={styles.milestone} style={{ left: `${(m.pct / BAR_MAX) * 100}%` }} data-tooltip={m.desc}>
            <span className={styles.msEmoji}>{m.marker}</span>
            <span className={styles.msLabel} style={{ color: progress >= m.pct ? m.color : "var(--text-muted)" }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.trackOuter}>
        {MILESTONES.map(m => (
          <div
            key={m.pct}
            className={`${styles.tick} ${progress >= m.pct ? styles.tickReached : ""}`}
            style={{ left: `${(m.pct / BAR_MAX) * 100}%`, color: progress >= m.pct ? m.color : undefined }}
          />
        ))}
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${barFillPct}%` }}>
            <div className={styles.fillShimmer} />
          </div>
          <div className={styles.cursor} style={{ left: `${barFillPct}%` }}>
            <div className={styles.cursorPill}>
              {currentMilestone?.marker ?? "—"}&nbsp;{progress.toFixed(1)}%
            </div>
            <div className={styles.cursorLine} />
          </div>
        </div>
      </div>

      <div className={styles.pctRow}>
        {MILESTONES.map(m => (
          <span
            key={m.pct}
            className={styles.pctLabel}
            style={{ left: `${(m.pct / BAR_MAX) * 100}%`, color: progress >= m.pct ? m.color : "var(--text-muted)" }}
          >
            {m.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Team Panel ─────────────────────────── */
function TeamPanel({
  totalRevenue, totalTarget, remaining, progress, currentMilestone, topRep, teamKpiPct,
}: {
  totalRevenue: number;
  totalTarget: number;
  remaining: number;
  progress: number;
  currentMilestone: (typeof MILESTONES)[number] | null;
  topRep: string;
  teamKpiPct: number;
}) {
  const nextMs = MILESTONES.find(m => progress < m.pct);
  const revenueNeeded = nextMs ? Math.max(Math.round((nextMs.pct / 100) * totalTarget - totalRevenue), 0) : 0;

  const attColor = progress >= 100 ? "var(--accent)" : progress >= 75 ? "var(--primary)" : "var(--warning)";
  const kpiColor = teamKpiPct >= 80 ? "var(--accent)" : teamKpiPct >= 50 ? "var(--primary)" : "var(--warning)";

  return (
    <div className={styles.teamPanel}>
      <div className={styles.teamGrid}>
        <Stat label="성과 (Won)"   value={fmt(totalRevenue)} color="var(--foreground)" />
        <Stat label="목표"         value={fmt(totalTarget)}  color="var(--text-muted)" />
        <Stat label="잔여 Gap"     value={remaining > 0 ? fmt(remaining) : "목표 달성"} color={remaining > 0 ? "var(--warning)" : "var(--accent)"} />
        <Stat label="달성률"       value={`${progress.toFixed(1)}%`}    color={attColor} />
        <Stat label="Activity KPI" value={`${teamKpiPct.toFixed(1)}%`}  color={kpiColor} />
        <Stat label="Top rep"      value={topRep}                        color="var(--primary)" />
      </div>

      {nextMs || currentMilestone?.pct === 115 ? (
        <div className={styles.nextMsBar}>
          {nextMs
            ? <><span className={styles.nextMsTag}>{nextMs.marker}</span><span>다음 단계까지&nbsp;<strong>{fmt(revenueNeeded)}</strong>&nbsp;추가 필요</span></>
            : <><span className={styles.nextMsTag} style={{ background: "var(--accent)", color: "#000" }}>STR</span><span>Quota 달성 완료 — Overachieve 구간!</span></>
          }
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Individual Panel ─────────────────────────── */
function IndividualPanel({ individuals }: { individuals: IndividualData[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (individuals.length === 0) {
    return (
      <div className={styles.indivList}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.5rem 0" }}>
          Rep-level data is not available yet.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.indivList}>
      <div className={styles.indivHeader}>
        <span />
        <span>Rep</span>
        <span>달성률 바</span>
        <span style={{ textAlign: "right" }}>달성률</span>
        <span style={{ textAlign: "right" }}>성과 / 목표</span>
        <span style={{ textAlign: "right" }}>Pipeline</span>
        <span style={{ textAlign: "right" }}>KPI</span>
        <span style={{ textAlign: "right" }}>딜</span>
      </div>

      {individuals.map((person, idx) => {
        const color     = getHeatColor(person.progress);
        const fillWidth = Math.min((person.progress / BAR_MAX) * 100, 100);
        const ms        = [...MILESTONES].reverse().find(m => person.progress >= m.pct) ?? null;
        const kpiPct    = person.activityGoal && person.activityGoal > 0
          ? Math.round((person.activityActual ?? 0) / person.activityGoal * 100)
          : null;
        const kpiColor  = kpiPct == null ? "var(--text-muted)" : kpiPct >= 80 ? "var(--accent)" : kpiPct >= 50 ? "var(--primary)" : "var(--warning)";
        const kpiTip    = person.kpis?.map(k => `${k.key} ${k.actual}/${k.goal}`).join("  ") ?? "";
        const isOpen    = expanded === person.name;

        return (
          <div key={person.name}>
            <div
              className={styles.indivRow}
              data-tooltip={`목표: ${fmt(person.target)} | 성과: ${fmt(person.wonRevenue)} | Gap: ${fmt(Math.max(0, person.target - person.wonRevenue))}`}
              onClick={() => setExpanded(isOpen ? null : person.name)}
              style={{ cursor: "pointer" }}
            >
              <span className={styles.indivRank}>#{idx + 1}</span>

              <span className={styles.indivName}>
                {person.name}
                {ms ? <span className={styles.indivMs}>{ms.marker}</span> : null}
              </span>

              <div className={styles.indivBarWrap}>
                {MILESTONES.map(m => (
                  <div key={m.pct} className={styles.indivTick} style={{ left: `${(m.pct / BAR_MAX) * 100}%` }} />
                ))}
                <div style={{ width: `${fillWidth}%`, background: color, height: "100%", borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>

              <span className={styles.indivPct} style={{ color }}>{person.progress}%</span>

              <span className={styles.indivRev}>
                <span>{fmt(person.wonRevenue)}</span>
                <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>/ {fmt(person.target)}</span>
              </span>

              <span className={styles.indivPipe} style={{ color: "var(--primary)" }}>
                {fmt(person.pipelineRevenue)}
              </span>

              <span
                className={styles.indivKpi}
                style={{ color: kpiColor }}
                data-tooltip={kpiTip || undefined}
              >
                {kpiPct != null ? `${kpiPct}%` : "—"}
              </span>

              <span className={styles.indivDeals} style={{ color: "var(--text-muted)" }}>
                {person.deals_won}/{person.deals_total}
              </span>
            </div>

            {/* KPI 드릴다운 */}
            {isOpen && person.kpis && person.kpis.length > 0 && (
              <div className={styles.kpiRow}>
                {person.kpis.map(k => {
                  const kc = k.progress >= 80 ? "var(--accent)" : k.progress >= 50 ? "var(--primary)" : "var(--warning)";
                  return (
                    <div key={k.key} className={styles.kpiItem}>
                      <span className={styles.kpiKey}>{k.key}</span>
                      <div className={styles.kpiBar}>
                        <div style={{ width: `${Math.min(k.progress, 100)}%`, background: kc, height: "100%", borderRadius: 2 }} />
                      </div>
                      <span className={styles.kpiVal} style={{ color: kc }}>{k.actual}/{k.goal}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className={styles.indivNote}>
        Won = 계약 완료 매출 · Pipeline = 가중 진행 매출 · KPI 클릭 시 활동 지표 표시
      </p>
    </div>
  );
}

/* ─────────────────────────── Stat ─────────────────────────── */
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLbl}>{label}</span>
      <span className={styles.statVal} style={{ color }}>{value}</span>
    </div>
  );
}
