"use client";

import { useSyncExternalStore } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import styles from "./SkillRadarMini.module.css";

const METHODS = [
  { key: "Challenger", label: "Challenger", color: "#6366f1" },
  { key: "SPIN", label: "SPIN", color: "#22c55e" },
  { key: "MEDDIC", label: "MEDDIC", color: "#f59e0b" },
  { key: "Sandler", label: "Sandler", color: "#ef4444" },
] as const;

const STORAGE_KEY = "skill_scores";
const STORAGE_EVENT = "skill-radar-storage";
const DEFAULT_SCORES: Record<string, number> = {
  Challenger: 5,
  SPIN: 5,
  MEDDIC: 5,
  Sandler: 5,
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
    for (const method of METHODS) {
      const value = Reflect.get(parsed as Record<string, unknown>, method.key);
      if (typeof value === "number" && Number.isFinite(value)) {
        next[method.key] = Math.min(10, Math.max(1, value));
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

  const chartData = METHODS.map((method) => ({
    subject: method.label,
    value: scores[method.key],
    fullMark: 10,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>역량 자기진단</span>
        <span className={styles.hint}>1-10 자기평가</span>
      </div>

      <div className={styles.body}>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
              <PolarGrid stroke="var(--card-border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: 600 }}
              />
              <Radar
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.18}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.scoreList}>
          {METHODS.map((method) => (
            <div key={method.key} className={styles.scoreRow}>
              <span className={styles.methodDot} style={{ background: method.color }} />
              <span className={styles.methodName}>{method.label}</span>
              <button className={styles.btn} onClick={() => update(method.key, -1)} type="button">
                -
              </button>
              <span className={styles.score} style={{ color: method.color }}>
                {scores[method.key]}
              </span>
              <button className={styles.btn} onClick={() => update(method.key, +1)} type="button">
                +
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
