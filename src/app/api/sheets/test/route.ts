import { NextResponse } from 'next/server';
import { getSheetNames, getSheetData } from '@/lib/server/googleSheets';

/**
 * GET /api/sheets/test
 * 구글 시트 연동 테스트 — 시트 탭 목록 + 첫 번째 시트의 상위 5행을 반환
 */
export async function GET() {
  try {
    // 1. 시트(탭) 목록 가져오기
    const sheetNames = await getSheetNames();

    // 2. 첫 번째 시트의 데이터 미리보기 (상위 5행)
    const firstSheet = sheetNames[0] ?? '시트1';
    const preview = await getSheetData(`${firstSheet}!A1:Z5`);

    return NextResponse.json({
      success: true,
      sheetNames,
      preview: {
        sheetName: firstSheet,
        rows: preview,
      },
    });
  } catch (err: unknown) {
    console.error('Google Sheets test failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to test Google Sheets connection.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
