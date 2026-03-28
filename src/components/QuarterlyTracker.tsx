"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import { getHeatColor } from "@/lib/heatUtils";
import type { IndividualData, RegionData } from "@/types/dashboard";
import styles from "./QuarterlyTracker.module.css";

const MILESTONES = [
  { pct: 25, label: "Start", marker: "S1", color: "#818cf8" },
  { pct: 50, label: "Build", marker: "S2", color: "#a78bfa" },
  { pct: 75, label: "Push", marker: "S3", color: "#fbbf24" },
  { pct: 100, label: "Plan", marker: "S4", color: "#4ade80" },
  { pct: 115, label: "Stretch", marker: "SX", color: "#fde68a" },
] as const;

const BAR_MAX = 115;

interface Props {
  data: RegionData[];
  individuals: IndividualData[];
  periodLabel: string;
}

function formatRevenue(value: number): string {
  return `KRW ${Math.round(value).toLocaleString()}M`;
}

export default function QuarterlyTracker({ data, individuals, periodLabel }: Props) {
  const [view, setView] = useState<"team" | "individual">("team");

  const totalRevenue = data.reduce((sum, region) => sum + region.revenue, 0);
  const totalTarget = data.reduce((sum, region) => sum + region.target, 0);
  const progress = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
  const remaining = Math.max(0, totalTarget - totalRevenue);
  const barFillPct = Math.min((progress / BAR_MAX) * 100, 100);
  const currentMilestone =
    [...MILESTONES].reverse().find((item) => progress >= item.pct) ?? null;
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.qBadge}>{periodLabel}</span>
          <div>
            <h3 className={styles.title}>BD target tracker</h3>
            <p className={styles.sub}>
              {formatRevenue(totalRevenue)} / {formatRevenue(totalTarget)}
            </p>
          </div>
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

      <ProgressTrack
        progress={progress}
        barFillPct={barFillPct}
        currentMilestone={currentMilestone}
      />

      {view === "team" ? (
        <TeamPanel
          totalRevenue={totalRevenue}
          totalTarget={totalTarget}
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
              {currentMilestone?.marker ?? "S0"} {progress.toFixed(1)}%
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
        color={remaining > 0 ? "#fbbf24" : "#4ade80"}
      />
      <Stat
        label="Attainment"
        value={`${progress.toFixed(1)}%`}
        color={progress >= 100 ? "#4ade80" : progress >= 75 ? "#a3e635" : "#fbbf24"}
      />
      <Stat label="Top rep" value={topRep} color="#a5b4fc" />
      <div className={styles.statItem}>
        <span className={styles.statLbl}>Next milestone</span>
        <span className={styles.statVal} style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {nextMilestone
            ? `${nextMilestone.marker} ${nextMilestone.label} needs ${formatRevenue(revenueNeeded)}`
            : `${currentMilestone?.marker ?? "SX"} stretch zone reached`}
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
          <div key={person.name} className={styles.indivRow}>
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
            <span className={styles.indivRev}>{formatRevenue(person.wonRevenue)}</span>
            <span className={styles.indivPipe} style={{ color: "#818cf8" }}>
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
