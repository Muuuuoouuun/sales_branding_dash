"use client";

import { useSyncExternalStore } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./SkillRadarMini.module.css";

const SKILLS = [
  { key: "prospecting", label: "고객 발굴", color: "#3B82F6" },
  { key: "discovery", label: "니즈 파악", color: "#10B981" },
  { key: "presentation", label: "가치 제안", color: "#F59E0B" },
  { key: "negotiation", label: "조건 협상", color: "#8B5CF6" },
  { key: "closing", label: "클로징", color: "#EF4444" },
] as const;

const STORAGE_KEY = "sales_rep_skills";
const STORAGE_EVENT = "sales-rep-skills-event";
const DEFAULT_SCORES: Record<string, number> = {
  prospecting: 6,
  discovery: 7,
  presentation: 8,
  negotiation: 5,
  closing: 6,
};

function subscribeToStorage(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_EVENT, handler);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function parseScores(snapshot: string): Record<string, number> {
  if (!snapshot) {
    return DEFAULT_SCORES;
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_SCORES;
    }

    const next: Record<string, number> = { ...DEFAULT_SCORES };
    for (const skill of SKILLS) {
      const value = Reflect.get(parsed as Record<string, unknown>, skill.key);
      if (typeof value === "number" && Number.isFinite(value)) {
        next[skill.key] = Math.min(10, Math.max(1, value));
      }
    }

    return next;
  } catch {
    return DEFAULT_SCORES;
  }
}

function emitStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function SkillRadarMini() {
  const scores = parseScores(useSyncExternalStore(subscribeToStorage, getSnapshot, () => ""));

  const update = (key: string, delta: number) => {
    const next = {
      ...scores,
      [key]: Math.min(10, Math.max(1, scores[key] + delta)),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitStorageChange();
  };

  const chartData = SKILLS.map((skill) => ({
    subject: skill.label,
    value: scores[skill.key],
    fullMark: 10,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>영업 5대 핵심 역량</span>
        <span className={styles.hint}>1-10 자가 진단</span>
      </div>

      <div className={styles.body}>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
              <PolarGrid stroke="var(--card-border)" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: 600 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--card-border)', backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(8px)', fontSize: '12px' }}
                itemStyle={{ color: 'var(--foreground)' }}
              />
              <Radar
                name="역량 점수"
                dataKey="value"
                stroke="#2563EB"
                fill="#3B82F6"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.scoreList}>
          {SKILLS.map((skill) => (
            <div key={skill.key} className={styles.scoreRow}>
              <span className={styles.methodDot} style={{ background: skill.color, boxShadow: `0 0 8px ${skill.color}40` }} />
              <span className={styles.methodName}>{skill.label}</span>
              <button className={styles.btn} onClick={() => update(skill.key, -1)} type="button">
                -
              </button>
              <span className={styles.score} style={{ color: skill.color }}>
                {scores[skill.key]}
              </span>
              <button className={styles.btn} onClick={() => update(skill.key, +1)} type="button">
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
