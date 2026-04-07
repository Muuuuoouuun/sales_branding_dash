import { NextResponse } from 'next/server';
import { getMultipleSheetValues } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const ranges = await getMultipleSheetValues([
      '1. DSH!A1:Z10',
      '2. SEG!A1:S10',   // SEG header + first rows
      '2. SEG!A1:S40',   // SEG full range
      '3. REV!A1:Z5',
      '3. REV!A3:Z20',
      '4. KPI!A1:AZ2',
      '4. KPI!A3:AZ8',
    ]);

    // Annotate SEG columns with index
    const segRows = ranges['2. SEG!A1:S40'] ?? [];
    const segAnnotated = segRows.map((row: string[], rowIdx: number) =>
      ({ _row: rowIdx, ...Object.fromEntries(row.map((val, i) => [`col${i}`, val])) })
    );

    // Annotate KPI columns with index
    const kpiHeader = ranges['4. KPI!A1:AZ2'] ?? [];
    const kpiRows = ranges['4. KPI!A3:AZ8'] ?? [];
    const kpiAnnotated = kpiRows.map((row: string[]) =>
      Object.fromEntries(row.map((val, i) => [`col${i}`, val]))
    );

    // REV: annotate first few data rows with column indices
    const revDataRows = ranges['3. REV!A3:Z20'] ?? [];
    const revAnnotated = revDataRows.slice(0, 5).map((row: string[], rowIdx: number) =>
      ({ _row: rowIdx + 3, ...Object.fromEntries(row.map((val, i) => [`col${i}`, val])) })
    );

    return NextResponse.json({
      success: true,
      segDebug: {
        note: 'col11=goalLocation, col12=goalRevenue, col16=statusLocation, col17=statusRevenue',
        rows: segAnnotated,
      },
      revDebug: {
        note: 'col12=amount, col6=firstPayment, col8=location — monthly cols detected from header',
        rows: revAnnotated,
      },
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
