"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import { formatRevenue, formatCompactRevenue } from "@/lib/formatCurrency";
import { getHeatColor } from "@/lib/heatUtils";
import type { IndividualData, RegionData, TeamSummary } from "@/types/dashboard";
import styles from "./QuarterlyTracker.module.css";

const MILESTONES = [
  { pct: 25, label: "Discovery", marker: "P1", color: "var(--danger)", desc: "타겟 25% 달성 지점" },
  { pct: 50, label: "Proposal", marker: "P2", color: "var(--warning)", desc: "타겟 50% 달성 지점" },
  { pct: 75, label: "Commit", marker: "P3", color: "var(--primary)", desc: "타겟 75% 달성 지점" },
  { pct: 100, label: "Quota", marker: "TGT", color: "var(--accent)", desc: "타겟 100% (Quota) 달성" },
  { pct: 115, label: "Overachieve", marker: "STR", color: "var(--success-foreground)", desc: "타겟 115% 초과 달성" },
] as const;

const BAR_MAX = 115;

interface Props {
  data: RegionData[];
  individuals: IndividualData[];
  periodLabel: string;
  teamSummary: TeamSummary;
}

export default function QuarterlyTracker({ data, individuals, periodLabel, teamSummary }: Props) {
  const [view, setView] = useState<"team" | "individual">("team");
  const [period, setPeriod] = useState<"M" | "Q" | "Y">("Q");

  const currentMonth = teamSummary.currentMonth ?? new Date().getMonth() + 1;

  // Use DSH-based teamSummary as the single source of truth
  const displayRevenue = period === "Y"
    ? (teamSummary.yearlyActual ?? teamSummary.actualRevenue)
    : period === "M"
      ? (teamSummary.monthlyActual ?? 0)
      : teamSummary.actualRevenue;
  const displayTarget = period === "Y"
    ? (teamSummary.yearlyTarget ?? teamSummary.targetRevenue)
    : period === "M"
      ? (teamSummary.monthlyTarget ?? 0)
      : teamSummary.targetRevenue;
  const progress = displayTarget > 0 ? (displayRevenue / displayTarget) * 100 : 0;
  const remaining = Math.max(0, displayTarget - displayRevenue);
  const barFillPct = Math.min((progress / BAR_MAX) * 100, 100);
  const currentMilestone =
    [...MILESTONES].reverse().find((item) => progress >= item.pct) ?? null;

  const periodBadge = period === "Y"
    ? periodLabel.replace(/Q\d$/, "FY")
    : period === "M"
      ? periodLabel.replace(/Q\d/, `${currentMonth}월`)
      : periodLabel;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.qBadge}>{periodBadge}</span>
          <div>
            <h3 className={styles.title}>BD target tracker</h3>
            <p className={styles.sub}>
              {formatRevenue(displayRevenue)} / {formatRevenue(displayTarget)}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggle} ${period === "M" ? styles.toggleOn : ""}`}
              onClick={() => setPeriod("M")}
              type="button"
            >
              M
            </button>
            <button
              className={`${styles.toggle} ${period === "Q" ? styles.toggleOn : ""}`}
              onClick={() => setPeriod("Q")}
              type="button"
            >
              Q
            </button>
            <button
              className={`${styles.toggle} ${period === "Y" ? styles.toggleOn : ""}`}
              onClick={() => setPeriod("Y")}
              type="button"
            >
              Y
            </button>
          </div>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggle} ${view === "team" ? styles.toggleOn : ""}`}
              onClick={() => setView("team")}
              type="button"
            >
              <Users size={12} /> Team
            </button>
            <button
              className={`${styles.toggle} ${view === "individual" ? styles.toggleOn : ""}`}
              onClick={() => setView("individual")}
              type="button"
            >
              <User size={12} /> Rep
            </button>
          </div>
        </div>
      </div>

      <ProgressTrack
        progress={progress}
        barFillPct={barFillPct}
        currentMilestone={currentMilestone}
      />

      {view === "team" ? (
        <TeamPanel
          totalRevenue={displayRevenue}
          totalTarget={displayTarget}
          remaining={remaining}
          progress={progress}
          currentMilestone={currentMilestone}
          topRep={individuals[0]?.name ?? "TBD"}
        />
      ) : (
        <IndividualPanel individuals={individuals} />
      )}
    </div>
  );
}

