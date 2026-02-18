"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import Card from "@/components/Card";
import KoreaMap from "@/components/KoreaMap";
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Brain, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// Interfaces
interface Stat {
  label: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down' | 'critical';
  trendLabel: string;
}

interface RegionalData {
  name: string;
  revenue: number;
  target: number;
  velocity: number;
  coordinates: [number, number];
  status: "good" | "warning" | "critical";
}

interface BottleneckData {
  stage: string;
  value: number;
  fullMark: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [bottleneckData, setBottleneckData] = useState<BottleneckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, regionsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/regions')
        ]);

        const statsData = await statsRes.json();
        const regionsData = await regionsRes.json();

        setStats(statsData);
        setRegionalData(regionsData.regional);
        setBottleneckData(regionsData.bottleneck);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionalData, bottleneckData })
      });
      const data = await res.json();
      setAiInsight(data.insight);
    } catch (error) {
      console.error("Failed to generate insight:", error);
      setAiInsight("Failed to generate insight. Please try again.");
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Intelligence</h1>
          <p className={styles.subtitle}>Real-time Sales Velocity & Regional Performance</p>
        </div>
        <div className={`glass ${styles.dateBadge}`}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <Card key={idx} className={styles.statCard}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={`${styles.statTrend} ${stat.trendType === 'up' ? styles.trendUp : ''} ${stat.trendType === 'down' ? styles.trendDown : ''} ${stat.trendType === 'critical' ? styles.trendCritical : ''}`}>
              {stat.trendType === 'up' && <TrendingUp size={16} />}
              {stat.trendType === 'down' && <TrendingDown size={16} />}
              {stat.trendType === 'critical' && <AlertTriangle size={16} />}
              {stat.trend}
            </span>
          </Card>
        ))}
      </div>

      {/* Main Grid: Regional & Bottlenecks */}
      <div className={styles.mainGrid} style={{ gridTemplateColumns: '1fr 1fr 0.8fr' }}>
        <Card title="Revenue vs Target" action={<button className={styles.viewReportBtn}>View Report</button>}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#333' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="target" fill="#27272a" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.insightText}>
            <strong>Insight:</strong> Busan and Daegu are showing high variance against targets (-30%). Immediate intervention required in Daegu.
          </div>
        </Card>

        <Card title="Bottleneck Radar">
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={bottleneckData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="stage" stroke="#888" />
                <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#333" />
                <Radar
                  name="Deal Flow"
                  dataKey="value"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.bottleneckList}>
            <div className={styles.bottleneckItem}>
              <span className={styles.bottleneckStage}>Negotiation</span>
              <span className={styles.bottleneckMetric}>55% Drop-off</span>
            </div>
            <p className={styles.bottleneckAction}>
              <strong>Action:</strong> Review discount approval process. Speed is the kill factor here.
            </p>
          </div>
        </Card>

        <Card title="Regional Performance (Map)" className="min-h-[400px]">
          <KoreaMap data={regionalData} />
          <div className={styles.insightText}>
            <strong>Insight:</strong> Mouse-over regions to view real-time velocity.
          </div>
        </Card>
      </div>

      {/* AI Box */}
      <Card className={styles.alertCard} title="AI Predictive Alert (Gemini Insight)">
        <div className={styles.aiBoxContent}>
          <div className={styles.aiIconBox}>
            <Brain size={24} className={styles.aiIcon} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex justify-between items-start">
              <h4 className={styles.aiTitle}>Strategic AI Insight</h4>
              <button
                onClick={handleGenerateInsight}
                disabled={insightLoading}
                className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded transition-colors disabled:opacity-50"
              >
                {insightLoading ? <Loader2 className="animate-spin" size={14} /> : "Generate Strategy"}
              </button>
            </div>

            {aiInsight ? (
              <div className="mt-2 p-3 bg-black/20 rounded border border-white/5 animate-fade-in">
                <p className={styles.aiText} style={{ whiteSpace: 'pre-line' }}>{aiInsight}</p>
              </div>
            ) : (
              <p className={styles.aiText}>
                Based on activity logs, <strong className={styles.highlightText}>Team Alpha</strong> is projected to miss Q1 targets by 15% if 'Proposal' volume does not increase by 20% this week.
                <br /><span className="text-xs text-gray-500 mt-2 block">(Click 'Generate Strategy' for real-time Gemini analysis)</span>
              </p>
            )}

            <p className={styles.actionLink}>
              → View Recommended Scripts & Action Plan
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
