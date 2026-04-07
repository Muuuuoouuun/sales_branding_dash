"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Calendar,
  Clock,
  Download,
  FileText,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import Card from "@/components/Card";
import styles from "./page.module.css";
import { formatRevenue } from "@/lib/formatCurrency";
import { getContextualTip } from "@/lib/salesTips";

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
type BriefingType = "daily" | "weekly" | "monthly" | "risk-only";

interface ReportSection {
  key: string;
  lines: string[];
}

interface BriefingHistoryEntry {
  id: string;
  type: BriefingType;
  generatedAt: string;
  report: string;
  analytics: AnalyticsSummary | null;
}

const HISTORY_STORAGE_KEY = "report-history-v1";
const HISTORY_LIMIT = 8;

const BRIEFING_TYPES: { id: BriefingType; label: string; horizon: string; icon: React.ReactNode }[] = [
  { id: "daily", label: "일일", horizon: "최근 24시간", icon: <Clock size={13} /> },
  { id: "weekly", label: "주간", horizon: "최근 7일", icon: <Calendar size={13} /> },
  { id: "monthly", label: "월간", horizon: "최근 30일", icon: <TrendingUp size={13} /> },
  { id: "risk-only", label: "리스크", horizon: "리스크 전용", icon: <ShieldAlert size={13} /> },
];

const SECTION_BRIEFS = [
  {
    label: "Executive Summary",
    labelKo: "핵심 요약",
    hint: "지금 무엇이 중요한가",
    icon: Activity,
    tone: "primary",
  },
  {
    label: "Risk Analysis",
    labelKo: "리스크 분석",
    hint: "다음으로 흔들릴 수 있는 것",
    icon: ShieldAlert,
    tone: "danger",
  },
  {
    label: "Action Plan",
    labelKo: "액션 플랜",
    hint: "팀이 해야 할 다음 행동",
    icon: Target,
    tone: "warning",
  },
  {
    label: "Immediate Next Steps",
    labelKo: "즉시 실행 항목",
    hint: "누가 책임지는가",
    icon: Zap,
    tone: "success",
  },
] as const;

const EMPTY_ANALYTICS: AnalyticsSummary = {
  totalRevenue: 0,
  totalTarget: 0,
  overallProgress: 0,
  winRate: 0,
  pipelineValue: 0,
  pipelineHealthRatio: 0,
  q1Forecast: 0,
  forecastVsTarget: 0,
  anomalyCount: 0,
  criticalCount: 0,
  anomalies: [],
};


