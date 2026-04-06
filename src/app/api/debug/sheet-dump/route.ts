import { NextResponse } from 'next/server';
import { getMultipleSheetValues } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const ranges = await getMultipleSheetValues([
      '1. DSH!A1:Z10',
      '3. REV!A1:Z5',
      '3. REV!A3:Z20',
    ]);
    return NextResponse.json({ success: true, ranges });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
