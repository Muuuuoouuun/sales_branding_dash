/**
 * 달성률(progress %)에 따른 히트맵 색상 반환
 */
export function getHeatColor(progress: number): string {
  if (progress >= 100) return '#22c55e'; // green-500
  if (progress >= 90)  return '#4ade80'; // green-400
  if (progress >= 80)  return '#a3e635'; // lime-400
  if (progress >= 70)  return '#fbbf24'; // amber-400
  if (progress >= 60)  return '#f97316'; // orange-500
  if (progress >= 50)  return '#ef4444'; // red-500
  return '#dc2626';                       // red-600
}

/**
 * 달성률에 따른 glow 색상 (radial gradient용)
 */
export function getGlowColor(progress: number): string {
  if (progress >= 80) return 'rgba(34, 197, 94, 0.45)';
  if (progress >= 60) return 'rgba(251, 191, 36, 0.45)';
  return 'rgba(239, 68, 68, 0.45)';
}

/**
 * 달성률에 따른 상태 라벨
 */
export function getStatusLabel(progress: number): string {
  if (progress >= 100) return '초과달성';
  if (progress >= 90)  return '순조';
  if (progress >= 70)  return '주의';
  if (progress >= 50)  return '위험';
  return '심각';
}

/**
 * 매출 규모를 버블 반지름으로 변환
 */
export function getBubbleRadius(
  revenue: number,
  maxRevenue: number,
  min = 6,
  max = 24
): number {
  return min + (revenue / maxRevenue) * (max - min);
}