function parseReportSections(text: string): ReportSection[] {
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;

  for (const line of text.split("\n")) {
    const heading = line.match(/^##\s*(.+)$/)?.[1]?.trim();
    if (heading) {
      if (current) {
        sections.push(current);
      }

      current = { key: heading, lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderInlineText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function getSectionMeta(index: number) {
  return SECTION_BRIEFS[index] ?? SECTION_BRIEFS[SECTION_BRIEFS.length - 1];
}

function readHistory(): BriefingHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeHistory(entries: BriefingHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    /* quota — ignore */
  }
}

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = Math.floor(hr / 24);
  return `${d}일 전`;
}

export default function ReportPage() {
  const { language } = require("@/components/SettingsProvider").useSettings();
  const [state, setState] = useState<ReportState>("idle");
  const [report, setReport] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [briefingType, setBriefingType] = useState<BriefingType>("daily");
  const [history, setHistory] = useState<BriefingHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const dailyTip = getContextualTip("report");

  // Load history on mount
  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const loadFromHistory = (entry: BriefingHistoryEntry) => {
    setReport(entry.report);
    setAnalytics(entry.analytics);
    setGeneratedAt(entry.generatedAt);
    setBriefingType(entry.type);
    setState("done");
    setShowHistory(false);
  };

  const generateReport = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = new AbortController();
    setState("loading");
    setReport("");
    setAnalytics(null);
    setGeneratedAt(null);

    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingType }),
      });

      if (!res.ok) {
        throw new Error("API error");
      }

      const rawHeader = res.headers.get("X-Analytics");
      if (rawHeader) {
        try {
          setAnalytics(JSON.parse(rawHeader) as AnalyticsSummary);
        } catch {
          setAnalytics(null);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Missing response body");
      }

      const decoder = new TextDecoder();
      setState("streaming");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setReport((prev) => prev + chunk);
        }
      }

      const completedAt = new Date().toISOString();
      setGeneratedAt(completedAt);
      setState("done");

      // Save to history
      const newEntry: BriefingHistoryEntry = {
        id: `report-${Date.now()}`,
        type: briefingType,
        generatedAt: completedAt,
        report: accumulated,
        analytics: analytics, // captured from header earlier (stale but acceptable)
      };
      setHistory((prev) => {
        const next = [newEntry, ...prev].slice(0, HISTORY_LIMIT);
        writeHistory(next);
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setState("error");
    }
  }, [briefingType, analytics]);

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!report) return;
    const briefingLabel = BRIEFING_TYPES.find((b) => b.id === briefingType)?.label ?? briefingType;
    const formattedDate = generatedAt
      ? new Date(generatedAt).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" })
      : new Date().toLocaleString("ko-KR");

    // Convert markdown sections to HTML
    const sectionHtml = parseReportSections(report)
      .map((section, i) => {
        const meta = SECTION_BRIEFS[i] ?? SECTION_BRIEFS[SECTION_BRIEFS.length - 1];
        const lines = section.lines
          .filter((l) => l.trim())
          .map((line) => {
            const trimmed = line.trim();
            const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
            const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
            const content = (bullet?.[1] ?? numbered?.[1] ?? trimmed)
              .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
            return bullet || numbered
              ? `<li>${content}</li>`
              : `<p>${content}</p>`;
          })
          .join("");
        const wrapped = lines.includes("<li>") ? `<ul>${lines}</ul>` : lines;
        return `
          <section class="brief-section tone-${meta.tone}">
            <div class="brief-section-head">
              <div class="brief-index">0${i + 1}</div>
              <div>
                <h2>${meta.labelKo}</h2>
                <p class="brief-hint">${meta.hint}</p>
              </div>
            </div>
            <div class="brief-body">${wrapped}</div>
          </section>
        `;
      })
      .join("");

    const analyticsHtml = analytics
      ? `
        <div class="brief-metrics">
          <div class="brief-metric"><span>달성률</span><strong>${analytics.overallProgress}%</strong></div>
          <div class="brief-metric"><span>승률</span><strong>${analytics.winRate}%</strong></div>
          <div class="brief-metric"><span>파이프라인</span><strong>${analytics.pipelineHealthRatio}%</strong></div>
          <div class="brief-metric"><span>예측 vs 목표</span><strong>${analytics.forecastVsTarget}%</strong></div>
        </div>
      `
      : "";

    const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>BD ${briefingLabel} 브리핑 — ${formattedDate}</title>
