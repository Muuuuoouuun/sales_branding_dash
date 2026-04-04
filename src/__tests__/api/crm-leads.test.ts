// Mock next/server before any imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data: unknown) => data),
  },
}));

jest.mock('@/lib/csvLoader', () => ({
  loadCSV: jest.fn(),
}));

import { GET } from '@/app/api/crm/leads/route';
import { loadCSV } from '@/lib/csvLoader';

const mockLoadCSV = loadCSV as jest.MockedFunction<typeof loadCSV>;

interface ApiResponse {
  scores: Array<{
    name: string;
    score: number;
    label: string;
    won: number;
    pipeline: number;
    deals: number;
  }>;
  actions: Array<{
    salesRep: string;
    target: string;
    prob: string;
    action: string;
    due: string;
    region: string;
    stage: string;
  }>;
  leads: Array<{
    id: number;
    company: string;
    stage: string;
    probability: number;
    revenue_potential: number;
    owner: string;
    due_label: string;
    action: string;
  }>;
}

async function getLeads(): Promise<ApiResponse> {
  const result = await GET();
  return result as unknown as ApiResponse;
}

afterEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// formatDue — relative date label
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/crm/leads — formatDue (due_label)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-10'));
  });

  afterEach(() => jest.useRealTimers());

  function makeLead(dueDate: string, id = '1') {
    return {
      id,
      company: 'Test Corp',
      contact: 'Tester',
      region: '서울',
      stage: 'Proposal',
      probability: '50',
      revenue_potential: '1000',
      owner: 'Rep',
      last_contact: '2025-01-01',
      due_date: dueDate,
    };
  }

  it('labels a past due date as "N일 초과"', async () => {
    mockLoadCSV.mockReturnValue([makeLead('2025-01-05')]);
    const { leads } = await getLeads();
    expect(leads[0].due_label).toBe('5일 초과');
  });

  it('labels today as "오늘"', async () => {
    mockLoadCSV.mockReturnValue([makeLead('2025-01-10')]);
    const { leads } = await getLeads();
    expect(leads[0].due_label).toBe('오늘');
  });

  it('labels tomorrow as "내일"', async () => {
    mockLoadCSV.mockReturnValue([makeLead('2025-01-11')]);
    const { leads } = await getLeads();
    expect(leads[0].due_label).toBe('내일');
  });

  it('labels a future date as "N일 후"', async () => {
    mockLoadCSV.mockReturnValue([makeLead('2025-01-15')]);
    const { leads } = await getLeads();
    expect(leads[0].due_label).toBe('5일 후');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getActionText — action recommendation branching
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/crm/leads — getActionText (action field)', () => {
  function makeLead(stage: string, probability: string, id = '1') {
    return {
      id,
      company: 'Test Corp',
      contact: 'Tester',
      region: '서울',
      stage,
      probability,
      revenue_potential: '1000',
      owner: 'Rep',
      last_contact: '2025-01-01',
      due_date: '2025-01-31',
    };
  }

  it('Negotiation + prob >= 70 → closing action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Negotiation', '70')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('할인 조건');
  });

  it('Negotiation + prob >= 70 (75) → closing action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Negotiation', '75')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('클로징');
  });

  it('Negotiation + prob < 70 → ROI re-approach action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Negotiation', '60')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('Economic Buyer');
  });

  it('Proposal + prob >= 65 → Q&A follow-up action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Proposal', '65')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('Proposal 후속');
  });

  it('Proposal + prob < 65 → champion-building action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Proposal', '50')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('챔피언');
  });

  it('Lead stage → reactivation action', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Lead', '30')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('리드 재활성화');
  });

  it('Contract stage → reactivation action (default branch)', async () => {
    mockLoadCSV.mockReturnValue([makeLead('Contract', '100')]);
    const { leads } = await getLeads();
    expect(leads[0].action).toContain('리드 재활성화');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Kill list (actions) filtering and ordering
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/crm/leads — kill list (actions array)', () => {
  function lead(id: string, stage: string, probability: string, owner = 'Rep') {
    return {
      id,
      company: `Corp${id}`,
      contact: 'X',
      region: '서울',
      stage,
      probability,
      revenue_potential: '1000',
      owner,
      last_contact: '2025-01-01',
      due_date: '2025-01-31',
    };
  }

  it('excludes Contract stage leads from actions', async () => {
    mockLoadCSV.mockReturnValue([
      lead('1', 'Contract', '100'),
      lead('2', 'Negotiation', '75'),
    ]);
    const { actions } = await getLeads();
    expect(actions.every(a => a.stage !== 'Contract')).toBe(true);
  });

  it('excludes leads with probability < 40', async () => {
    mockLoadCSV.mockReturnValue([
      lead('1', 'Lead', '39'),
      lead('2', 'Proposal', '40'),
    ]);
    const { actions } = await getLeads();
    expect(actions).toHaveLength(1);
    expect(actions[0].target).toBe('Corp2');
  });

  it('includes leads with probability exactly 40', async () => {
    mockLoadCSV.mockReturnValue([lead('1', 'Proposal', '40')]);
    const { actions } = await getLeads();
    expect(actions).toHaveLength(1);
  });

  it('caps kill list at 6 items', async () => {
    const manyLeads = Array.from({ length: 10 }, (_, i) =>
      lead(String(i + 1), 'Proposal', '80')
    );
    mockLoadCSV.mockReturnValue(manyLeads);
    const { actions } = await getLeads();
    expect(actions.length).toBeLessThanOrEqual(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leads sorting: STAGE_ORDER then probability descending
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/crm/leads — leads sort order', () => {
  it('sorts by stage order first (Lead < Proposal < Negotiation < Contract)', async () => {
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'Contract Corp', contact: 'X', region: '서울', stage: 'Contract',    probability: '100', revenue_potential: '1000', owner: 'A', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'Lead Corp',     contact: 'X', region: '서울', stage: 'Lead',       probability: '50',  revenue_potential: '1000', owner: 'A', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '3', company: 'Proposal Corp', contact: 'X', region: '서울', stage: 'Proposal',   probability: '60',  revenue_potential: '1000', owner: 'A', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { leads } = await getLeads();
    expect(leads[0].stage).toBe('Lead');
    expect(leads[1].stage).toBe('Proposal');
    expect(leads[2].stage).toBe('Contract');
  });

  it('within the same stage, sorts by probability descending', async () => {
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'Low',  contact: 'X', region: '서울', stage: 'Proposal', probability: '40', revenue_potential: '1000', owner: 'A', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'High', contact: 'X', region: '서울', stage: 'Proposal', probability: '80', revenue_potential: '1000', owner: 'A', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { leads } = await getLeads();
    expect(leads[0].company).toBe('High');
    expect(leads[1].company).toBe('Low');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Focus scores (owner performance)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/crm/leads — focus scores', () => {
  it('returns one score entry per unique owner', async () => {
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'A', contact: 'X', region: '서울', stage: 'Proposal', probability: '60', revenue_potential: '2000', owner: 'Jung', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'B', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '8000', owner: 'Park', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { scores } = await getLeads();
    expect(scores).toHaveLength(2);
    expect(scores.map(s => s.name)).toContain('Jung');
    expect(scores.map(s => s.name)).toContain('Park');
  });

  it('owner with won revenue scores higher than owner with only pipeline', async () => {
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'Won',      contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '5000', owner: 'Winner', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'Pipeline', contact: 'X', region: '서울', stage: 'Proposal', probability: '80',  revenue_potential: '5000', owner: 'Pipeliner', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { scores } = await getLeads();
    const winner = scores.find(s => s.name === 'Winner')!;
    const pipeliner = scores.find(s => s.name === 'Pipeliner')!;
    expect(winner.score).toBeGreaterThan(pipeliner.score);
  });

  it('score is capped at 100', async () => {
    // Give an owner an unrealistically high pipeline to test the cap
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'A', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '99999', owner: 'Superstar', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'B', contact: 'X', region: '서울', stage: 'Proposal', probability: '99',  revenue_potential: '99999', owner: 'Superstar', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '3', company: 'C', contact: 'X', region: '서울', stage: 'Negotiation', probability: '99', revenue_potential: '99999', owner: 'Superstar', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { scores } = await getLeads();
    scores.forEach(s => expect(s.score).toBeLessThanOrEqual(100));
  });

  it('scores are sorted descending by score', async () => {
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'A', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '5000', owner: 'Top',    last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'B', contact: 'X', region: '서울', stage: 'Lead',     probability: '20',  revenue_potential: '100',  owner: 'Bottom', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { scores } = await getLeads();
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1].score).toBeGreaterThanOrEqual(scores[i].score);
    }
  });

  it('label is "Top 10%" for score >= 80', async () => {
    // Elite needs >= 3 deals (for +20 bonus) AND maximal won-revenue share:
    // score = (10001/10001)*60 + (0/5000)*20 + 20 = 80 → "Top 10%"
    mockLoadCSV.mockReturnValue([
      { id: '1', company: 'A', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '9999', owner: 'Elite', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '2', company: 'B', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '1',    owner: 'Elite', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '3', company: 'C', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '1',    owner: 'Elite', last_contact: '2025-01-01', due_date: '2025-01-31' },
      { id: '4', company: 'D', contact: 'X', region: '서울', stage: 'Contract', probability: '100', revenue_potential: '1',    owner: 'Other', last_contact: '2025-01-01', due_date: '2025-01-31' },
    ]);
    const { scores } = await getLeads();
    const elite = scores.find(s => s.name === 'Elite')!;
    expect(elite.score).toBeGreaterThanOrEqual(80);
    expect(elite.label).toBe('Top 10%');
  });
});
