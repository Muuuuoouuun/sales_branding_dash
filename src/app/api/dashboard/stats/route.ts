import { NextResponse } from 'next/server';
import { listRegionalMetrics } from '@/lib/server/salesData';

interface RegionRow {
  name: string;
  revenue: number;
  target: number;
  deals_active: number;
  deals_closed: number;
}

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
  const { rows } = await listRegionalMetrics();
  const data = rows.length > 0 ? rows : FALLBACK_DATA;

  const totalRevenue  = data.reduce((s, r) => s + Number(r.revenue), 0);
  const totalTarget   = data.reduce((s, r) => s + Number(r.target), 0);
  const totalDeals    = data.reduce((s, r) => s + Number(r.deals_active), 0);
  const totalClosed   = data.reduce((s, r) => s + Number(r.deals_closed), 0);

  const revenueRate   = ((totalRevenue / totalTarget) * 100).toFixed(1);
  const closeRate     = ((totalClosed  / totalDeals)  * 100).toFixed(1);
  const criticalCount = data.filter(r => (Number(r.revenue) / Number(r.target)) < 0.7).length;

  const stats = [
    {
      label: 'Total Revenue',
      value: `₩${(totalRevenue / 1000).toFixed(1)}B`,
      trend: `목표 대비 ${revenueRate}%`,
      trendType: Number(revenueRate) >= 90 ? 'up' : Number(revenueRate) >= 70 ? 'down' : 'critical',
      trendLabel: 'vs Target',
    },
    {
      label: 'Active Deals',
      value: String(totalDeals),
      trend: `${totalClosed}건 클로즈`,
      trendType: 'up',
      trendLabel: 'Closed',
    },
    {
      label: 'Close Rate',
      value: `${closeRate}%`,
      trend: Number(closeRate) >= 60 ? 'High Momentum' : 'Needs Attention',
      trendType: Number(closeRate) >= 60 ? 'up' : 'down',
      trendLabel: 'Close Rate',
    },
    {
      label: 'Critical Regions',
      value: String(criticalCount),
      trend: criticalCount > 0 ? `${criticalCount}개 지역 70% 미만` : 'All On Track',
      trendType: criticalCount > 2 ? 'critical' : criticalCount > 0 ? 'down' : 'up',
      trendLabel: 'Critical',
    },
  ];

  return NextResponse.json(stats);
}
