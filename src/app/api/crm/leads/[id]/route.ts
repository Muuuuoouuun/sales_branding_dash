import { NextResponse } from 'next/server';
import { loadCSV } from '@/lib/csvLoader';
import { loadJSON } from '@/lib/jsonLoader';

interface LeadRow {
  id: string;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: string;
  revenue_potential: string;
  owner: string;
  last_contact: string;
  due_date: string;
  source?: string;
  competitor?: string;
  budget_confirmed?: string;
  champion?: string;
  stage_entered?: string;
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

function formatDue(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return `${Math.abs(diff)}일 초과`;
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  return `${diff}일 후`;
}

function getActionText(stage: string, prob: number): string {
  if (stage === 'Negotiation' && prob >= 70) return '할인 조건 최종 확인 후 계약서 초안 발송. 클로징 미팅 일정 확정.';
  if (stage === 'Negotiation') return '기술적 이의 해결 후 Economic Buyer 재접근. ROI 자료 보강.';
  if (stage === 'Proposal' && prob >= 65) return 'Proposal 후속 Q&A 대응. 구매 기준 확인 후 차별화 포인트 강조.';
  if (stage === 'Proposal') return '관심도 재확인. 경쟁사 비교 자료 제공 및 챔피언 육성.';
  return '리드 재활성화. 신규 인사이트 콘텐츠 공유 후 니즈 발굴 미팅 요청.';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const rows = loadCSV<LeadRow>('leads.csv');
  const raw = rows.find(r => Number(r.id) === id);
  if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allActivities = loadJSON<ActivityRaw[]>('activities.json') ?? [];
  const activities = allActivities
    .filter(a => Number(a.lead_id) === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Derived metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stageDate = new Date(raw.stage_entered ?? raw.last_contact);
  stageDate.setHours(0, 0, 0, 0);
  const dealAge = Math.max(0, Math.floor((today.getTime() - stageDate.getTime()) / 86_400_000));

  const callCount     = activities.filter(a => a.type === 'call').length;
  const meetingCount  = activities.filter(a => a.type === 'meeting').length;
  const demoCount     = activities.filter(a => a.type === 'demo').length;
  const positiveCount = activities.filter(a => a.outcome === 'positive').length;
  const budgetBonus   = raw.budget_confirmed === 'true' ? 15 : 0;
  const engagementScore = Math.min(
    Math.round(
      callCount * 8 +
      meetingCount * 15 +
      demoCount * 20 +
      positiveCount * 12 +
      Number(raw.probability) * 0.25 +
      budgetBonus,
    ),
    100,
  );

  const lead = {
    id,
    company:          raw.company,
    contact:          raw.contact,
    region:           raw.region,
    stage:            raw.stage,
    probability:      Number(raw.probability),
    revenue_potential: Number(raw.revenue_potential),
    owner:            raw.owner,
    last_contact:     raw.last_contact,
    due_date:         raw.due_date,
    due_label:        formatDue(raw.due_date),
    action:           getActionText(raw.stage, Number(raw.probability)),
    source:           raw.source ?? 'Unknown',
    competitor:       raw.competitor ?? '—',
    budget_confirmed: raw.budget_confirmed === 'true',
    champion:         raw.champion ?? '—',
    stage_entered:    raw.stage_entered ?? raw.last_contact,
    dealAge,
    engagementScore,
  };

  return NextResponse.json({ lead, activities });
}
