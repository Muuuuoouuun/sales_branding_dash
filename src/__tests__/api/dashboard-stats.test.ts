// Mock next/server before any imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown) => data),
  },
}));

jest.mock('@/lib/csvLoader', () => ({
  loadCSV: jest.fn(),
}));

import { GET } from '@/app/api/dashboard/stats/route';
import { loadCSV } from '@/lib/csvLoader';

const mockLoadCSV = loadCSV as jest.MockedFunction<typeof loadCSV>;

// Helper: call GET and unwrap the response body
async function getStats() {
  const result = await GET();
  return result as unknown as Array<{
    label: string;
    value: string;
    trend: string;
    trendType: string;
    trendLabel: string;
  }>;
}

afterEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// Response shape
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — response shape', () => {
  beforeEach(() => {
    mockLoadCSV.mockReturnValue([
      { name: '서울', revenue: 4000, target: 4000, deals_active: 80, deals_closed: 72 },
    ]);
  });

  it('returns exactly 4 stat objects', async () => {
    const stats = await getStats();
    expect(stats).toHaveLength(4);
  });

  it('contains the expected labels', async () => {
    const labels = (await getStats()).map(s => s.label);
    expect(labels).toContain('Total Revenue');
    expect(labels).toContain('Active Deals');
    expect(labels).toContain('Close Rate');
    expect(labels).toContain('Critical Regions');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Revenue rate and trendType thresholds
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — revenue trendType', () => {
  it('trendType is "up" when revenue rate >= 90%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 9000, target: 10000, deals_active: 10, deals_closed: 8 },
    ]);
    const stats = await getStats();
    const rev = stats.find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('up');
    expect(rev.trend).toContain('90.0%');
  });

  it('trendType is "up" when revenue rate is exactly 90%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 900, target: 1000, deals_active: 10, deals_closed: 8 },
    ]);
    const rev = (await getStats()).find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('up');
  });

  it('trendType is "down" when revenue rate is between 70% and 90%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 800, target: 1000, deals_active: 10, deals_closed: 8 },
    ]);
    const rev = (await getStats()).find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('down');
    expect(rev.trend).toContain('80.0%');
  });

  it('trendType is "critical" when revenue rate is below 70%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 600, target: 1000, deals_active: 10, deals_closed: 8 },
    ]);
    const rev = (await getStats()).find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('critical');
  });

  it('trendType is "down" at exactly 70%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 700, target: 1000, deals_active: 10, deals_closed: 8 },
    ]);
    const rev = (await getStats()).find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('down');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Critical Regions count
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — criticalCount', () => {
  it('criticalCount is 0 when all regions are >= 70%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 700, target: 1000, deals_active: 10, deals_closed: 8 },
      { name: 'B', revenue: 1000, target: 1000, deals_active: 5, deals_closed: 5 },
    ]);
    const crit = (await getStats()).find(s => s.label === 'Critical Regions')!;
    expect(crit.value).toBe('0');
    expect(crit.trendType).toBe('up');
    expect(crit.trend).toBe('All On Track');
  });

  it('criticalCount > 0 but <= 2 gives trendType "down"', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 500, target: 1000, deals_active: 10, deals_closed: 5 },
      { name: 'B', revenue: 1000, target: 1000, deals_active: 5, deals_closed: 5 },
    ]);
    const crit = (await getStats()).find(s => s.label === 'Critical Regions')!;
    expect(crit.value).toBe('1');
    expect(crit.trendType).toBe('down');
  });

  it('criticalCount > 2 gives trendType "critical"', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 500, target: 1000, deals_active: 10, deals_closed: 5 },
      { name: 'B', revenue: 400, target: 1000, deals_active: 5, deals_closed: 3 },
      { name: 'C', revenue: 300, target: 1000, deals_active: 8, deals_closed: 2 },
    ]);
    const crit = (await getStats()).find(s => s.label === 'Critical Regions')!;
    expect(crit.value).toBe('3');
    expect(crit.trendType).toBe('critical');
  });

  it('region at exactly 70% revenue/target is NOT critical (boundary)', async () => {
    // < 0.70 is critical, so 0.70 exactly should not be counted
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 700, target: 1000, deals_active: 10, deals_closed: 7 },
    ]);
    const crit = (await getStats()).find(s => s.label === 'Critical Regions')!;
    expect(crit.value).toBe('0');
  });

  it('region just below 70% IS critical', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 699, target: 1000, deals_active: 10, deals_closed: 7 },
    ]);
    const crit = (await getStats()).find(s => s.label === 'Critical Regions')!;
    expect(crit.value).toBe('1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Close rate
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — close rate', () => {
  it('trendType is "up" when closeRate >= 60%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 1000, target: 1000, deals_active: 10, deals_closed: 6 },
    ]);
    const cr = (await getStats()).find(s => s.label === 'Close Rate')!;
    expect(cr.trendType).toBe('up');
    expect(cr.trend).toBe('High Momentum');
  });

  it('trendType is "down" when closeRate < 60%', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 1000, target: 1000, deals_active: 10, deals_closed: 5 },
    ]);
    const cr = (await getStats()).find(s => s.label === 'Close Rate')!;
    expect(cr.trendType).toBe('down');
    expect(cr.trend).toBe('Needs Attention');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback to FALLBACK_DATA when CSV is empty
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — CSV fallback', () => {
  it('uses fallback data when loadCSV returns empty array', async () => {
    mockLoadCSV.mockReturnValue([]);
    const stats = await getStats();
    // Fallback has 8 regions; total revenue=16000, target=18600 → rate≈86% → "down"
    const rev = stats.find(s => s.label === 'Total Revenue')!;
    expect(rev.trendType).toBe('down');
    expect(rev.trend).toContain('86.0%');
    // Confirms fallback data was used (not an empty result)
    expect(rev.value).toBe('${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}16.0B');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Revenue formatting
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/dashboard/stats — revenue value format', () => {
  it('formats total revenue as ${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}{N}B', async () => {
    mockLoadCSV.mockReturnValue([
      { name: 'A', revenue: 1500, target: 2000, deals_active: 10, deals_closed: 8 },
    ]);
    const rev = (await getStats()).find(s => s.label === 'Total Revenue')!;
    expect(rev.value).toBe('${typeof window !== 'undefined' && localStorage.getItem('app-currency') === 'USD' ? '$' : '¥'}1.5B');
  });
});
