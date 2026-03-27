import 'server-only';
import { listRegionalMetrics, listLeads } from './salesData';

// ── Exported Types ─────────────────────────────────────────────────────────────

export interface RegionAnalytics {
  name: string;
  revenue: number;
  target: number;
  progress: number;
  gap: number;
  velocity: number;
  dealEfficiency: number;
  urgencyScore: number;
  status: 'good' | 'warning' | 'critical';
  performanceIndex: number;
}

export interface LeadAnalytics {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  expectedValue: number;
  daysSinceContact: number;
  daysUntilDue: number;
  urgencyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface OwnerStat {
  name: string;
  totalLeads: number;
  wonDeals: number;
  winRate: number;
  wonRevenue: number;
  pipelineRevenue: number;
  productivityScore: number;
}

export interface StageConversion {
  stage: string;
  count: number;
  dropRate: number | null;
  isBottleneck: boolean;
  avgProbability: number;
}

export interface Anomaly {
  type: 'underperformance' | 'stale_deal' | 'velocity_drop' | 'pipeline_risk' | 'overperformance';
  severity: 'warning' | 'critical';
  entity: string;
  message: string;
}

export interface TeamAnalytics {
  totalRevenue: number;
  totalTarget: number;
  overallProgress: number;
  winRate: number;
  avgDealSize: number;
  pipelineValue: number;
  pipelineHealthRatio: number;
  bottleneckStage: string;
  bottleneckDropRate: number;
  topRegion: string;
  criticalRegions: string[];
  ownerStats: OwnerStat[];
  stageConversions: StageConversion[];
  q1Forecast: number;
  forecastVsTarget: number;
  anomalies: Anomaly[];
  regionAnalytics: RegionAnalytics[];
  leadAnalytics: LeadAnalytics[];
  computedAt: string;
}

// ── Internal Helpers ────────────────────────────────────────────────────────────

function daysBetween(dateStr: string, reference: Date): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.round((reference.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

interface RawLead {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
}

function scoreLeadUrgency(lead: RawLead, now: Date): number {
  const daysSince = daysBetween(lead.last_contact, now);
  const daysUntil = -daysBetween(lead.due_date, now); // positive = future

  let score = 0;

  // Probability contribution (max 30)
  score += lead.probability * 0.3;

  // Expected value contribution (max 20, per 1000M)
  const ev = (lead.probability / 100) * lead.revenue_potential;
  score += Math.min(ev / 200, 20);

  // Staleness penalty
  if (daysSince > 14) score += 25;
  else if (daysSince > 7) score += 15;
  else if (daysSince > 3) score += 5;

  // Due date urgency
  if (daysUntil < 0) score += 30;       // overdue
  else if (daysUntil <= 3) score += 20;
  else if (daysUntil <= 7) score += 12;
  else if (daysUntil <= 14) score += 5;

  // Stage weight (Negotiation = highest loss risk)
  if (lead.stage === 'Negotiation') score += 15;
  else if (lead.stage === 'Proposal') score += 5;

  return Math.min(Math.round(score), 100);
}

// ── Main Export ─────────────────────────────────────────────────────────────────

export async function computeTeamAnalytics(): Promise<TeamAnalytics> {
  const [{ rows: regions }, { rows: leads }] = await Promise.all([
    listRegionalMetrics(),
    listLeads(),
  ]);

  const now = new Date();

  // ── Region Analytics ──────────────────────────────────────────────────────────
  const regionAnalytics: RegionAnalytics[] = regions.map(r => {
    const progress      = r.target > 0 ? Math.round((r.revenue / r.target) * 100) : 0;
    const gap           = r.target - r.revenue;
    const velocity      = r.deals_active > 0
      ? Math.round((r.deals_closed / r.deals_active) * 100)
      : 0;
    const dealEfficiency = r.deals_closed > 0
      ? Math.round(r.revenue / r.deals_closed)
      : 0;

    const status: RegionAnalytics['status'] =
      progress >= 90 ? 'good' :
      progress >= 70 ? 'warning' : 'critical';

    const performanceIndex = Math.round(progress * 0.6 + velocity * 0.4);

    // urgencyScore: 0-100, higher = needs more attention
    let urgencyScore = Math.round((1 - Math.min(progress, 100) / 100) * 50);
    if (velocity < 50) urgencyScore += 25;
    if (progress < 50) urgencyScore += 25;
    urgencyScore = Math.min(urgencyScore, 100);

    return { name: r.name, revenue: r.revenue, target: r.target, progress, gap, velocity, dealEfficiency, urgencyScore, status, performanceIndex };
  });

  // ── Lead Analytics ────────────────────────────────────────────────────────────
  const leadAnalytics: LeadAnalytics[] = leads.map(lead => {
    const daysSinceContact = daysBetween(lead.last_contact, now);
    const daysUntilDue     = -daysBetween(lead.due_date, now);
    const expectedValue    = Math.round((lead.probability / 100) * lead.revenue_potential);
    const urgencyScore     = scoreLeadUrgency(lead, now);

    const riskLevel: LeadAnalytics['riskLevel'] =
      urgencyScore >= 75 ? 'critical' :
      urgencyScore >= 55 ? 'high' :
      urgencyScore >= 35 ? 'medium' : 'low';

    return {
      id: lead.id,
      company: lead.company,
      contact: lead.contact,
      region: lead.region,
      stage: lead.stage,
      probability: lead.probability,
      revenue_potential: lead.revenue_potential,
      owner: lead.owner,
      expectedValue,
      daysSinceContact,
      daysUntilDue,
      urgencyScore,
      riskLevel,
    };
  }).sort((a, b) => b.urgencyScore - a.urgencyScore);

  // ── Team KPIs ─────────────────────────────────────────────────────────────────
  const totalRevenue = regions.reduce((s, r) => s + r.revenue, 0);
  const totalTarget  = regions.reduce((s, r) => s + r.target, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0;

  const wonLeads = leads.filter(l => l.stage === 'Contract');
  const winRate  = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const avgDealSize = wonLeads.length > 0
    ? Math.round(wonLeads.reduce((s, l) => s + l.revenue_potential, 0) / wonLeads.length)
    : 0;

  const pipelineValue = leads
    .filter(l => l.stage !== 'Contract')
    .reduce((s, l) => s + Math.round((l.probability / 100) * l.revenue_potential), 0);

  const remaining = Math.max(totalTarget - totalRevenue, 1);
  const pipelineHealthRatio = Math.round((pipelineValue / remaining) * 100);

  // Q1 forecast: won revenue + 70% of pipeline (conservative factor)
  const q1Forecast     = Math.round(totalRevenue + pipelineValue * 0.7);
  const forecastVsTarget = totalTarget > 0 ? Math.round((q1Forecast / totalTarget) * 100) : 0;

  // ── Stage Conversions ─────────────────────────────────────────────────────────
  const STAGES = ['Lead', 'Proposal', 'Negotiation', 'Contract'];
  const stageCounts = STAGES.map(s => leads.filter(l => l.stage === s).length);

  const stageConversions: StageConversion[] = STAGES.map((stage, i) => {
    const count       = stageCounts[i];
    const prevCount   = i > 0 ? stageCounts[i - 1] : null;
    const dropRate    = prevCount && prevCount > 0
      ? Math.round((1 - count / prevCount) * 100)
      : null;
    const stageLeads  = leads.filter(l => l.stage === stage);
    const avgProbability = stageLeads.length > 0
      ? Math.round(stageLeads.reduce((s, l) => s + l.probability, 0) / stageLeads.length)
      : 0;
    return { stage, count, dropRate, isBottleneck: dropRate !== null && dropRate >= 40, avgProbability };
  });

  const bottleneck      = stageConversions.find(s => s.isBottleneck);
  const bottleneckStage = bottleneck?.stage ?? 'Negotiation';
  const bottleneckDropRate = bottleneck?.dropRate ?? 0;

  // ── Owner Stats ───────────────────────────────────────────────────────────────
  const ownerMap: Record<string, { won: number; total: number; wonRev: number; pipeRev: number }> = {};
  leads.forEach(l => {
    const o = l.owner?.trim();
    if (!o) return;
    if (!ownerMap[o]) ownerMap[o] = { won: 0, total: 0, wonRev: 0, pipeRev: 0 };
    ownerMap[o].total++;
    if (l.stage === 'Contract') {
      ownerMap[o].won++;
      ownerMap[o].wonRev += l.revenue_potential;
    } else {
      ownerMap[o].pipeRev += Math.round((l.probability / 100) * l.revenue_potential);
    }
  });

  const ownerStats: OwnerStat[] = Object.entries(ownerMap).map(([name, d]) => {
    const wr = d.total > 0 ? Math.round((d.won / d.total) * 100) : 0;
    const productivityScore = Math.min(
      Math.round(wr * 0.5 + (d.wonRev / 1000) * 0.3 + (d.pipeRev / 500) * 0.2),
      100,
    );
    return {
      name,
      totalLeads: d.total,
      wonDeals: d.won,
      winRate: wr,
      wonRevenue: d.wonRev,
      pipelineRevenue: d.pipeRev,
      productivityScore,
    };
  }).sort((a, b) => b.productivityScore - a.productivityScore);

  // ── Anomaly Detection ─────────────────────────────────────────────────────────
  const anomalies: Anomaly[] = [];

  // Region anomalies
  regionAnalytics.forEach(r => {
    if (r.progress < 50 && r.velocity < 40) {
      anomalies.push({
        type: 'underperformance', severity: 'critical', entity: r.name,
        message: `${r.name} 지역: 달성률 ${r.progress}% + 전환율 ${r.velocity}% — 즉각 개입 필요`,
      });
    } else if (r.progress < 70 && r.urgencyScore >= 55) {
      anomalies.push({
        type: 'underperformance', severity: 'warning', entity: r.name,
        message: `${r.name} 지역: 달성률 ${r.progress}%, 목표 대비 ₩${r.gap.toLocaleString()}M 부족`,
      });
    }
    if (r.revenue > r.target * 1.1) {
      anomalies.push({
        type: 'overperformance', severity: 'warning', entity: r.name,
        message: `${r.name} 지역: 목표 초과달성 ${r.progress}% — 다음 분기 목표 상향 검토`,
      });
    }
  });

  // Stale Negotiation deals
  leadAnalytics
    .filter(l => l.stage === 'Negotiation' && l.daysSinceContact > 7)
    .forEach(l => {
      anomalies.push({
        type: 'stale_deal',
        severity: l.daysSinceContact > 14 ? 'critical' : 'warning',
        entity: l.company,
        message: `${l.company}(${l.owner}): 협상 단계 ${l.daysSinceContact}일째 연락 없음 — 딜 소실 위험`,
      });
    });

  // Owner velocity drop
  ownerStats
    .filter(o => o.winRate < 30 && o.totalLeads >= 3)
    .forEach(o => {
      anomalies.push({
        type: 'velocity_drop', severity: 'warning', entity: o.name,
        message: `${o.name}: 승률 ${o.winRate}% (팀 평균 ${winRate}% 이하) — 코칭 개입 권장`,
      });
    });

  // Pipeline health risk
  if (pipelineHealthRatio < 80) {
    anomalies.push({
      type: 'pipeline_risk',
      severity: pipelineHealthRatio < 50 ? 'critical' : 'warning',
      entity: 'Pipeline',
      message: `파이프라인 건강도 ${pipelineHealthRatio}% — 잔여 목표 ₩${remaining.toLocaleString()}M 달성에 리드 부족`,
    });
  }

  const topRegion       = [...regionAnalytics].sort((a, b) => b.progress - a.progress)[0]?.name ?? '';
  const criticalRegions = regionAnalytics.filter(r => r.status === 'critical').map(r => r.name);

  return {
    totalRevenue, totalTarget, overallProgress,
    winRate, avgDealSize,
    pipelineValue, pipelineHealthRatio,
    bottleneckStage, bottleneckDropRate,
    topRegion, criticalRegions,
    ownerStats, stageConversions,
    q1Forecast, forecastVsTarget,
    anomalies, regionAnalytics, leadAnalytics,
    computedAt: now.toISOString(),
  };
}
