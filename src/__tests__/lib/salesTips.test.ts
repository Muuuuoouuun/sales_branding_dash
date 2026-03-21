import {
  SALES_TIPS,
  SALES_LEGENDS,
  getDailyTip,
  getTipsByMethodology,
  getLegendOfDay,
  type MethodologyId,
  type SalesTipEntry,
} from '@/lib/salesTips';

// ─────────────────────────────────────────────────────────────────────────────
// SALES_TIPS data integrity
// ─────────────────────────────────────────────────────────────────────────────
describe('SALES_TIPS data integrity', () => {
  it('contains exactly 30 tips', () => {
    expect(SALES_TIPS).toHaveLength(30);
  });

  it('all tips have required non-empty fields', () => {
    SALES_TIPS.forEach((tip: SalesTipEntry) => {
      expect(tip.id).toBeGreaterThan(0);
      expect(tip.methodology).toBeTruthy();
      expect(tip.methodologyKr).toBeTruthy();
      expect(tip.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tip.tip.trim()).not.toBe('');
      expect(tip.source.trim()).not.toBe('');
    });
  });

  it('all IDs are unique', () => {
    const ids = SALES_TIPS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('IDs run consecutively from 1 to 30', () => {
    const sorted = [...SALES_TIPS].sort((a, b) => a.id - b.id);
    sorted.forEach((tip, i) => expect(tip.id).toBe(i + 1));
  });

  it('all methodology values are valid MethodologyId', () => {
    const valid: MethodologyId[] = ['Challenger', 'SPIN', 'MEDDIC', 'Sandler', 'General'];
    SALES_TIPS.forEach(tip => {
      expect(valid).toContain(tip.methodology);
    });
  });

  it('all 5 methodologies are represented', () => {
    const present = new Set(SALES_TIPS.map(t => t.methodology));
    expect(present).toContain('Challenger');
    expect(present).toContain('SPIN');
    expect(present).toContain('MEDDIC');
    expect(present).toContain('Sandler');
    expect(present).toContain('General');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTipsByMethodology
// ─────────────────────────────────────────────────────────────────────────────
describe('getTipsByMethodology', () => {
  it('returns only tips matching the requested methodology', () => {
    (['Challenger', 'SPIN', 'MEDDIC', 'Sandler', 'General'] as MethodologyId[]).forEach(m => {
      const tips = getTipsByMethodology(m);
      expect(tips.length).toBeGreaterThan(0);
      tips.forEach(t => expect(t.methodology).toBe(m));
    });
  });

  it('Challenger has 5 tips (ids 1–5)', () => {
    expect(getTipsByMethodology('Challenger')).toHaveLength(5);
  });

  it('SPIN has 5 tips (ids 6–10)', () => {
    expect(getTipsByMethodology('SPIN')).toHaveLength(5);
  });

  it('MEDDIC has 6 tips (ids 11–16)', () => {
    expect(getTipsByMethodology('MEDDIC')).toHaveLength(6);
  });

  it('Sandler has 6 tips (ids 17–22)', () => {
    expect(getTipsByMethodology('Sandler')).toHaveLength(6);
  });

  it('General has 8 tips (ids 23–30)', () => {
    expect(getTipsByMethodology('General')).toHaveLength(8);
  });

  it('sums to total tip count', () => {
    const total = (['Challenger', 'SPIN', 'MEDDIC', 'Sandler', 'General'] as MethodologyId[])
      .reduce((s, m) => s + getTipsByMethodology(m).length, 0);
    expect(total).toBe(SALES_TIPS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDailyTip
// ─────────────────────────────────────────────────────────────────────────────
describe('getDailyTip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a valid tip from SALES_TIPS', () => {
    const tip = getDailyTip();
    expect(SALES_TIPS).toContain(tip);
  });

  it('is deterministic for the same date and offset', () => {
    expect(getDailyTip(0)).toBe(getDailyTip(0));
  });

  it('offset +1 returns a different tip than offset 0', () => {
    expect(getDailyTip(0)).not.toBe(getDailyTip(1));
  });

  it('offset equal to SALES_TIPS.length wraps back to the same tip', () => {
    expect(getDailyTip(0)).toBe(getDailyTip(SALES_TIPS.length));
  });

  it('large positive offset still returns a valid tip', () => {
    expect(SALES_TIPS).toContain(getDailyTip(SALES_TIPS.length * 5 + 3));
  });

  it('negative offset wraps correctly and returns a valid tip', () => {
    const tip = getDailyTip(-1);
    expect(SALES_TIPS).toContain(tip);
  });

  it('tip changes across consecutive days', () => {
    const day1 = getDailyTip(0);
    jest.setSystemTime(new Date('2025-01-11'));
    const day2 = getDailyTip(0);
    expect(day1).not.toBe(day2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SALES_LEGENDS data integrity
// ─────────────────────────────────────────────────────────────────────────────
describe('SALES_LEGENDS data integrity', () => {
  it('contains exactly 4 legends', () => {
    expect(SALES_LEGENDS).toHaveLength(4);
  });

  it('all legends have required fields', () => {
    SALES_LEGENDS.forEach(legend => {
      expect(legend.id).toBeTruthy();
      expect(legend.name.trim()).not.toBe('');
      expect(legend.title.trim()).not.toBe('');
      expect(legend.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(legend.quotes.length).toBeGreaterThan(0);
      expect(legend.principles.length).toBeGreaterThan(0);
      expect(legend.signatureMove.trim()).not.toBe('');
    });
  });

  it('legend IDs match valid MethodologyId values', () => {
    const valid: MethodologyId[] = ['Challenger', 'SPIN', 'MEDDIC', 'Sandler', 'General'];
    SALES_LEGENDS.forEach(legend => expect(valid).toContain(legend.id));
  });

  it('all legend IDs are unique', () => {
    const ids = SALES_LEGENDS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getLegendOfDay
// ─────────────────────────────────────────────────────────────────────────────
describe('getLegendOfDay', () => {
  afterEach(() => jest.useRealTimers());

  it('returns a valid legend from SALES_LEGENDS', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10'));
    expect(SALES_LEGENDS).toContain(getLegendOfDay());
  });

  it('rotates across all 4 legends over 4 consecutive weeks', () => {
    const seen = new Set<string>();
    const WEEK_MS = 7 * 86_400_000;
    const base = new Date('2025-01-06').getTime(); // Monday of a known week

    jest.useFakeTimers();
    for (let w = 0; w < 4; w++) {
      jest.setSystemTime(new Date(base + w * WEEK_MS));
      seen.add(getLegendOfDay().id);
    }
    expect(seen.size).toBe(4);
  });

  it('returns the same legend within the same 7-day epoch bucket', () => {
    // getLegendOfDay() uses Math.floor(Date.now() / 7_days) which creates
    // epoch-relative buckets that do NOT align with calendar Mon–Sun weeks.
    // We use epoch timestamps 0 through 6 days to test the invariant.
    jest.useFakeTimers();
    jest.setSystemTime(0);                    // epoch day 0 → week 0
    const day0 = getLegendOfDay();
    jest.setSystemTime(6 * 24 * 3600 * 1000); // epoch day 6 → still week 0
    const day6 = getLegendOfDay();
    expect(day0).toBe(day6);
  });
});
