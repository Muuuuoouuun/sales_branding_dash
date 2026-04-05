"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BookOpen, Flame } from "lucide-react";
import styles from "./GrowthWidget.module.css";

interface Level {
  label: string;
  color: string;
}

const TIP_GOAL = 3;
const STORAGE_EVENT = "growth-widget-storage";

function getLevel(streak: number, total: number): Level {
  const score = streak * 2 + total;

  if (score >= 100) return { label: "Platinum", color: "var(--ai)" };
  if (score >= 50) return { label: "Gold", color: "var(--warning)" };
  if (score >= 20) return { label: "Silver", color: "var(--text-muted)" };
  return { label: "Bronze", color: "var(--warning-foreground)" };
}

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

function readStoredValue(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) ?? "";
}

function useStoredValue(key: string): string {
  return useSyncExternalStore(
    subscribeToStorage,
    () => readStoredValue(key),
    () => "",
  );
}

function emitStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function GrowthWidget() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

  const streak = parseNumber(useStoredValue("growth_streak"));
  const tipsToday = parseNumber(useStoredValue(`tips_today_${today}`));
  const tipsTotal = parseNumber(useStoredValue("tips_total"));

  useEffect(() => {
    const lastVisit = readStoredValue("growth_last_visit");
    const storedStreak = parseNumber(readStoredValue("growth_streak"));

    if (lastVisit === today) {
      return;
    }

    const nextStreak = lastVisit === yesterday ? storedStreak + 1 : 1;
    window.localStorage.setItem("growth_streak", String(nextStreak));
    window.localStorage.setItem("growth_last_visit", today);
    emitStorageChange();
  }, [today, yesterday]);

  const level = getLevel(streak, tipsTotal);

  return (
    <div className={styles.card}>
      <span className={styles.label}>오늘의 성장</span>

      <div className={styles.streakRow}>
        <Flame size={22} style={{ color: streak > 0 ? "var(--warning)" : "var(--surface-border-strong)" }} />
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
              style={{ background: i < tipsToday ? "var(--primary)" : "var(--surface-border)" }}
            />
          ))}
        </div>
        <span className={styles.tipsCount}>
          {Math.min(tipsToday, TIP_GOAL)}/{TIP_GOAL} 오늘
        </span>
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
