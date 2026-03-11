import {
  getHeatColor,
  getGlowColor,
  getStatusLabel,
  getBubbleRadius,
} from '@/lib/heatUtils';

// ─────────────────────────────────────────────────────────────────────────────
// getHeatColor
// ─────────────────────────────────────────────────────────────────────────────
describe('getHeatColor', () => {
  it('returns green-500 (#22c55e) at exactly 100', () => {
    expect(getHeatColor(100)).toBe('#22c55e');
  });

  it('returns green-500 above 100 (overachievement)', () => {
    expect(getHeatColor(110)).toBe('#22c55e');
    expect(getHeatColor(200)).toBe('#22c55e');
  });

  it('returns green-400 (#4ade80) in [90, 100)', () => {
    expect(getHeatColor(90)).toBe('#4ade80');
    expect(getHeatColor(95)).toBe('#4ade80');
    expect(getHeatColor(99.9)).toBe('#4ade80');
  });

  it('returns lime-400 (#a3e635) in [80, 90)', () => {
    expect(getHeatColor(80)).toBe('#a3e635');
    expect(getHeatColor(85)).toBe('#a3e635');
    expect(getHeatColor(89.9)).toBe('#a3e635');
  });

  it('returns amber-400 (#fbbf24) in [70, 80)', () => {
    expect(getHeatColor(70)).toBe('#fbbf24');
    expect(getHeatColor(75)).toBe('#fbbf24');
    expect(getHeatColor(79.9)).toBe('#fbbf24');
  });

  it('returns orange-500 (#f97316) in [60, 70)', () => {
    expect(getHeatColor(60)).toBe('#f97316');
    expect(getHeatColor(65)).toBe('#f97316');
    expect(getHeatColor(69.9)).toBe('#f97316');
  });

  it('returns red-500 (#ef4444) in [50, 60)', () => {
    expect(getHeatColor(50)).toBe('#ef4444');
    expect(getHeatColor(55)).toBe('#ef4444');
    expect(getHeatColor(59.9)).toBe('#ef4444');
  });

  it('returns red-600 (#dc2626) below 50', () => {
    expect(getHeatColor(49.9)).toBe('#dc2626');
    expect(getHeatColor(25)).toBe('#dc2626');
    expect(getHeatColor(0)).toBe('#dc2626');
    expect(getHeatColor(-10)).toBe('#dc2626');
  });

  it('covers all 7 distinct colour tiers', () => {
    const colours = new Set([100, 95, 85, 75, 65, 55, 40].map(getHeatColor));
    expect(colours.size).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGlowColor
// ─────────────────────────────────────────────────────────────────────────────
describe('getGlowColor', () => {
  it('returns green glow at 80', () => {
    expect(getGlowColor(80)).toBe('rgba(34, 197, 94, 0.45)');
  });

  it('returns green glow above 80', () => {
    expect(getGlowColor(100)).toBe('rgba(34, 197, 94, 0.45)');
    expect(getGlowColor(90)).toBe('rgba(34, 197, 94, 0.45)');
  });

  it('returns amber glow at 60', () => {
    expect(getGlowColor(60)).toBe('rgba(251, 191, 36, 0.45)');
  });

  it('returns amber glow in [60, 80)', () => {
    expect(getGlowColor(79)).toBe('rgba(251, 191, 36, 0.45)');
    expect(getGlowColor(70)).toBe('rgba(251, 191, 36, 0.45)');
  });

  it('returns red glow below 60', () => {
    expect(getGlowColor(59)).toBe('rgba(239, 68, 68, 0.45)');
    expect(getGlowColor(0)).toBe('rgba(239, 68, 68, 0.45)');
    expect(getGlowColor(-5)).toBe('rgba(239, 68, 68, 0.45)');
  });

  it('covers exactly 3 tiers', () => {
    const glows = new Set([100, 70, 30].map(getGlowColor));
    expect(glows.size).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getStatusLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('getStatusLabel', () => {
  it('returns "초과달성" at exactly 100', () => {
    expect(getStatusLabel(100)).toBe('초과달성');
  });

  it('returns "초과달성" above 100', () => {
    expect(getStatusLabel(110)).toBe('초과달성');
  });

  it('returns "순조" in [90, 100)', () => {
    expect(getStatusLabel(90)).toBe('순조');
    expect(getStatusLabel(99)).toBe('순조');
  });

  // Known design choice: [80, 90) maps to '주의' same as [70, 80).
  // getHeatColor distinguishes lime (80-90) from amber (70-80),
  // but getStatusLabel has no separate label for that range.
  it('returns "주의" in [70, 90) — no distinct label for [80, 90)', () => {
    expect(getStatusLabel(70)).toBe('주의');
    expect(getStatusLabel(80)).toBe('주의');
    expect(getStatusLabel(89)).toBe('주의');
  });

  it('returns "위험" in [50, 70)', () => {
    expect(getStatusLabel(50)).toBe('위험');
    expect(getStatusLabel(60)).toBe('위험');
    expect(getStatusLabel(69)).toBe('위험');
  });

  it('returns "심각" below 50', () => {
    expect(getStatusLabel(49)).toBe('심각');
    expect(getStatusLabel(0)).toBe('심각');
    expect(getStatusLabel(-1)).toBe('심각');
  });

  it('has 5 distinct labels across the full range', () => {
    const labels = new Set([110, 95, 85, 60, 30].map(getStatusLabel));
    expect(labels.size).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBubbleRadius
// ─────────────────────────────────────────────────────────────────────────────
describe('getBubbleRadius', () => {
  it('returns the min radius (6) when revenue is 0', () => {
    expect(getBubbleRadius(0, 1000)).toBe(6);
  });

  it('returns the max radius (24) when revenue equals maxRevenue', () => {
    expect(getBubbleRadius(1000, 1000)).toBe(24);
  });

  it('returns the midpoint radius for 50% revenue', () => {
    // 6 + 0.5 * (24 - 6) = 6 + 9 = 15
    expect(getBubbleRadius(500, 1000)).toBe(15);
  });

  it('scales linearly between min and max', () => {
    const r25 = getBubbleRadius(250, 1000);   // 6 + 0.25 * 18 = 10.5
    const r75 = getBubbleRadius(750, 1000);   // 6 + 0.75 * 18 = 19.5
    expect(r25).toBeCloseTo(10.5);
    expect(r75).toBeCloseTo(19.5);
    expect(r75 - r25).toBeCloseTo(r25 - 6 + (24 - r75));  // symmetric around midpoint
  });

  it('respects custom min and max parameters', () => {
    // 10 + 0.5 * (20 - 10) = 15
    expect(getBubbleRadius(500, 1000, 10, 20)).toBe(15);
    expect(getBubbleRadius(0, 1000, 10, 20)).toBe(10);
    expect(getBubbleRadius(1000, 1000, 10, 20)).toBe(20);
  });

  it('returns Infinity (unguarded division-by-zero) when maxRevenue is 0', () => {
    // Documents the current behaviour: no guard exists for maxRevenue === 0.
    // 100 / 0 in JavaScript yields Infinity, not NaN.
    // Callers must ensure maxRevenue > 0 before calling this function.
    const result = getBubbleRadius(100, 0);
    expect(result).toBe(Infinity);
  });
});
