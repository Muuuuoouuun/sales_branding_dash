import { NextResponse } from 'next/server';
import { listLeads } from '@/lib/server/salesData';

const STAGE_ORDER = ['Lead', 'Proposal', 'Negotiation', 'Contract'];

function getActionText(stage: string, prob: number): string {
  if (stage === 'Negotiation' && prob >= 70) return '할인 조건 최종 확인 후 계약서 초안 발송. 클로징 미팅 일정 확정.';
  if (stage === 'Negotiation') return '기술적 이의 해결 후 Economic Buyer 재접근. ROI 자료 보강.';
  if (stage === 'Proposal' && prob >= 65) return 'Proposal 후속 Q&A 대응. 구매 기준 확인 후 차별화 포인트 강조.';
  if (stage === 'Proposal') return '관심도 재확인. 경쟁사 비교 자료 제공 및 챔피언 육성.';
  return '리드 재활성화. 신규 인사이트 콘텐츠 공유 후 니즈 발굴 미팅 요청.';
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

export async function GET() {
  const { rows: raw } = await listLeads();

  const leads = raw.map(l => ({
    id: Number(l.id),
    company: l.company,
    contact: l.contact,
    region: l.region,
    stage: l.stage,
    probability: Number(l.probability),
    revenue_potential: Number(l.revenue_potential),
    owner: l.owner,
    last_contact: l.last_contact,
    due_date: l.due_date,
    due_label: formatDue(l.due_date),
    action: getActionText(l.stage, Number(l.probability)),
  })).sort((a, b) =>
    STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) ||
    b.probability - a.probability,
  );

  // ── Focus scores per owner ─────────────────────────────────────────────────
  const ownerMap = new Map<string, { won: number; pipe: number; total: number }>();
  for (const l of leads) {
    const e = ownerMap.get(l.owner) ?? { won: 0, pipe: 0, total: 0 };
    e.total++;
    if (l.stage === 'Contract') e.won += l.revenue_potential;
    else e.pipe += (l.revenue_potential * l.probability) / 100;
    ownerMap.set(l.owner, e);
  }

  const maxWon = Math.max(...Array.from(ownerMap.values()).map(e => e.won), 1);
  const scores = Array.from(ownerMap.entries())
    .map(([name, e]) => {
      const score = Math.min(
        Math.round((e.won / maxWon) * 60 + (e.pipe / 5000) * 20 + (e.total >= 3 ? 20 : 10)),
        100,
      );
      return {
        name,
        score,
        label: score >= 80 ? 'Top 10%' : score >= 55 ? 'Top 30%' : 'Bottom 20%',
        won: e.won,
        pipeline: Math.round(e.pipe),
        deals: e.total,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ── Kill-list: top-priority open deals ────────────────────────────────────
  const actions = leads
    .filter(l => l.stage !== 'Contract' && l.probability >= 40)
    .slice(0, 6)
    .map(l => ({
      salesRep: l.owner,
      target: l.company,
      prob: `${l.probability}%`,
      action: l.action,
      due: l.due_label,
      region: l.region,
      stage: l.stage,
    }));

  return NextResponse.json({ scores, actions, leads });
}
