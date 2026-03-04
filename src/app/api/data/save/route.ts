import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface RegionRow {
  name: string;
  revenue: number;
  target: number;
  deals_active: number;
  deals_closed: number;
}

function rowsToCSV(rows: RegionRow[]): string {
  const header = 'name,revenue,target,deals_active,deals_closed';
  const lines = rows.map(r =>
    `${r.name},${r.revenue},${r.target},${r.deals_active},${r.deals_closed}`
  );
  return [header, ...lines].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json() as { rows: RegionRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: '데이터가 비어 있습니다.' }, { status: 400 });
    }

    // 유효성 검사
    for (const row of rows) {
      if (!row.name?.trim()) {
        return NextResponse.json({ error: '지역명이 비어 있는 행이 있습니다.' }, { status: 400 });
      }
      if (isNaN(Number(row.revenue)) || isNaN(Number(row.target))) {
        return NextResponse.json({ error: `${row.name}: 매출/목표는 숫자여야 합니다.` }, { status: 400 });
      }
    }

    const csvContent = rowsToCSV(rows);
    const filePath = path.join(process.cwd(), 'data', 'regions.csv');

    // 백업
    const backupPath = path.join(process.cwd(), 'data', `regions.backup.${Date.now()}.csv`);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `${rows.length}개 지역 데이터가 저장되었습니다.`,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/data/save]', err);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
