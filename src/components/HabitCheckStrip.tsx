"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Square } from "lucide-react";
import styles from "./HabitCheckStrip.module.css";

const HABITS = [
  "팔로업 3건",
  "파이프라인 업데이트",
  "Cold call 5건",
  "CRM 기록",
  "오늘 팁 3개",
];

function getTodayKey() {
  return `habits_${new Date().toISOString().slice(0, 10)}`;
}

export default function HabitCheckStrip() {
  const [checked, setChecked] = useState<boolean[]>(Array(HABITS.length).fill(false));

  useEffect(() => {
    const saved = localStorage.getItem(getTodayKey());
    if (saved) setChecked(JSON.parse(saved));
  }, []);

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      localStorage.setItem(getTodayKey(), JSON.stringify(next));
      return next;
    });
  };

  const done  = checked.filter(Boolean).length;
  const total = HABITS.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <span className={styles.label}>오늘의 루틴</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.count}>{done}/{total} 완료</span>
      </div>

      <div className={styles.habits}>
        {HABITS.map((h, i) => (
          <button key={i} className={styles.habit} onClick={() => toggle(i)}>
            {checked[i]
              ? <CheckSquare size={13} style={{ color: "#6366f1", flexShrink: 0 }} />
              : <Square      size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            }
            <span className={styles.habitText} style={{ opacity: checked[i] ? 0.35 : 0.65 }}>
              {h}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
