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
  const { language } = require("@/components/SettingsProvider").useSettings();
  const [state, setState] = useState<ReportState>("idle");
  const [report, setReport] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dailyTip = getContextualTip("report");

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
          <span className={styles.eyebrow}>{language === "ko" ? "임원 브리핑" : "Executive Briefing"}</span>
          <h1 className={styles.title}>{language === "ko" ? "AI 전략 리포트" : "AI Strategy Reports"}</h1>
          <p className={styles.subtitle}>
            {language === "ko" ? "라이브 분석 데이터를 기반으로 스트리밍되는 BD 브리핑으로, 간결한 요약과 실행 액션 플랜을 제공합니다." : "Streaming BD briefing built from live analytics, with a clean executive summary and an operator-ready action plan."}
          </p>
          <div className={styles.heroTags}>
            <span>{language === "ko" ? "라이브 분석 스트림" : "Live analytics stream"}</span>
            <span>{language === "ko" ? "리스크 우선 구조" : "Risk-first framing"}</span>
            <span>{language === "ko" ? "다운로드 가능" : "Downloadable output"}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {(state === "done" || state === "streaming") && hasReport ? (
            <button className={styles.dlBtn} onClick={handleDownload} disabled={isActive}>
              <Download size={14} /> {language === "ko" ? "다운로드" : "Download"}
            </button>
          ) : null}
          <button className={styles.generateBtn} onClick={generateReport} disabled={isActive}>
            {isActive ? (
              <>
                <Loader2 size={14} className={styles.spin} /> {language === "ko" ? "생성 중" : "Building"}
              </>
            ) : state === "done" ? (
              <>
                <RefreshCw size={14} /> {language === "ko" ? "재생성" : "Regenerate"}
              </>
            ) : (
              <>
                <Brain size={14} /> {language === "ko" ? "브리핑 생성" : "Generate Briefing"}
              </>
            )}
          </button>
        </div>
      </header>

      <div className={styles.topGrid}>
        <Card className={styles.eyebrowCard} title={language === "ko" ? "브리핑 구성" : "Briefing frame"}>
          <div className={styles.frameGrid}>
            <div>
              <div className={styles.frameLabel}>{language === "ko" ? "상태" : "Status"}</div>
              <div className={styles.frameValue}>
                {state === "idle" ? (language === "ko" ? "생성 준비 완료" : "Ready to generate") : state === "loading" ? (language === "ko" ? "라이브 데이터 가져오는 중" : "Fetching live data") : state === "streaming" ? (language === "ko" ? "리포트 스트리밍 중" : "Streaming report") : state === "done" ? (language === "ko" ? "브리핑 완료" : "Briefing complete") : (language === "ko" ? "생성 실패" : "Generation failed")}
              </div>
            </div>
            <div>
              <div className={styles.frameLabel}>{language === "ko" ? "생성 시각" : "Generated at"}</div>
              <div className={styles.frameValue}>{formatDateTime(generatedAt) || (language === "ko" ? "아직 생성되지 않음" : "Not yet generated")}</div>
            </div>
            <div>
              <div className={styles.frameLabel}>{language === "ko" ? "분석 관점" : "Lens"}</div>
              <div className={styles.frameValue}>{language === "ko" ? "매출, 예측, 리스크, 실행" : "Revenue, forecast, risk, execution"}</div>
            </div>
            <div>
              <div className={styles.frameLabel}>{language === "ko" ? "데이터 소스" : "Source"}</div>
              <div className={styles.frameValue}>{language === "ko" ? "라이브 분석 라우트" : "Live analytics route"}</div>
            </div>
          </div>
        </Card>

        <Card className={styles.playbookCard} title={language === "ko" ? "읽는 방법" : "How to read"}>
          <ol className={styles.playbookList}>
            <li>{language === "ko" ? "라이브 분석 스트림에서 브리핑을 생성합니다." : "Generate the briefing from the live analytics stream."}</li>
            <li>{language === "ko" ? "요약 카드를 훑어 현재 운영 상황을 파악합니다." : "Scan the summary cards for the current operating picture."}</li>
            <li>{language === "ko" ? "이해관계자와 공유하기 전에 리스크 감시 목록을 확인합니다." : "Check the risk watchlist before sharing with stakeholders."}</li>
            <li>{language === "ko" ? "리포트가 완료되면 텍스트 브리핑을 다운로드합니다." : "Download the text brief once the report is complete."}</li>
          </ol>
        </Card>
      </div>

      <div className={styles.analyticsGrid}>
        <MetricCard
          label={language === "ko" ? "전체 진행률" : "Overall Progress"}
          value={`${summary.overallProgress}%`}
          sub={`${formatRevenue(summary.totalRevenue)} / ${formatRevenue(summary.totalTarget)}`}
          color={summary.overallProgress >= 90 ? "#4ade80" : summary.overallProgress >= 70 ? "#fbbf24" : "#ef4444"}
          icon={summary.overallProgress >= 90 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        />
        <MetricCard
          label={language === "ko" ? "승률" : "Win Rate"}
          value={`${summary.winRate}%`}
          sub={language === "ko" ? "종료된 딜 vs 전체 리드" : "Closed deals vs total leads"}
          color="#818cf8"
          icon={<Activity size={16} />}
        />
        <MetricCard
          label={language === "ko" ? "파이프라인 건강도" : "Pipeline Health"}
          value={`${summary.pipelineHealthRatio}%`}
          sub={`${formatRevenue(summary.pipelineValue)} ${language === "ko" ? "가중 금액" : "weighted value"}`}
          color={summary.pipelineHealthRatio >= 100 ? "#4ade80" : summary.pipelineHealthRatio >= 70 ? "#fbbf24" : "#ef4444"}
          icon={<Target size={16} />}
        />
        <MetricCard
          label={language === "ko" ? "예측 대비 목표" : "Forecast vs Target"}
          value={`${summary.forecastVsTarget}%`}
          sub={`${formatRevenue(summary.q1Forecast)} ${language === "ko" ? "예측" : "forecast"}`}
          color={summary.forecastVsTarget >= 100 ? "#4ade80" : summary.forecastVsTarget >= 80 ? "#fbbf24" : "#ef4444"}
          icon={<Zap size={16} />}
        />
      </div>

      {hasAnalytics && summary.anomalies.length > 0 ? (
        <Card className={styles.riskCard} title={language === "ko" ? "리스크 감시 목록" : "Risk Watchlist"}>
          <div className={styles.riskHeader}>
            <AlertTriangle size={14} />
            <span>
              {language === "ko" ? `${summary.criticalCount}개 위험 신호와 ${summary.anomalyCount - summary.criticalCount}개 경고 신호가 활성화되어 있습니다.` : `${summary.criticalCount} critical and ${summary.anomalyCount - summary.criticalCount} warning signals are active.`}
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
          title={language === "ko" ? "브리핑 덱" : "Briefing Deck"}
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
              <h2>{language === "ko" ? "임원용 BD 브리핑 생성" : "Generate an executive BD briefing"}</h2>
              <p>
                {language === "ko" ? "리포트는 요약, 리스크, 액션 플랜, 다음 단계 4개 섹션으로 스트리밍됩니다. 방대한 원시 기록이 아닌 간결한 리더십 브리핑 형식으로 설계되었습니다." : "The report will stream in four sections: summary, risk, action plan, and next steps. It is designed to read like a concise leadership brief rather than a raw transcript."}
              </p>
            </div>
          ) : null}

          {state === "loading" ? (
            <div className={styles.loadingPanel}>
              <Loader2 size={30} className={styles.spinner} />
              <div>
                <h3>{language === "ko" ? "라이브 브리핑 준비 중" : "Preparing live briefing"}</h3>
                <p>{language === "ko" ? "현재 분석 흐름을 읽고 임원용 리포트를 작성하고 있습니다." : "Reading the current analytics flow and composing the executive report."}</p>
              </div>
            </div>
          ) : null}

          {state === "error" ? (
            <div className={styles.errorPanel}>
              <AlertTriangle size={20} />
              <div>
                <h3>{language === "ko" ? "리포트 생성 실패" : "Report generation failed"}</h3>
                <p>{language === "ko" ? "Gemini 키 또는 분석 스트림을 확인하고 다시 시도하세요." : "Check the Gemini key or analytics stream, then try generating the briefing again."}</p>
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
                <h3>{language === "ko" ? "리포트 텍스트 스트리밍 중" : "Streaming report text"}</h3>
                <p>{language === "ko" ? "섹션별로 출력이 생성되고 있습니다." : "The output is building section by section."}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <div className={styles.sideRail}>
          <Card className={styles.railCard} title={language === "ko" ? "실행 스냅샷" : "Execution Snapshot"}>
            <div className={styles.snapshotGrid}>
              <div className={styles.snapshotItem}>
                <span>{language === "ko" ? "파이프라인 가치" : "Pipeline value"}</span>
                <strong>{formatRevenue(summary.pipelineValue)}</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>{language === "ko" ? "예측 격차" : "Forecast gap"}</span>
                <strong>{summary.forecastVsTarget}%</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>{language === "ko" ? "리스크 수" : "Risk count"}</span>
                <strong>{summary.anomalyCount}</strong>
              </div>
              <div className={styles.snapshotItem}>
                <span>{language === "ko" ? "위험 신호" : "Critical"}</span>
                <strong>{summary.criticalCount}</strong>
              </div>
            </div>
          </Card>

          <Card className={styles.railCard} title={language === "ko" ? "브리핑 규칙" : "Briefing Rules"}>
            <ul className={styles.ruleList}>
              <li>{language === "ko" ? "전체 내용을 읽기 전에 매출과 예측 카드를 먼저 확인하세요." : "Lead with the revenue and forecast cards before reading the full transcript."}</li>
              <li>{language === "ko" ? "외부에 공유하기 전에 위험 신호를 먼저 에스컬레이션하세요." : "Escalate any critical anomalies before sharing the report externally."}</li>
              <li>{language === "ko" ? "리포트가 '완료' 상태가 된 후에만 다운로드 버튼을 사용하세요." : "Use the download button only after the report reaches `done`."}</li>
              <li>{language === "ko" ? "가능하면 브리핑을 한 페이지 분량의 임원 메모로 유지하세요." : "Keep the brief to one page of executive notes whenever possible."}</li>
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

          <Card className={styles.railCard} title={language === "ko" ? "진행 흐름" : "Flow"}>
            <div className={styles.flow}>
              <div className={styles.flowStep}>
                <span>1</span>
                <div>
                  <strong>{language === "ko" ? "생성" : "Generate"}</strong>
                  <p>{language === "ko" ? "라이브 분석 데이터를 스트리밍 리포트로 가져옵니다." : "Pull live analytics into a streaming report."}</p>
                </div>
              </div>
              <div className={styles.flowStep}>
                <span>2</span>
                <div>
                  <strong>{language === "ko" ? "검토" : "Review"}</strong>
                  <p>{language === "ko" ? "리스크, 액션, 다음 단계를 훑어봅니다." : "Scan risks, actions, and next steps."}</p>
                </div>
              </div>
              <div className={styles.flowStep}>
                <span>3</span>
                <div>
                  <strong>{language === "ko" ? "공유" : "Share"}</strong>
                  <p>{language === "ko" ? "리더십 싱크에서 브리핑을 다운로드하거나 재활용합니다." : "Download or reuse the briefing in leadership syncs."}</p>
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
