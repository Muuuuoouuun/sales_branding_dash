"use client";

import { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import styles from "./SkillRadarMini.module.css";

const METHODS = [
  { key: "Challenger", label: "Challenger", color: "#6366f1" },
  { key: "SPIN",       label: "SPIN",       color: "#22c55e" },
  { key: "MEDDIC",     label: "MEDDIC",     color: "#f59e0b" },
  { key: "Sandler",    label: "Sandler",    color: "#ef4444" },
];

const STORAGE_KEY = "skill_scores";
const DEFAULT_SCORES: Record<string, number> = {
  Challenger: 5, SPIN: 5, MEDDIC: 5, Sandler: 5,
};

export default function SkillRadarMini() {
  const [scores, setScores] = useState<Record<string, number>>(DEFAULT_SCORES);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setScores(JSON.parse(saved));
  }, []);

  const update = (key: string, delta: number) => {
    setScores(prev => {
      const next = { ...prev, [key]: Math.min(10, Math.max(1, prev[key] + delta)) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const chartData = METHODS.map(m => ({
    subject: m.label,
    value:   scores[m.key],
    fullMark: 10,
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>역량 자기진단</span>
        <span className={styles.hint}>1–10 자기평가</span>
      </div>

      <div className={styles.body}>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)", fontWeight: 600 }}
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
          {METHODS.map(m => (
            <div key={m.key} className={styles.scoreRow}>
              <span className={styles.methodDot} style={{ background: m.color }} />
              <span className={styles.methodName}>{m.label}</span>
              <button className={styles.btn} onClick={() => update(m.key, -1)}>−</button>
              <span className={styles.score} style={{ color: m.color }}>{scores[m.key]}</span>
              <button className={styles.btn} onClick={() => update(m.key, +1)}>+</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
