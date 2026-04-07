import { NextResponse } from 'next/server';
import { updateLead } from '@/lib/server/salesData';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { notes } = await req.json();
    const result = await updateLead(id, { notes: notes ? String(notes) : null });
    return NextResponse.json({ success: true, savedAt: new Date().toISOString(), backend: result.backend });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
