import fs from 'fs';
import path from 'path';
import { loadJSON } from './jsonLoader';

/**
 * leads.csv 의 특정 id 행을 부분 업데이트합니다.
 * 기존 /api/data/save/route.ts 의 backup + writeFileSync 패턴을 따릅니다.
 */
export function updateLeadRow(
  id: number,
  updates: Record<string, string | number | boolean>,
): { ok: boolean; error?: string } {
  const filePath = path.join(process.cwd(), 'data', 'leads.csv');
  if (!fs.existsSync(filePath)) return { ok: false, error: 'leads.csv not found' };

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return { ok: false, error: 'CSV is empty' };

  // 헤더 파싱 (따옴표 제거)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const idIdx = headers.indexOf('id');
  if (idIdx === -1) return { ok: false, error: 'id column not found' };

  // 대상 행 찾기
  const targetIdx = lines.findIndex((line, i) => {
    if (i === 0) return false;
    const val = line.split(',')[idIdx]?.trim().replace(/^"|"$/g, '');
    return val === String(id);
  });
  if (targetIdx === -1) return { ok: false, error: `id=${id} not found` };

  // 값 교체
  const vals = lines[targetIdx].split(',');
  Object.entries(updates).forEach(([key, value]) => {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      vals[colIdx] = String(value);
    }
  });
  lines[targetIdx] = vals.join(',');

  // 백업 후 저장
  const backupPath = filePath.replace('leads.csv', `leads.backup.${Date.now()}.csv`);
  fs.copyFileSync(filePath, backupPath);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');

  return { ok: true };
}

/**
 * activities.json 에 새 활동 엔트리를 추가합니다.
 * id 는 기존 최대 act-NNN + 1 로 자동 부여합니다.
 */
export function appendActivity(
  activity: Record<string, unknown>,
): { ok: boolean; id?: string; error?: string } {
  const filePath = path.join(process.cwd(), 'data', 'activities.json');
  const list = loadJSON<Record<string, unknown>[]>('activities.json') ?? [];

  // 최대 ID 계산
  const maxId = list.reduce((m, a) => {
    const n = parseInt(String(a.id ?? '').replace('act-', ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const newId = `act-${String(maxId + 1).padStart(3, '0')}`;
  activity.id = newId;

  list.push(activity);

  // 백업 후 저장
  const backupPath = filePath.replace('activities.json', `activities.backup.${Date.now()}.json`);
  if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
  fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');

  return { ok: true, id: newId };
}
