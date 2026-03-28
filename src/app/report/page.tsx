"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Download,
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

interface ReportSection {
  key: string;
  lines: string[];
}

const SECTION_BRIEFS = [
  {
    label: "Executive Summary",
    hint: "What changed, what matters now.",
    icon: Activity,
    tone: "primary",
  },
  {
    label: "Risk Analysis",
    hint: "What could slip next.",
    icon: ShieldAlert,
    tone: "danger",
  },
  {
    label: "Action Plan",
    hint: "What the team should do next.",
    icon: Target,
    tone: "warning",
  },
  {
    label: "Immediate Next Steps",
    hint: "Who owns the follow-through.",
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

function formatRevenue(value: number): string {
  return `${Math.round(value).toLocaleString()}M`;
}

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

export default function ReportPage() {
  const [state, setState] = useState<ReportState>("idle");
  const [report, setReport] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          setReport((prev) => prev + decoder.decode(value, { stream: true }));
        }
      }

      setGeneratedAt(new Date().toISOString());
      setState("done");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setState("error");
    }
  }, []);

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = useMemo(() => (report ? parseReportSections(report) : []), [report]);
  const isActive = state === "loading" || state === "streaming";
  const summary = analytics ?? EMPTY_ANALYTICS;
  const hasAnalytics = Boolean(analytics);
  const hasReport = report.length > 0;

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Executive Briefing</span>
          <h1 className={styles.title}>AI Strategy Reports</h1>
          <p className={styles.subtitle}>
            Streaming BD briefing built from live analytics, with a clean executive summary and an operator-ready action plan.
          </p>
          <div className={styles.heroTags}>
            <span>Live analytics stream</span>
            <span>Risk-first framing</span>
            <span>Downloadable output</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {(state === "done" || state === "streaming") && hasReport ? (
            <button className={styles.dlBtn} onClick={handleDownload} disabled={isActive}>
              <Download size={14} /> Download
            </button>
          ) : null}
          <button className={styles.generateBtn} onClick={generateReport} disabled={isActive}>
            {isActive ? (
              <>
                <Loader2 size={14} className={styles.spin} /> Building
              </>
            ) : state === "done" ? (
              <>
                <RefreshCw size={14} /> Regenerate
              </>
            ) : (
              <>
                <Brain size={14} /> Generate Briefing
              </>
            )}
          </button>
        </div>
      </header>

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

      <div className={styles.analyticsGrid}>
        <MetricCard
          label="Overall Progress"
          value={`${summary.overallProgress}%`}
          sub={`${formatRevenue(summary.totalRevenue)} / ${formatRevenue(summary.totalTarget)}`}
          color={summary.overallProgress >= 90 ? "#4ade80" : summary.overallProgress >= 70 ? "#fbbf24" : "#ef4444"}
          icon={summary.overallProgress >= 90 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <MetricCard
          label="Win Rate"
          value={`${summary.winRate}%`}
          sub="Closed deals vs total leads"
          color="#818cf8"
          icon={<Activity size={16} />}
        />
        <MetricCard
          label="Pipeline Health"
          value={`${summary.pipelineHealthRatio}%`}
          sub={`${formatRevenue(summary.pipelineValue)} weighted value`}
          color={summary.pipelineHealthRatio >= 100 ? "#4ade80" : summary.pipelineHealthRatio >= 70 ? "#fbbf24" : "#ef4444"}
          icon={<Target size={16} />}
        />
        <MetricCard
          label="Forecast vs Target"
          value={`${summary.forecastVsTarget}%`}
          sub={`${formatRevenue(summary.q1Forecast)} forecast`}
          color={summary.forecastVsTarget >= 100 ? "#4ade80" : summary.forecastVsTarget >= 80 ? "#fbbf24" : "#ef4444"}
          icon={<Zap size={16} />}
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
                          <h3>{meta.label}</h3>
                          <p>{section.key}</p>
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
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
}) {
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
      <div className={styles.metricSub}>{sub}</div>
    </Card>
  );
}