<style>
  @page { margin: 1.5cm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; color: #1a1a2e; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 1.5rem; }
  .brief-header { border-bottom: 3px solid #2563eb; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  .brief-eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #2563eb; }
  h1 { font-size: 1.6rem; margin: 0.4rem 0 0.3rem; }
  .brief-meta { font-size: 0.78rem; color: #666; }
  .brief-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin: 1.25rem 0 1.75rem; }
  .brief-metric { background: #f1f5f9; border-left: 3px solid #2563eb; border-radius: 6px; padding: 0.65rem 0.85rem; }
  .brief-metric span { display: block; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: #666; font-weight: 600; }
  .brief-metric strong { display: block; font-size: 1.15rem; margin-top: 0.25rem; font-variant-numeric: tabular-nums; }
  .brief-section { margin-bottom: 1.5rem; padding: 0.85rem 1.1rem; border-left: 4px solid #cbd5e1; border-radius: 6px; background: #fafbfc; page-break-inside: avoid; }
  .brief-section.tone-primary { border-left-color: #2563eb; }
  .brief-section.tone-danger { border-left-color: #ef4444; background: #fef2f2; }
  .brief-section.tone-warning { border-left-color: #f59e0b; background: #fffbeb; }
  .brief-section.tone-success { border-left-color: #22c55e; background: #f0fdf4; }
  .brief-section-head { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 0.6rem; }
  .brief-index { font-size: 0.72rem; font-weight: 800; color: #94a3b8; font-variant-numeric: tabular-nums; }
  .brief-section h2 { font-size: 1.05rem; margin: 0; }
  .brief-hint { font-size: 0.72rem; color: #666; margin: 0.1rem 0 0; }
  .brief-body p { margin: 0.45rem 0; }
  .brief-body ul { margin: 0.5rem 0 0.5rem 1.2rem; padding: 0; }
  .brief-body li { margin: 0.25rem 0; }
  strong { font-weight: 700; }
  .footer { margin-top: 2rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.7rem; color: #999; text-align: center; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="brief-header">
    <div class="brief-eyebrow">${briefingLabel.toUpperCase()} EXECUTIVE BRIEFING</div>
    <h1>BD ${briefingLabel} 브리핑</h1>
    <div class="brief-meta">${formattedDate} · BD Team</div>
  </div>
  ${analyticsHtml}
  ${sectionHtml}
  <div class="footer">자동 생성 · Sales Master AI Briefing Engine</div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 300));</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const sections = useMemo(() => (report ? parseReportSections(report) : []), [report]);
  const isActive = state === "loading" || state === "streaming";
  const summary = analytics ?? EMPTY_ANALYTICS;
  const hasAnalytics = Boolean(analytics);
  const hasReport = report.length > 0;

  // ── 비교: 이전 같은 타입 브리핑의 analytics와 비교 ──
  const previousAnalytics = useMemo<AnalyticsSummary | null>(() => {
    if (!hasAnalytics) return null;
    // 가장 최근 다른 엔트리 (현재 보여지는 것 외) 중 같은 briefingType
    const candidates = history.filter(
      (h) => h.type === briefingType && h.analytics && h.generatedAt !== generatedAt,
    );
    return candidates[0]?.analytics ?? null;
  }, [history, briefingType, generatedAt, hasAnalytics]);

  const deltas = useMemo(() => {
    if (!previousAnalytics || !analytics) return null;
    return {
      overallProgress: analytics.overallProgress - previousAnalytics.overallProgress,
      winRate: analytics.winRate - previousAnalytics.winRate,
      pipelineHealthRatio: analytics.pipelineHealthRatio - previousAnalytics.pipelineHealthRatio,
      forecastVsTarget: analytics.forecastVsTarget - previousAnalytics.forecastVsTarget,
      pipelineValue: analytics.pipelineValue - previousAnalytics.pipelineValue,
      anomalyCount: analytics.anomalyCount - previousAnalytics.anomalyCount,
      criticalCount: analytics.criticalCount - previousAnalytics.criticalCount,
    };
  }, [analytics, previousAnalytics]);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Executive Briefing</span>
          <h1 className={styles.title}>AI 전략 리포트</h1>
          <p className={styles.subtitle}>
            라이브 분석 데이터에서 자동 생성되는 BD 브리핑 — 핵심 요약, 리스크, 액션, 다음 단계.
          </p>
          <div className={styles.heroTags}>
            <span>실시간 분석</span>
            <span>리스크 우선</span>
            <span>다운로드 가능</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.dlBtn}
            onClick={() => setShowHistory((v) => !v)}
            disabled={isActive}
            title="이전 브리핑 기록"
          >
            <History size={14} /> 기록 ({history.length})
          </button>
          {(state === "done" || state === "streaming") && hasReport ? (
            <>
              <button className={styles.dlBtn} onClick={handlePrint} disabled={isActive}>
                <FileText size={14} /> PDF
              </button>
              <button className={styles.dlBtn} onClick={handleDownload} disabled={isActive}>
                <Download size={14} /> 다운로드
              </button>
            </>
          ) : null}
          <button className={styles.generateBtn} onClick={generateReport} disabled={isActive}>
            {isActive ? (
              <>
                <Loader2 size={14} className={styles.spin} /> 생성 중
              </>
            ) : state === "done" ? (
              <>
                <RefreshCw size={14} /> 재생성
              </>
            ) : (
              <>
                <Brain size={14} /> 브리핑 생성
              </>
            )}
          </button>
        </div>
      </header>

      {/* Briefing type selector */}
      <div className={styles.briefingTypeStrip}>
        <span className={styles.briefingTypeLabel}>브리핑 타입</span>
        {BRIEFING_TYPES.map((bt) => (
          <button
            key={bt.id}
            type="button"
            className={`${styles.briefingTypeChip} ${briefingType === bt.id ? styles.briefingTypeChipActive : ""}`}
            onClick={() => setBriefingType(bt.id)}
            disabled={isActive}
          >
            {bt.icon}
            <span className={styles.briefingTypeName}>{bt.label}</span>
            <span className={styles.briefingTypeHorizon}>{bt.horizon}</span>
          </button>
        ))}
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <History size={14} />
            <span>이전 브리핑 ({history.length}/{HISTORY_LIMIT})</span>
          </div>
          <div className={styles.historyList}>
            {history.map((entry) => {
              const typeMeta = BRIEFING_TYPES.find((b) => b.id === entry.type);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.historyItem}
                  onClick={() => loadFromHistory(entry)}
                >
                  <div className={styles.historyItemTop}>
                    <span className={styles.historyItemType}>{typeMeta?.label ?? entry.type}</span>
                    <span className={styles.historyItemTime}>{relativeTime(entry.generatedAt)}</span>
                  </div>
                  <div className={styles.historyItemPreview}>
                    {entry.report.replace(/##.*/g, "").trim().slice(0, 80)}...
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.topGrid}>
        <Card className={styles.eyebrowCard} title="Briefing frame">
          <div className={styles.frameGrid}>
            <div>
              <div className={styles.frameLabel}>Status</div>
              <div className={styles.frameValue}>
                {state === "idle" ? "Ready to generate" : state === "loading" ? "Fetching live data" : state === "streaming" ? "Streaming report" : state === "done" ? "Briefing complete" : "Generation failed"}
              </div>
            </div>
            <div>
              <div className={styles.frameLabel}>Generated at</div>
              <div className={styles.frameValue}>{formatDateTime(generatedAt) || "Not yet generated"}</div>
            </div>
            <div>
              <div className={styles.frameLabel}>Lens</div>
              <div className={styles.frameValue}>Revenue, forecast, risk, execution</div>
            </div>
            <div>
              <div className={styles.frameLabel}>Source</div>
              <div className={styles.frameValue}>Live analytics route</div>
            </div>
          </div>
        </Card>

        <Card className={styles.playbookCard} title="How to read">
          <ol className={styles.playbookList}>
            <li>Generate the briefing from the live analytics stream.</li>
            <li>Scan the summary cards for the current operating picture.</li>
            <li>Check the risk watchlist before sharing with stakeholders.</li>
            <li>Download the text brief once the report is complete.</li>
          </ol>
        </Card>
      </div>

      {previousAnalytics && (
        <div className={styles.compareBanner}>
          <Activity size={13} />
          <span>
            이전 <strong>{BRIEFING_TYPES.find((b) => b.id === briefingType)?.label}</strong> 브리핑 대비 변화 표시
          </span>
        </div>
      )}

      <div className={styles.analyticsGrid}>
        <MetricCard
          label="달성률"
          value={`${summary.overallProgress}%`}
          sub={`${formatRevenue(summary.totalRevenue)} / ${formatRevenue(summary.totalTarget)}`}
          color={summary.overallProgress >= 90 ? "#4ade80" : summary.overallProgress >= 70 ? "#fbbf24" : "#ef4444"}
          icon={summary.overallProgress >= 90 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          delta={deltas?.overallProgress}
        />
        <MetricCard
          label="승률"
          value={`${summary.winRate}%`}
          sub="확정 딜 / 전체 리드"
          color="#818cf8"
          icon={<Activity size={16} />}
          delta={deltas?.winRate}
        />
        <MetricCard
          label="파이프라인 건전성"
          value={`${summary.pipelineHealthRatio}%`}
          sub={`${formatRevenue(summary.pipelineValue)} 가중치`}
          color={summary.pipelineHealthRatio >= 100 ? "#4ade80" : summary.pipelineHealthRatio >= 70 ? "#fbbf24" : "#ef4444"}
          icon={<Target size={16} />}
          delta={deltas?.pipelineHealthRatio}
        />
        <MetricCard
          label="예측 vs 목표"
          value={`${summary.forecastVsTarget}%`}
          sub={`${formatRevenue(summary.q1Forecast)} 예측`}
          color={summary.forecastVsTarget >= 100 ? "#4ade80" : summary.forecastVsTarget >= 80 ? "#fbbf24" : "#ef4444"}
          icon={<Zap size={16} />}
          delta={deltas?.forecastVsTarget}
        />
      </div>

      {hasAnalytics && summary.anomalies.length > 0 ? (
        <Card className={styles.riskCard} title="Risk Watchlist">
          <div className={styles.riskHeader}>
            <AlertTriangle size={14} />
            <span>
              {summary.criticalCount} critical and {summary.anomalyCount - summary.criticalCount} warning signals are active.
            </span>
          </div>
          <div className={styles.riskList}>
            {summary.anomalies.map((anomaly, index) => (
              <div
                key={`${anomaly.type}-${index}`}
                className={`${styles.riskItem} ${anomaly.severity === "critical" ? styles.riskCritical : styles.riskWarning}`}
              >
                <span className={styles.riskEntity}>{anomaly.entity}</span>
                <span className={styles.riskMessage}>{anomaly.message}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className={styles.contentGrid}>
        <Card
          className={styles.reportDeck}
          title="Briefing Deck"
          action={
            <div className={styles.deckAction}>
              <span className={styles.deckPill}>{state}</span>
              <span className={styles.deckPillMuted}>{sections.length} sections</span>
            </div>
          }
        >
          {state === "idle" ? (
            <div className={styles.emptyState}>
              <Brain size={42} className={styles.emptyIcon} />
              <h2>Generate an executive BD briefing</h2>
              <p>
                The report will stream in four sections: summary, risk, action plan, and next steps.
                It is designed to read like a concise leadership brief rather than a raw transcript.
              </p>
            </div>
          ) : null}

          {state === "loading" ? (
            <div className={styles.loadingPanel}>
              <Loader2 size={30} className={styles.spinner} />
              <div>
                <h3>Preparing live briefing</h3>
                <p>Reading the current analytics flow and composing the executive report.</p>
              </div>
            </div>
          ) : null}

          {state === "error" ? (
            <div className={styles.errorPanel}>
              <AlertTriangle size={20} />
              <div>
                <h3>Report generation failed</h3>
                <p>Check the Gemini key or analytics stream, then try generating the briefing again.</p>
              </div>
            </div>
          ) : null}

          {(state === "streaming" || state === "done") && hasReport ? (
            sections.length > 0 ? (
              <div className={styles.sectionStack}>
                {sections.map((section, index) => {
                  const meta = getSectionMeta(index);
                  const Icon = meta.icon;

                  return (
                    <section key={`${section.key}-${index}`} className={`${styles.sectionCard} ${styles[`tone${meta.tone.charAt(0).toUpperCase()}${meta.tone.slice(1)}`]}`}>
                      <div className={styles.sectionHead}>
                        <div className={styles.sectionIcon}>
                          <Icon size={15} />
                        </div>
                        <div>
                          <div className={styles.sectionIndex}>0{index + 1}</div>
                          <h3>{meta.labelKo}</h3>
                          <p>{meta.hint}</p>
                        </div>
                      </div>

                      <div className={styles.sectionBody}>
                        {section.lines.map((line, lineIndex) => {
                          const trimmed = line.trim();
                          if (!trimmed) {
                            return null;
                          }

                          const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
                          const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
                          const content = bulletMatch?.[1] ?? numberedMatch?.[1] ?? trimmed;

                          return (
                            <div key={`${section.key}-${lineIndex}`} className={styles.sectionLine}>
                              {(bulletMatch || numberedMatch) ? <span className={styles.sectionBullet}>•</span> : null}
                              <p>{renderInlineText(content)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className={styles.rawOutput}>
                {report}
                {state === "streaming" ? <span className={styles.cursor} /> : null}
              </div>
            )
          ) : null}

          {state === "streaming" && !hasReport ? (
            <div className={styles.loadingPanel}>
              <Loader2 size={30} className={styles.spinner} />
              <div>
                <h3>Streaming report text</h3>
                <p>The output is building section by section.</p>
              </div>
            </div>
          ) : null}
        </Card>

        <div className={styles.sideRail}>
          <Card className={styles.railCard} title="Execution Snapshot">
            <div className={styles.snapshotGrid}>
              <div className={styles.snapshotItem}>
                <span>Pipeline value</span>
                <strong>{formatRevenue(summary.pipelineValue)}</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>Forecast gap</span>
                <strong>{summary.forecastVsTarget}%</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>Risk count</span>
                <strong>{summary.anomalyCount}</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>Critical</span>
                <strong>{summary.criticalCount}</strong>
              </div>
            </div>
          </Card>

          <Card className={styles.railCard} title="Briefing Rules">
            <ul className={styles.ruleList}>
              <li>Lead with the revenue and forecast cards before reading the full transcript.</li>
              <li>Escalate any critical anomalies before sharing the report externally.</li>
              <li>Use the download button only after the report reaches `done`.</li>
              <li>Keep the brief to one page of executive notes whenever possible.</li>
            </ul>
          </Card>

          <div className={styles.guruTipCard} style={{ borderLeftColor: dailyTip.color }}>
            <span className={styles.guruTipCardLabel}>Mentor's Edge</span>
            <span className={styles.guruTipCardDot} style={{ background: dailyTip.color }} />
            <p className={styles.guruTipCardText}>{dailyTip.text}</p>
            <span className={styles.guruTipCardSource} style={{ color: dailyTip.color }}>
              — {dailyTip.guru}
            </span>
          </div>

          <Card className={styles.railCard} title="Flow">
            <div className={styles.flow}>
              <div className={styles.flowStep}>
                <span>1</span>
                <div>
                  <strong>Generate</strong>
                  <p>Pull live analytics into a streaming report.</p>
                </div>
              </div>
              <div className={styles.flowStep}>
                <span>2</span>
                <div>
                  <strong>Review</strong>
                  <p>Scan risks, actions, and next steps.</p>
                </div>
              </div>
              <div className={styles.flowStep}>
                <span>3</span>
                <div>
                  <strong>Share</strong>
                  <p>Download or reuse the briefing in leadership syncs.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
  icon,
  delta,
  deltaUnit = "%p",
  deltaInverted = false,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  delta?: number | null;
  deltaUnit?: string;
  deltaInverted?: boolean; // 작은 값이 좋음 (anomalyCount 등)
}) {
  let deltaNode: React.ReactNode = null;
  if (delta !== undefined && delta !== null && Math.abs(delta) >= 0.1) {
    const isUp = delta > 0;
    const isPositiveImpact = deltaInverted ? !isUp : isUp;
    const arrow = isUp ? "▲" : "▼";
    const deltaColor = isPositiveImpact ? "#22c55e" : "#ef4444";
    const formatted = `${arrow} ${Math.abs(delta).toFixed(1)}${deltaUnit}`;
    deltaNode = (
      <span className={styles.metricDelta} style={{ color: deltaColor }}>
        {formatted}
      </span>
    );
  }

  return (
    <Card className={styles.metricCard}>
      <div className={styles.metricTop}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricIcon} style={{ color }}>
          {icon}
        </span>
      </div>
      <div className={styles.metricValue} style={{ color }}>
        {value}
      </div>
      <div className={styles.metricSubRow}>
        <span className={styles.metricSub}>{sub}</span>
        {deltaNode}
      </div>
    </Card>
  );
}
