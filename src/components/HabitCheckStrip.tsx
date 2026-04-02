"use client";

import { useSyncExternalStore } from "react";
import { CheckSquare, Square } from "lucide-react";
import styles from "./HabitCheckStrip.module.css";

const HABITS = [
  "팔로업 3건",
  "파이프라인 업데이트",
  "Cold call 5건",
  "CRM 기록",
  "오늘 팁 3개",
];

const STORAGE_EVENT = "habit-check-strip-storage";

function getTodayKey() {
  return `habits_${new Date().toISOString().slice(0, 10)}`;
}

function createDefaultChecked() {
  return Array.from({ length: HABITS.length }, () => false);
}

function parseCheckedSnapshot(snapshot: string): boolean[] {
  if (!snapshot) {
    return createDefaultChecked();
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) {
      return createDefaultChecked();
    }

    return HABITS.map((_, index) => Boolean(parsed[index]));
  } catch {
    return createDefaultChecked();
  }
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

function getSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getTodayKey()) ?? "";
}

function emitStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function HabitCheckStrip() {
  const checked = useSyncExternalStore(subscribeToStorage, getSnapshot, () => "");
  const values = parseCheckedSnapshot(checked);
  const done = values.filter(Boolean).length;
  const total = HABITS.length;
  const pct = Math.round((done / total) * 100);

  const toggle = (index: number) => {
    const next = values.map((value, currentIndex) => (currentIndex === index ? !value : value));
    window.localStorage.setItem(getTodayKey(), JSON.stringify(next));
    emitStorageChange();
  };

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <span className={styles.label}>오늘의 루틴</span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.count}>
          {done}/{total} 완료
        </span>
      </div>

      <div className={styles.habits}>
        {HABITS.map((habit, index) => (
          <button key={habit} className={styles.habit} onClick={() => toggle(index)} type="button">
            {values[index] ? (
              <CheckSquare size={13} style={{ color: "#6366f1", flexShrink: 0 }} />
            ) : (
              <Square size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            )}
            <span className={styles.habitText} style={{ opacity: values[index] ? 0.35 : 0.65 }}>
              {habit}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