function ProgressTrack({
  progress,
  barFillPct,
  currentMilestone,
}: {
  progress: number;
  barFillPct: number;
  currentMilestone: (typeof MILESTONES)[number] | null;
}) {
  return (
    <div className={styles.trackArea}>
      <div className={styles.milestoneRow}>
        {MILESTONES.map((milestone) => (
          <div
            key={milestone.pct}
            className={styles.milestone}
            style={{ left: `${(milestone.pct / BAR_MAX) * 100}%` }}
            data-tooltip={milestone.desc}
          >
            <span className={styles.msEmoji}>{milestone.marker}</span>
            <span
              className={styles.msLabel}
              style={{ color: progress >= milestone.pct ? milestone.color : "var(--text-muted)" }}
            >
              {milestone.label}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.trackOuter}>
        {MILESTONES.map((milestone) => (
          <div
            key={milestone.pct}
            className={`${styles.tick} ${progress >= milestone.pct ? styles.tickReached : ""}`}
            style={{
              left: `${(milestone.pct / BAR_MAX) * 100}%`,
              color: progress >= milestone.pct ? milestone.color : undefined,
            }}
          />
        ))}
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${barFillPct}%` }}>
            <div className={styles.fillShimmer} />
          </div>
          <div className={styles.cursor} style={{ left: `${barFillPct}%` }}>
            <div className={styles.cursorPill}>
              {currentMilestone?.marker ?? "P0"} {progress.toFixed(1)}%
            </div>
            <div className={styles.cursorLine} />
          </div>
        </div>
      </div>

      <div className={styles.pctRow}>
        {MILESTONES.map((milestone) => (
          <span
            key={milestone.pct}
            className={styles.pctLabel}
            style={{
              left: `${(milestone.pct / BAR_MAX) * 100}%`,
              color: progress >= milestone.pct ? milestone.color : "var(--text-muted)",
            }}
          >
            {milestone.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  totalRevenue,
  totalTarget,
  remaining,
  progress,
  currentMilestone,
  topRep,
}: {
  totalRevenue: number;
  totalTarget: number;
  remaining: number;
  progress: number;
  currentMilestone: (typeof MILESTONES)[number] | null;
  topRep: string;
}) {
  const nextMilestone = MILESTONES.find((milestone) => progress < milestone.pct);
  const revenueNeeded = nextMilestone
    ? Math.max(Math.round((nextMilestone.pct / 100) * totalTarget - totalRevenue), 0)
    : 0;

  return (
    <div className={styles.teamRow}>
      <Stat label="Current revenue" value={formatRevenue(totalRevenue)} color="var(--foreground)" />
      <Stat
        label="Remaining gap"
        value={remaining > 0 ? formatRevenue(remaining) : "Target hit"}
        color={remaining > 0 ? "var(--warning)" : "var(--accent)"}
      />
      <Stat
        label="Attainment"
        value={`${progress.toFixed(1)}%`}
        color={progress >= 100 ? "var(--accent)" : progress >= 75 ? "var(--primary)" : "var(--warning)"}
      />
      <Stat label="Top rep" value={topRep} color="var(--primary)" />
      <div className={styles.statItem}>
        <span className={styles.statLbl}>Next milestone</span>
        <span className={styles.statVal} style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {nextMilestone
            ? `다음 단계(${nextMilestone.label})까지 ${formatRevenue(revenueNeeded)} 추가 확보 필요`
            : `Quota 달성 완료. Overachieve 구간 진입!`}
        </span>
      </div>
    </div>
  );
}

function IndividualPanel({ individuals }: { individuals: IndividualData[] }) {
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
        <span>Progress</span>
        <span style={{ textAlign: "right" }}>Att.</span>
        <span style={{ textAlign: "right" }}>Won</span>
        <span style={{ textAlign: "right" }}>Pipeline</span>
        <span style={{ textAlign: "right" }}>Deals</span>
      </div>

      {individuals.map((person, index) => {
        const color = getHeatColor(person.progress);
        const fillWidth = Math.min((person.progress / BAR_MAX) * 100, 100);
        const milestone =
          [...MILESTONES].reverse().find((item) => person.progress >= item.pct) ?? null;

        return (
          <div 
            key={person.name} 
            className={styles.indivRow}
            data-tooltip={`목표: ${formatRevenue(person.target)} | 달성: ${formatRevenue(person.wonRevenue)} | 남은 격차: ${formatRevenue(Math.max(0, person.target - person.wonRevenue))}`}
          >
            <span className={styles.indivRank}>#{index + 1}</span>
            <span className={styles.indivName}>
              {person.name}
              {milestone ? <span className={styles.indivMs}>{milestone.marker}</span> : null}
            </span>
            <div className={styles.indivBarWrap}>
              {MILESTONES.map((item) => (
                <div
                  key={item.pct}
                  className={styles.indivTick}
                  style={{ left: `${(item.pct / BAR_MAX) * 100}%` }}
                />
              ))}
              <div
                style={{
                  width: `${fillWidth}%`,
                  background: color,
                  height: "100%",
                  borderRadius: 3,
                  transition: "width 0.6s ease",
                  position: "relative",
                }}
              />
            </div>
            <span className={styles.indivPct} style={{ color }}>
              {person.progress}%
            </span>
            <span className={styles.indivRev} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2, gap: '2px' }}>
              <span>{formatRevenue(person.wonRevenue)}</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/ {formatRevenue(person.target)}</span>
            </span>
            <span className={styles.indivPipe} style={{ color: "var(--primary)" }}>
              {formatRevenue(person.pipelineRevenue)}
            </span>
            <span className={styles.indivDeals} style={{ color: "var(--text-muted)" }}>
              {person.deals_won}/{person.deals_total}
            </span>
          </div>
        );
      })}

      <p className={styles.indivNote}>
        Won = closed revenue. Pipeline = weighted open revenue.
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLbl}>{label}</span>
      <span className={styles.statVal} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
