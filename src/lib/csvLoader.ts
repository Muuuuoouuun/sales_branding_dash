import fs from 'fs';
import path from 'path';

type Row = Record<string, string | number>;

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function toNumber(val: string): string | number {
  if (val === '' || val == null) return val;
  const num = Number(val);
  return isNaN(num) ? val : num;
}

/**
 * CSV 파일을 읽어 배열로 반환합니다.
 * 파일 경로: /data/{filename}
 */
export function loadCSV<T>(filename: string): T[] {
  const filePath = path.join(process.cwd(), 'data', filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[csvLoader] 파일을 찾을 수 없습니다: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Row = {};
    headers.forEach((h, i) => {
      row[h] = toNumber(values[i] ?? '');
    });
    return row as T;
  });
}

/**
 * Excel(.xlsx) 파일을 읽어 배열로 반환합니다.
 * Excel 지원을 활성화하려면: npm install xlsx
 * 이 함수는 런타임에서만 xlsx를 로드하므로, 패키지가 없어도 빌드는 성공합니다.
 *
 * @example
 *   const rows = await loadExcel<MyType>('data.xlsx');
 */
export async function loadExcel<T>(filename: string, sheetIndex = 0): Promise<T[]> {
  const filePath = path.join(process.cwd(), 'data', filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[csvLoader] 파일을 찾을 수 없습니다: ${filePath}`);
    return [];
  }

  try {
    const buffer = fs.readFileSync(filePath);
    // eval을 통해 정적 분석 우회 (선택적 의존성)
    const requireFn = eval('require') as NodeRequire;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = requireFn('xlsx') as any;
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[sheetIndex];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as T[];
  } catch {
    console.warn('[csvLoader] Excel 파일 읽기 실패. xlsx가 설치되지 않은 경우: npm install xlsx');
    return [];
  }
}
