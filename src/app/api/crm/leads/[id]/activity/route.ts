import { NextRequest, NextResponse } from 'next/server';
import { appendActivity } from '@/lib/fileWriter';

const ALLOWED_TYPES = ['call', 'email', 'meeting', 'demo', 'proposal', 'note'];
const ALLOWED_OUTCOMES = ['positive', 'neutral', 'negative'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const leadId = Number(idStr);
  if (isNaN(leadId)) return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // 필수 필드 검증
  if (!body.type || !ALLOWED_TYPES.includes(String(body.type)))
    return NextResponse.json({ error: '활동 유형이 올바르지 않습니다.' }, { status: 400 });
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)))
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' }, { status: 400 });
  if (!body.title || !String(body.title).trim())
    return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });
  if (!body.rep || !String(body.rep).trim())
    return NextResponse.json({ error: '담당자는 필수입니다.' }, { status: 400 });

  const activity: Record<string, unknown> = {
    lead_id:      leadId,
    type:         String(body.type),
    date:         String(body.date),
    title:        String(body.title).trim(),
    description:  String(body.description ?? '').trim(),
    rep:          String(body.rep).trim(),
  };

  if (body.outcome && ALLOWED_OUTCOMES.includes(String(body.outcome)))
    activity.outcome = String(body.outcome);
  if (body.next_step && String(body.next_step).trim())
    activity.next_step = String(body.next_step).trim();
  if (body.duration_min && !isNaN(Number(body.duration_min)))
    activity.duration_min = Number(body.duration_min);

  const result = appendActivity(activity);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ success: true, id: result.id });
}
