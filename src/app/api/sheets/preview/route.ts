import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/server/googleSheets';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') ?? '1. DSH';
  const range = searchParams.get('range') ?? `${tab}!A1:Z50`;

  try {
    const rows = await getSheetData(range);
    return NextResponse.json({ success: true, tab, rowCount: rows.length, rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to preview sheet data.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
