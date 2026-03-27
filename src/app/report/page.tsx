"use client";

import React, { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";
import {
  Brain, Download, Loader2, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, Activity,
  Target, Zap, ShieldAlert, CheckCircle2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Anomaly {
  type: string;
  severity: "warning" | "critical";
  entity: string;
  message: string;
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalTarget: number;
  overallProgress: number;
  winRate: number;
  pipelineValue: number;
  pipelineHealthRatio: number;
  q1Forecast: number;
  forecastVsTarget: number;
  anomalyCount: number;
  criticalCount: number;
  anomalies: Anomaly[];
}

type ReportState = "idle" | "loading" | "streaming" | "done" | "error";

// ── Section Parser ─────────────────────────────────────────────────────────────
const SECTION_META: Record<string, { color: string; icon: React.ReactNode }> = {
  "현황 진단":     { color: "#6366f1", icon: <Activity size={15} /> },
  "위험 신호 분석": { color: "#ef4444", icon: <ShieldAlert size={15} /> },
  "전략 방향":     { color: "#f59e0b", icon: <Target size={15} /> },
  "즉시 실행 플랜": { color: "#22c55e", icon: <Zap size={15} /> },
};

function parseReportSections(text: string) {
  const lines = text.split("\n");
  const sections: { key: string; meta: (typeof SECTION_META)[string]; lines: string[] }[] = [];
  let current: (typeof sections)[number] | null = null;

  for (const line of lines) {
    const heading = line.replace(/^##\s*/, "").trim();
    if (SECTION_META[heading]) {
      if (current) sections.push(current);
      current = { key: heading, meta: SECTION_META[heading], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ReportPage() {
  const [state,     setState]     = useState<ReportState>("idle");
  const [report,    setReport]    = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generateReport = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setState("loading");
    setReport("");
    setAnalytics(null);

    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("API error");

      const rawHeader = res.headers.get("X-Analytics");
      if (rawHeader) {
        try { setAnalytics(JSON.parse(rawHeader)); } catch {}
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      setState("streaming");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setReport(prev => prev + decoder.decode(value, { stream: true }));
      }
      setState("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState("error");
    }
  }, []);

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `AI_전략리포트_${new Date().toLocaleDateString("ko-KR").replace(/\.\s*/g, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = report ? parseReportSections(report) : [];
  const isActive = state === "loading" || state === "streaming";

  return (
    <div className={styles.container}>

      {/* ── Header ── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>AI Strategy Reports</h1>
          <p className={styles.subtitle}>통계 분석 엔진 + Gemini 3.1 Pro — 실시간 스트리밍 전략 리포트</p>
        </div>
        <div className={styles.headerActions}>
          {(state === "done" || state === "streaming") && (
            <button className={styles.dlBtn} onClick={handleDownload} disabled={isActive}>
              <Download size={14} /> 다운로드
            </button>
          )}
          <button className={styles.generateBtn} onClick={generateReport} disabled={isActive}>
            {isActive
              ? <><Loader2 size={14} className={styles.spin} /> 분석 중…</>
              : state === "done"
                ? <><RefreshCw size={14} /> 재생성</>
                : <><Brain size={14} /> AI 리포트 생성</>}
          </button>
        </div>
      </header>

      {/* ── Analytics Summary Cards ── */}
      {analytics && (
        <div className={styles.analyticsGrid}>
          <SummaryCard
            label="전체 달성률"
            value={`${analytics.overallProgress}%`}
            sub={`₩${analytics.totalRevenue.toLocaleString()}M / ₩${analytics.totalTarget.toLocaleString()}M`}
            color={analytics.overallProgress >= 90 ? "#4ade80" : analytics.overallProgress >= 70 ? "#fbbf24" : "#ef4444"}
            icon={analytics.overallProgress >= 90 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          />
          <SummaryCard
            label="팀 승률"
            value={`${analytics.winRate}%`}
            sub="계약 완료 / 전체 리드"
            color="#818cf8"
            icon={<CheckCircle2 size={16} />}
          />
          <SummaryCard
            label="파이프라인 건강도"
            value={`${analytics.pipelineHealthRatio}%`}
            sub={`₩${analytics.pipelineValue.toLocaleString()}M 기대 가치`}
            color={analytics.pipelineHealthRatio >= 100 ? "#4ade80" : analytics.pipelineHealthRatio >= 70 ? "#fbbf24" : "#ef4444"}
            icon={<Activity size={16} />}
          />
          <SummaryCard
            label="Q1 예측 달성률"
            value={`${analytics.forecastVsTarget}%`}
            sub={`₩${analytics.q1Forecast.toLocaleString()}M 예측`}
            color={analytics.forecastVsTarget >= 100 ? "#4ade80" : analytics.forecastVsTarget >= 80 ? "#fbbf24" : "#ef4444"}
            icon={<Target size={16} />}
          />
        </div>
      )}

      {/* ── Anomaly Strip ── */}
      {analytics && analytics.anomalies.length > 0 && (
        <div className={styles.anomalyStrip}>
          <div className={styles.anomalyHeader}>
            <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
            <span>자동 감지 이상 신호 — <strong style={{ color: "#f87171" }}>{analytics.criticalCount}건 CRITICAL</strong> · {analytics.anomalyCount - analytics.criticalCount}건 WARNING</span>
          </div>
          <div className={styles.anomalyList}>
            {analytics.anomalies.map((a, i) => (
              <div key={i} className={`${styles.anomalyItem} ${a.severity === "critical" ? styles.anomalyCritical : styles.anomalyWarning}`}>
                <span className={styles.severityDot}>{a.severity === "critical" ? "🔴" : "🟡"}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Idle State ── */}
      {state === "idle" && (
        <div className={styles.idleBox}>
          <Brain size={44} className={styles.idleIcon} />
          <h2 className={styles.idleTitle}>AI 전략 리포트 생성</h2>
          <p className={styles.idleDesc}>
            통계 분석 엔진이 지역 성과 · 리드 우선순위 · 파이프라인 건강도 · 이상 신호를 계산한 후
            <br />Gemini 3.1 Pro가 경영진 수준의 심층 전략 리포트를 실시간 스트리밍합니다.
          </p>
          <div className={styles.idleFeatures}>
            {["달성률 · 승률 · Q1 예측", "지역별 긴급도 분석", "리드 우선순위 스코어", "이상 신호 자동 감지"].map(f => (
              <span key={f} className={styles.idleFeatureChip}>{f}</span>
            ))}
          </div>
          <button className={styles.generateBtnLarge} onClick={generateReport}>
            <Brain size={16} /> 지금 생성하기
          </button>
        </div>
      )}

      {/* ── Error State ── */}
      {state === "error" && (
        <div className={styles.errorBox}>
          <AlertTriangle size={28} style={{ color: "#f87171", marginBottom: "0.5rem" }} />
          <p>리포트 생성 실패. GEMINI_API_KEY를 확인하고 다시 시도해주세요.</p>
          <button className={styles.generateBtn} onClick={generateReport} style={{ marginTop: "0.75rem" }}>
            다시 시도
          </button>
        </div>
      )}

      {/* ── Report Output ── */}
      {(state === "streaming" || state === "done") && (
        <div className={styles.reportOutput}>
          {sections.length > 0
            ? sections.map((sec, si) => (
                <div
                  key={sec.key}
                  className={styles.reportSection}
                  style={{ "--sec-color": sec.meta.color } as React.CSSProperties}
                >
                  <div className={styles.sectionHeading} style={{ color: sec.meta.color }}>
                    {sec.meta.icon}
                    <span>{sec.key}</span>
                    {state === "streaming" && si === sections.length - 1 && (
                      <span className={styles.cursor} />
                    )}
                  </div>
                  <div className={styles.sectionBody}>
                    {sec.lines.join("\n").trim().split("\n").map((line, li) => {
                      if (!line.trim()) return <br key={li} />;
                      // Bold markdown
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={li} className={styles.sectionLine}>
                          {parts.map((p, pi) =>
                            p.startsWith("**") && p.endsWith("**")
                              ? <strong key={pi}>{p.slice(2, -2)}</strong>
                              : <React.Fragment key={pi}>{p}</React.Fragment>
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))
            : (
              <div className={styles.rawOutput}>
                {report}
                {state === "streaming" && <span className={styles.cursor} />}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ── Summary Card ───────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryTop}>
        <span className={styles.summaryLabel}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className={styles.summaryValue} style={{ color }}>{value}</div>
      <div className={styles.summarySub}>{sub}</div>
    </div>
  );
}
