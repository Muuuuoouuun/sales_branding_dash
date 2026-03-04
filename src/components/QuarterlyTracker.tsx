"use client";

import { useState } from "react";
import { Users, User } from "lucide-react";
import { getHeatColor } from "@/lib/heatUtils";
import type { RegionData } from "./KoreaProvinceMap";
import type { IndividualData } from "@/app/page";
import styles from "./QuarterlyTracker.module.css";

// ─── Milestone definitions ────────────────────────────────────────────────
const MILESTONES = [
  { pct: 25,  label: "시동",    emoji: "🚀", color: "#818cf8" },
  { pct: 50,  label: "중간",    emoji: "⚡", color: "#a78bfa" },
  { pct: 75,  label: "추진",    emoji: "🎯", color: "#fbbf24" },
  { pct: 100, label: "달성",    emoji: "✅", color: "#4ade80" },
  { pct: 115, label: "Legend", emoji: "🏆", color: "#fde68a" },
];

const BAR_MAX = 115;

interface Props {
  data:        RegionData[];
  individuals: IndividualData[];
}

export default function QuarterlyTracker({ data, individuals }: Props) {
  const [view, setView] = useState<"team" | "individual">("team");

  // ── Team aggregates ──────────────────────────────────────────────────────
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalTarget  = data.reduce((s, r) => s + r.target,  0);
  const progress     = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
  const remaining    = Math.max(0, totalTarget - totalRevenue);
  const barFillPct   = Math.min((progress / BAR_MAX) * 100, 100);

  const reached    = MILESTONES.filter(m => progress >= m.pct);
  const currentMS  = reached[reached.length - 1] ?? null;

  return (
    <div className={styles.card}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.qBadge}>Q1 2026</span>
          <div>
            <h3 className={styles.title}>분기 매출 트래킹</h3>
            <p className={styles.sub}>
              ₩{totalRevenue.toLocaleString()}M &nbsp;/&nbsp; 목표 ₩{totalTarget.toLocaleString()}M
            </p>
          </div>
        </div>
        <div className={styles.toggleGroup}>
          <button
            className={`${styles.toggle} ${view === "team" ? styles.toggleOn : ""}`}
            onClick={() => setView("team")}
          >
            <Users size={12} /> 팀
          </button>
          <button
            className={`${styles.toggle} ${view === "individual" ? styles.toggleOn : ""}`}
            onClick={() => setView("individual")}
          >
            <User size={12} /> 개인
          </button>
        </div>
      </div>

      {/* ── Progress Track (always shown, reflects team or selected individual) ── */}
      <ProgressTrack
        progress={view === "team" ? progress : progress /* team bar always */}
        barFillPct={barFillPct}
        currentMS={currentMS}
      />

      {/* ── Bottom panel ── */}
      {view === "team" ? (
        <TeamPanel
          totalRevenue={totalRevenue}
          totalTarget={totalTarget}
          remaining={remaining}
          progress={progress}
          currentMS={currentMS}
        />
      ) : (
        <IndivPanel individuals={individuals} teamTarget={totalTarget} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ProgressTrack({
  progress,
  barFillPct,
  currentMS,
}: {
  progress: number;
  barFillPct: number;
  currentMS: typeof MILESTONES[number] | null;
}) {
  return (
    <div className={styles.trackArea}>
      {/* Emoji + label row above */}
      <div className={styles.milestoneRow}>
        {MILESTONES.map(m => (
          <div
            key={m.pct}
            className={styles.milestone}
            style={{ left: `${(m.pct / BAR_MAX) * 100}%` }}
          >
            <span className={styles.msEmoji}>{m.emoji}</span>
            <span
              className={styles.msLabel}
              style={{ color: progress >= m.pct ? m.color : "var(--text-muted)" }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bar */}
      <div className={styles.trackOuter}>
        {MILESTONES.map(m => (
          <div
            key={m.pct}
            className={`${styles.tick} ${progress >= m.pct ? styles.tickReached : ""}`}
            style={{
              left: `${(m.pct / BAR_MAX) * 100}%`,
              color: progress >= m.pct ? m.color : undefined,
            }}
          />
        ))}
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${barFillPct}%` }}>
            <div className={styles.fillShimmer} />
          </div>
          <div className={styles.cursor} style={{ left: `${barFillPct}%` }}>
            <div className={styles.cursorPill}>
              {currentMS?.emoji ?? "📍"} {progress.toFixed(1)}%
            </div>
            <div className={styles.cursorLine} />
          </div>
        </div>
      </div>

      {/* Pct labels below */}
      <div className={styles.pctRow}>
        {MILESTONES.map(m => (
          <span
            key={m.pct}
            className={styles.pctLabel}
            style={{
              left:  `${(m.pct / BAR_MAX) * 100}%`,
              color: progress >= m.pct ? m.color : "var(--text-muted)",
            }}
          >
            {m.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  totalRevenue, totalTarget, remaining, progress, currentMS,
}: {
  totalRevenue: number; totalTarget: number; remaining: number;
  progress: number; currentMS: typeof MILESTONES[number] | null;
}) {
  const next = MILESTONES.find(m => progress < m.pct);
  const needRevenue = next ? Math.round((next.pct / 100) * totalTarget - totalRevenue) : 0;

  return (
    <div className={styles.teamRow}>
      <Stat label="현재 매출" value={`₩${totalRevenue.toLocaleString()}M`} color="var(--foreground)" />
      <Stat
        label="잔여 목표"
        value={remaining > 0 ? `₩${remaining.toLocaleString()}M` : "초과 달성 🎉"}
        color={remaining > 0 ? "#fbbf24" : "#4ade80"}
      />
      <Stat
        label="달성률"
        value={`${progress.toFixed(1)}%`}
        color={progress >= 100 ? "#4ade80" : progress >= 75 ? "#a3e635" : progress >= 50 ? "#fbbf24" : "#818cf8"}
      />
      <Stat
        label="현재 마일스톤"
        value={currentMS ? `${currentMS.emoji} ${currentMS.label}` : "— 시작 전"}
        color={currentMS?.color ?? "var(--text-muted)"}
      />
      <div className={styles.statItem}>
        <span className={styles.statLbl}>다음 마일스톤</span>
        <span className={styles.statVal} style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {next
            ? `${next.emoji} ${next.label} — ₩${needRevenue.toLocaleString()}M 필요`
            : "🏆 최고 마일스톤 달성!"}
        </span>
      </div>
    </div>
  );
}

function IndivPanel({ individuals, teamTarget }: { individuals: IndividualData[]; teamTarget: number }) {
  const RANK_COLORS = ["#fde68a", "#d1d5db", "#92400e"];

  if (individuals.length === 0) {
    return (
      <div className={styles.indivList}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.5rem 0" }}>
          개인 데이터 없음 — leads.csv의 owner 필드를 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.indivList}>
      {/* Column headers */}
      <div className={styles.indivHeader}>
        <span />
        <span>담당자</span>
        <span>분기 진행</span>
        <span style={{ textAlign: "right" }}>달성률</span>
        <span style={{ textAlign: "right" }}>확정 매출</span>
        <span style={{ textAlign: "right" }}>파이프라인</span>
        <span style={{ textAlign: "right" }}>딜</span>
      </div>
      {individuals.map((p, i) => {
        const pct   = p.progress;
        const color = getHeatColor(pct);
        const fillW = Math.min((pct / BAR_MAX) * 100, 100);
        // milestone emoji for this person
        const ms = [...MILESTONES].reverse().find(m => pct >= m.pct);
        return (
          <div key={p.name} className={styles.indivRow}>
            <span
              className={styles.indivRank}
              style={{ color: i < 3 ? RANK_COLORS[i] : "var(--text-muted)" }}
            >
              #{i + 1}
            </span>
            <span className={styles.indivName}>
              {p.name}
              {ms && <span className={styles.indivMs}>{ms.emoji}</span>}
            </span>
            <div className={styles.indivBarWrap}>
              {/* milestone tick marks */}
              {MILESTONES.map(m => (
                <div
                  key={m.pct}
                  className={styles.indivTick}
                  style={{ left: `${(m.pct / BAR_MAX) * 100}%` }}
                />
              ))}
              <div
                style={{
                  width: `${fillW}%`, background: color,
                  height: "100%", borderRadius: 3,
                  transition: "width 0.6s ease", position: "relative",
                }}
              />
            </div>
            <span className={styles.indivPct} style={{ color }}>{pct}%</span>
            <span className={styles.indivRev}>₩{p.wonRevenue.toLocaleString()}M</span>
            <span className={styles.indivPipe} style={{ color: "#818cf8" }}>
              ₩{p.pipelineRevenue.toLocaleString()}M
            </span>
            <span className={styles.indivDeals} style={{ color: "var(--text-muted)" }}>
              {p.deals_won}/{p.deals_total}
            </span>
          </div>
        );
      })}
      <p className={styles.indivNote}>
        * 확정 매출: Contract 딜 합계 &nbsp;|&nbsp; 파이프라인: 확률 가중 예상 매출
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLbl}>{label}</span>
      <span className={styles.statVal} style={{ color }}>{value}</span>
    </div>
  );
}
