"use client";

import React, { useState, useEffect } from "react";
import { Lightbulb, ChevronRight, X } from "lucide-react";
import GURU_TIPS from "@/data/guru_tips.json";

export default function DailyGuruTip() {
  const [isVisible, setIsVisible] = useState(true);
  const [tipOfTheDay, setTipOfTheDay] = useState(GURU_TIPS[0]);

  useEffect(() => {
    // 날짜 기반으로 배너에 띄울 팁을 하나 선택 (매일 바뀜)
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
    );
    const dayIndex = dayOfYear % GURU_TIPS.length;
    setTipOfTheDay(GURU_TIPS[dayIndex]);
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      margin: "0 0 1.5rem 0",
      padding: "1rem 1.25rem",
      background: "var(--surface-1)",
      border: "1px solid var(--primary-border)",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backdropFilter: "blur(10px)",
      boxShadow: "var(--shadow-soft)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* 은은한 배경 글로우 */}
      <div style={{
        position: "absolute",
        top: "-50%", left: "-10%",
        width: "150px", height: "150px",
        background: "radial-gradient(circle, var(--primary-soft-strong) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", zIndex: 1 }}>
        <div style={{
          background: "var(--primary-soft)",
          padding: "0.5rem",
          borderRadius: "8px",
          color: "var(--primary-foreground)"
        }}>
          <Lightbulb size={20} />
        </div>
        
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              오늘의 세일즈 꿀팁 • {tipOfTheDay.category}
            </span>
          </div>
          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)" }}>
            "{tipOfTheDay.tip}" <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>— {tipOfTheDay.guru}</span>
          </p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-soft)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "var(--success-foreground)" }} />
            {tipOfTheDay.action}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", zIndex: 1, paddingLeft: "1rem" }}>
        <button style={{
          background: "none", border: "none", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap"
        }}>
          AI 리포트 보기 <ChevronRight size={14} style={{ marginLeft: "2px" }} />
        </button>
        
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
            padding: "4px", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "4px", transition: "all 0.2s"
          }}
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
