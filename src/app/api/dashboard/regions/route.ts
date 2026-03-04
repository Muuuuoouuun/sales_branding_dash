import { NextResponse } from 'next/server';
import { loadCSV } from '@/lib/csvLoader';

interface RegionRow {
  name: string;
  revenue: number;
  target: number;
  deals_active: number;
  deals_closed: number;
}

interface LeadRow {
  id: string;
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

// 지역별 SVG 좌표 (viewBox 0 0 340 445 기준)
const REGION_COORDINATES: Record<string, [number, number]> = {
  '서울':  [170,  88],
  '인천':  [128, 100],
  '경기':  [192, 118],
  '강원':  [262,  86],
  '대전':  [168, 184],
  '충청':  [136, 200],
  '광주':  [130, 282],
  '전라':  [116, 308],
  '대구':  [238, 228],
  '경북':  [258, 178],
  '경남':  [230, 292],
  '부산':  [268, 312],
  '울산':  [280, 272],
};

const FALLBACK_DATA: RegionRow[] = [
  { name: '서울', revenue: 4200, target: 4000, deals_active: 80, deals_closed: 72 },
  { name: '부산', revenue: 2100, target: 3000, deals_active: 55, deals_closed: 32 },
  { name: '인천', revenue: 1800, target: 2000, deals_active: 42, deals_closed: 35 },
  { name: '대구', revenue: 1200, target: 2500, deals_active: 38, deals_closed: 16 },
  { name: '광주', revenue: 900,  target: 1200, deals_active: 28, deals_closed: 18 },
  { name: '대전', revenue: 1100, target: 1000, deals_active: 32, deals_closed: 28 },
  { name: '울산', revenue: 1500, target: 1400, deals_active: 36, deals_closed: 33 },
  { name: '경기', revenue: 3200, target: 3500, deals_active: 90, deals_closed: 75 },
];

export async function GET() {
  const rows = loadCSV<RegionRow>('regions.csv');
  const source = rows.length > 0 ? rows : FALLBACK_DATA;

  const regional = source.map(row => {
    const revenue      = Number(row.revenue);
    const target       = Number(row.target);
    const deals_active = Number(row.deals_active);
    const deals_closed = Number(row.deals_closed);

    const progress = Math.round((revenue / target) * 100);
    const velocity = deals_active > 0
      ? Math.round((deals_closed / deals_active) * 100)
      : 0;
    const status: 'good' | 'warning' | 'critical' =
      progress >= 90 ? 'good' :
      progress >= 70 ? 'warning' : 'critical';

    return {
      name: row.name,
      revenue,
      target,
      progress,
      velocity,
      deals_active,
      deals_closed,
      coordinates: REGION_COORDINATES[row.name] ?? [200, 200] as [number, number],
      status,
    };
  });

  const bottleneckData = [
    { stage: 'Lead',        value: 100, fullMark: 150 },
    { stage: 'Proposal',    value:  90, fullMark: 150 },
    { stage: 'Negotiation', value:  40, fullMark: 150 },
    { stage: 'Contract',    value:  35, fullMark: 150 },
  ];

  // ── Individual (per-owner) stats from leads.csv ──────────────────────────
  const leads = loadCSV<LeadRow>('leads.csv');
  const teamTarget = regional.reduce((s, r) => s + r.target, 0);

  interface OwnerAcc {
    name: string;
    wonRevenue: number;
    pipelineRevenue: number;
    deals_total: number;
    deals_won: number;
  }
  const ownerMap: Record<string, OwnerAcc> = {};

  leads.forEach(lead => {
    const owner = lead.owner?.trim();
    if (!owner) return;
    if (!ownerMap[owner]) {
      ownerMap[owner] = { name: owner, wonRevenue: 0, pipelineRevenue: 0, deals_total: 0, deals_won: 0 };
    }
    ownerMap[owner].deals_total++;
    const revPotential = Number(lead.revenue_potential) || 0;
    const prob         = Number(lead.probability)       || 0;
    if (lead.stage === 'Contract') {
      ownerMap[owner].wonRevenue += revPotential;
      ownerMap[owner].deals_won++;
    } else {
      ownerMap[owner].pipelineRevenue += Math.round(revPotential * (prob / 100));
    }
  });

  const owners = Object.values(ownerMap);
  const perPersonTarget = owners.length > 0
    ? Math.round(teamTarget / owners.length)
    : 10_000;

  const individuals = owners.map(o => ({
    name:             o.name,
    wonRevenue:       o.wonRevenue,
    pipelineRevenue:  o.pipelineRevenue,
    target:           perPersonTarget,
    progress:         Math.round((o.wonRevenue / perPersonTarget) * 100),
    deals_total:      o.deals_total,
    deals_won:        o.deals_won,
  })).sort((a, b) => b.wonRevenue - a.wonRevenue);

  return NextResponse.json({ regional, bottleneck: bottleneckData, individuals });
}
