import fs from 'fs';
import path from 'path';

/**
 * JSON 파일을 읽어 파싱된 객체로 반환합니다.
 * 파일 경로: /data/{filename}
 */
export function loadJSON<T>(filename: string): T | null {
  const filePath = path.join(process.cwd(), 'data', filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`[jsonLoader] 파일을 찾을 수 없습니다: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (e) {
    console.error(`[jsonLoader] JSON 파싱 오류 (${filename}):`, e);
    return null;
  }
}
