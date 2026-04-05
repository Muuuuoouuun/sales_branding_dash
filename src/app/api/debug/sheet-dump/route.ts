import { NextResponse } from 'next/server';
import { getMultipleSheetValues } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const ranges = await getMultipleSheetValues([
      '3. REV!A1:Z5',
      '3. REV!A3:Z15',
      '4. KPI!A1:AZ5',
      '4. KPI!A3:AZ10',
      '2. SEG!A1:T5',
      '2. SEG!A4:T15',
    ]);
    return NextResponse.json({ success: true, ranges });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
