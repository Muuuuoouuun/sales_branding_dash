import { NextResponse } from 'next/server';
import { updateLead } from '@/lib/server/salesData';

const VALID_STAGES = ['Lead', 'Proposal', 'Negotiation', 'Contract'];

export async function PATCH(req: Request) {
  try {
    const { leadId, stage } = await req.json();

    if (!leadId || !stage) {
      return NextResponse.json({ error: 'Missing leadId or stage' }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const result = await updateLead(Number(leadId), { stage });
    return NextResponse.json({ success: true, backend: result.backend });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
