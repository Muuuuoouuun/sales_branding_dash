import { NextResponse } from 'next/server';
import { getMultipleSheetValues } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const ranges = await getMultipleSheetValues([
      '1. DSH!A1:Z10',
      '3. REV!A1:Z5',
      '3. REV!A3:Z20',
      // KPI sheet: first 2 rows (headers) + first 5 data rows, full width
      '4. KPI!A1:AZ2',
      '4. KPI!A3:AZ8',
    ]);

    // Annotate KPI columns with index for easier inspection
    const kpiHeader = ranges['4. KPI!A1:AZ2'] ?? [];
    const kpiRows = ranges['4. KPI!A3:AZ8'] ?? [];
    const kpiAnnotated = kpiRows.map((row: string[]) =>
      Object.fromEntries(row.map((val, i) => [`col${i}`, val]))
    );

    return NextResponse.json({
      success: true,
      ranges,
      kpiDebug: {
        headerRow0: kpiHeader[0] ?? [],
        headerRow1: kpiHeader[1] ?? [],
        dataRowsAnnotated: kpiAnnotated,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
