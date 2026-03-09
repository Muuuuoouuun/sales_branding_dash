import { NextResponse } from 'next/server';
import { loadCSV } from '@/lib/csvLoader';
import { loadJSON } from '@/lib/jsonLoader';

interface LeadRow {
  id: string;
  company: string;
  owner: string;
}

interface ActivityRaw {
  id: string;
  lead_id: number;
  type: string;
  date: string;
  title: string;
  description: string;
  rep: string;
  outcome?: string;
  next_step?: string;
  duration_min?: number;
}

export async function GET() {
  const leads = loadCSV<LeadRow>('leads.csv');
  const companyMap = new Map(leads.map(l => [Number(l.id), l.company]));

  const allActivities = loadJSON<ActivityRaw[]>('activities.json') ?? [];

  const recent = allActivities
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map(a => ({
      ...a,
      lead_id: Number(a.lead_id),
      company: companyMap.get(Number(a.lead_id)) ?? '—',
    }));

  return NextResponse.json({ activities: recent });
}
