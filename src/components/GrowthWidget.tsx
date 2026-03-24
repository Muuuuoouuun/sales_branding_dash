"use client";

import { useState, useEffect } from "react";
import { Flame, BookOpen } from "lucide-react";
import styles from "./GrowthWidget.module.css";

interface Level {
  label: string;
  color: string;
}

function getLevel(streak: number, total: number): Level {
  const score = streak * 2 + total;
  if (score >= 100) return { label: "Platinum", color: "#e879f9" };
  if (score >= 50)  return { label: "Gold",     color: "#f59e0b" };
  if (score >= 20)  return { label: "Silver",   color: "#94a3b8" };
  return                   { label: "Bronze",   color: "#b45309" };
}

const TIP_GOAL = 3;

export default function GrowthWidget() {
  const [streak,    setStreak]    = useState(0);
  const [tipsToday, setTipsToday] = useState(0);
  const [tipsTotal, setTipsTotal] = useState(0);

  useEffect(() => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const lastVisit    = localStorage.getItem("growth_last_visit");
    const storedStreak = parseInt(localStorage.getItem("growth_streak") || "0", 10);

    let newStreak = storedStreak;
    if (lastVisit !== today) {
      newStreak = lastVisit === yesterday ? storedStreak + 1 : 1;
      localStorage.setItem("growth_streak",     String(newStreak));
      localStorage.setItem("growth_last_visit", today);
    }
    setStreak(newStreak);

    const td = parseInt(localStorage.getItem(`tips_today_${today}`) || "0", 10);
    const tt = parseInt(localStorage.getItem("tips_total")           || "0", 10);
    setTipsToday(td);
    setTipsTotal(tt);
  }, []);

  const level = getLevel(streak, tipsTotal);

  return (
    <div className={styles.card}>
      <span className={styles.label}>오늘의 성장</span>

      <div className={styles.streakRow}>
        <Flame size={22} style={{ color: streak > 0 ? "#f97316" : "#3f3f46" }} />
        <span className={styles.streakNum}>{streak}</span>
        <span className={styles.streakUnit}>일 연속</span>
      </div>

      <div className={styles.tipsRow}>
        <BookOpen size={11} style={{ color: "var(--text-muted)" }} />
        <div className={styles.dots}>
          {Array.from({ length: TIP_GOAL }).map((_, i) => (
            <span
              key={i}
              className={styles.dot}
              style={{ background: i < tipsToday ? "#6366f1" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>
        <span className={styles.tipsCount}>{Math.min(tipsToday, TIP_GOAL)}/{TIP_GOAL} 팁</span>
      </div>

      <span
        className={styles.levelBadge}
        style={{ color: level.color, borderColor: `${level.color}44`, background: `${level.color}16` }}
      >
        {level.label}
      </span>
    </div>
  );
}
