"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import SalesTip from "@/components/SalesTip";
import {
  FileText, Download, TrendingUp, Users,
  Target, AlertTriangle, Sparkles, Loader2,
  CheckCircle, XCircle, Clock, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StatCard { label: string; value: string; trend: string; trendType: string }
interface RegionRow {
  name: string; revenue: number; target: number;
  progress: number; velocity: number;
  deals_active: number; deals_closed: number; status: string;
}
interface IndividualRow {
  name: string; wonRevenue: number; pipelineRevenue: number;
  target: number; progress: number; deals_total: number; deals_won: number;
}
interface ScoreRow {
  name: string; score: number; label: string;
  won: number; pipeline: number; deals: number;
}

// ────────────────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const [stats, setStats]           = useState<StatCard[]>([]);
  const [regional, setRegional]     = useState<RegionRow[]>([]);
  const [individuals, setIndividuals] = useState<IndividualRow[]>([]);
  const [scores, setScores]         = useState<ScoreRow[]>([]);
  const [aiReport, setAiReport]     = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(r => r.json()),
      fetch("/api/dashboard/regions").then(r => r.json()),
      fetch("/api/crm/leads").then(r => r.json()),
    ]).then(([s, reg, crm]) => {
      setStats(s || []);
      setRegional(reg.regional || []);
      setIndividuals(reg.individuals || []);
      setScores(crm.scores || []);
    }).finally(() => setLoading(false));
  }, []);

  const generateAiReport = async () => {
    setGenerating(true);
    setAiReport("");
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, regional, individuals, scores }),
      });
      const d = await res.json();
      setAiReport(d.report || "리포트 생성 실패");
    } catch {
      setAiReport("오류 발생. 잠시 후 다시 시도해주세요.");
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = () => {
    setExporting(true);
    const rows: string[] = [
      "=== 지역별 성과 ===",
      "지역,매출(M),목표(M),달성률(%),딜(활성),딜(클로즈),상태",
      ...regional.map(r =>
        `${r.name},${r.revenue},${r.target},${r.progress},${r.deals_active},${r.deals_closed},${r.status}`
      ),
      "",
      "=== 개인별 성과 ===",
      "담당자,계약매출(M),파이프라인(M),목표(M),달성률(%),총딜,클로즈딜",
      ...individuals.map(i =>
        `${i.name},${i.wonRevenue},${i.pipelineRevenue},${i.target},${i.progress},${i.deals_total},${i.deals_won}`
      ),
      "",
      "=== Focus Score ===",
      "담당자,Score,등급,계약(M),파이프(M),딜수",
      ...scores.map(s =>
        `${s.name},${s.score},${s.label},${s.won},${s.pipeline},${s.deals}`
      ),
    ];
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salesmaster_Q1_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 800);
  };

  return (
    <div className={styles.container}>
      <SalesTip />

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Q1 2026 성과 요약 · AI 전략 리포트 · CSV 내보내기</p>
        </div>
        <button className={styles.exportBtn} onClick={exportCSV} disabled={exporting || loading}>
          <Download size={14} />
          {exporting ? "내보내는 중..." : "CSV 내보내기"}
        </button>
      </div>

      {/* ── KPI Summary ── */}
      <div className={styles.kpiGrid}>
        {loading
          ? [0, 1, 2, 3].map(i => <div key={i} className={styles.kpiSkeleton} />)
          : stats.map((s, i) => <KpiCard key={i} stat={s} />)
        }
      </div>

      {/* ── Regional Performance ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Target size={15} /> 지역별 성과
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {["지역", "매출", "목표", "달성률", "전환율", "상태"].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [0, 1, 2, 3].map(i => (
                  <tr key={i}><td colSpan={6} className={styles.td}><div className={styles.rowSkeleton} /></td></tr>
                ))
                : regional.map((r, i) => (
                  <tr key={i} className={styles.tr}>
                    <td className={`${styles.td} ${styles.tdBold}`}>{r.name}</td>
                    <td className={styles.td}>₩{r.revenue.toLocaleString()}M</td>
                    <td className={styles.td}>₩{r.target.toLocaleString()}M</td>
                    <td className={styles.td}>
                      <ProgressCell pct={r.progress} />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.velNum}>{r.velocity}%</span>
                    </td>
                    <td className={styles.td}>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Individual Performance ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Users size={15} /> 개인별 성과
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {["담당자", "계약 매출", "파이프라인", "달성률", "딜 수", "Focus"].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [0, 1, 2].map(i => (
                  <tr key={i}><td colSpan={6} className={styles.td}><div className={styles.rowSkeleton} /></td></tr>
                ))
                : individuals.map((ind, i) => {
                  const matchScore = scores.find(s => s.name === ind.name);
                  return (
                    <tr key={i} className={styles.tr}>
                      <td className={`${styles.td} ${styles.tdBold}`}>{ind.name}</td>
                      <td className={styles.td}>₩{ind.wonRevenue.toLocaleString()}M</td>
                      <td className={styles.td}>₩{ind.pipelineRevenue.toLocaleString()}M</td>
                      <td className={styles.td}>
                        <ProgressCell pct={ind.progress} />
                      </td>
                      <td className={styles.td}>{ind.deals_total}건</td>
                      <td className={styles.td}>
                        {matchScore
                          ? <ScoreChip score={matchScore.score} label={matchScore.label} />
                          : <span className={styles.dimText}>-</span>
                        }
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </section>

      {/* ── AI Report ── */}
      <section className={styles.section}>
        <div className={styles.aiHeader}>
          <h2 className={styles.sectionTitle}>
            <Sparkles size={15} /> AI 전략 리포트
          </h2>
          <button
            className={styles.generateBtn}
            onClick={generateAiReport}
            disabled={generating || loading}
          >
            {generating
              ? <><Loader2 size={13} className={styles.spin} /> 생성 중...</>
              : <><Sparkles size={13} /> AI 리포트 생성</>
            }
          </button>
        </div>

        {aiReport ? (
          <AiReportOutput text={aiReport} />
        ) : (
          <div className={styles.aiPlaceholder}>
            <Sparkles size={28} className={styles.placeholderIcon} />
            <p className={styles.placeholderText}>
              &ldquo;AI 리포트 생성&rdquo; 클릭 시 현재 Q1 데이터를 분석해<br />
              경영진 보고용 전략 인사이트를 자동으로 작성합니다.
            </p>
            <ChevronDown size={16} className={styles.placeholderArrow} />
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ stat }: { stat: StatCard }) {
  const iconMap: Record<string, React.ReactNode> = {
    "Total Revenue":    <TrendingUp size={17} />,
    "Active Deals":     <FileText size={17} />,
    "Close Rate":       <Target size={17} />,
    "Critical Regions": <AlertTriangle size={17} />,
  };
  const colorMap: Record<string, string> = {
    up:       "#4ade80",
    down:     "#f59e0b",
    critical: "#ef4444",
  };
  const color = colorMap[stat.trendType] ?? "#6366f1";

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ color, background: color + "1a" }}>
        {iconMap[stat.label] ?? <FileText size={17} />}
      </div>
      <div className={styles.kpiLabel}>{stat.label}</div>
      <div className={styles.kpiValue} style={{ color }}>{stat.value}</div>
      <div className={styles.kpiSub}>{stat.trend}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    good:     { label: "정상",  color: "#4ade80", bg: "rgba(74,222,128,0.1)",   icon: <CheckCircle size={11} /> },
    warning:  { label: "주의",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: <Clock size={11} /> },
    critical: { label: "위험",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: <XCircle size={11} /> },
  };
  const s = map[status] ?? map.warning;
  return (
    <span className={styles.statusBadge} style={{ color: s.color, background: s.bg }}>
      {s.icon} {s.label}
    </span>
  );
}

function ProgressCell({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#4ade80" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className={styles.pctCell}>
      <div className={styles.pctBar}>
        <div
          className={styles.pctFill}
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <span style={{ color, fontWeight: 700, fontSize: "0.78rem", minWidth: "2.5rem" }}>
        {pct}%
      </span>
    </div>
  );
}

function ScoreChip({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#4ade80" : score >= 55 ? "#6366f1" : "#ef4444";
  return (
    <span
      className={styles.scoreChip}
      style={{ color, borderColor: color + "44" }}
    >
      {score} <span className={styles.scoreLabel}>{label}</span>
    </span>
  );
}

function AiReportOutput({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className={styles.aiOutput}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className={styles.aiH3}>
              {line.slice(3)}
            </h3>
          );
        }
        if (line.match(/^[-•]\s/)) {
          return <p key={i} className={styles.aiBullet}>• {line.slice(2)}</p>;
        }
        if (line.match(/^\d+\.\s/)) {
          return <p key={i} className={styles.aiNumbered}>{line}</p>;
        }
        if (line.trim() === "") {
          return <div key={i} className={styles.aiSpacer} />;
        }
        return <p key={i} className={styles.aiText}>{line}</p>;
      })}
    </div>
  );
}
