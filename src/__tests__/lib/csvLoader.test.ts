jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import { loadCSV } from '@/lib/csvLoader';
import fs from 'fs';

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

function setupFile(content: string) {
  mockExistsSync.mockReturnValue(true);
  mockReadFileSync.mockReturnValue(content as unknown as Buffer);
}

afterEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// File not found / empty
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — file access', () => {
  it('returns an empty array when the file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadCSV('missing.csv')).toEqual([]);
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });

  it('returns an empty array for a completely empty file', () => {
    setupFile('');
    expect(loadCSV('empty.csv')).toEqual([]);
  });

  it('returns an empty array for a whitespace-only file', () => {
    setupFile('   \n  \n  ');
    expect(loadCSV('whitespace.csv')).toEqual([]);
  });

  it('returns an empty array when there is only a header row', () => {
    setupFile('id,name,value\n');
    expect(loadCSV('headers-only.csv')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Basic parsing
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — basic parsing', () => {
  it('parses a minimal single-row CSV', () => {
    setupFile('name\nAlice');
    const result = loadCSV<{ name: string }>('test.csv');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('parses multiple rows', () => {
    setupFile('id,name\n1,Alice\n2,Bob\n3,Carol');
    const result = loadCSV<{ id: number; name: string }>('test.csv');
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Alice');
    expect(result[2].name).toBe('Carol');
  });

  it('converts numeric strings to numbers', () => {
    setupFile('value\n42\n3.14\n0\n-7');
    const result = loadCSV<{ value: number }>('test.csv');
    expect(result[0].value).toBe(42);
    expect(result[1].value).toBeCloseTo(3.14);
    expect(result[2].value).toBe(0);
    expect(result[3].value).toBe(-7);
  });

  it('keeps non-numeric strings as strings', () => {
    setupFile('label\nhello\nfoo123\n');
    const result = loadCSV<{ label: string }>('test.csv');
    expect(result[0].label).toBe('hello');
    expect(result[1].label).toBe('foo123');
  });

  it('trims whitespace from cell values', () => {
    setupFile('name, score\n Alice , 95 ');
    const result = loadCSV<{ name: string; score: number }>('test.csv');
    expect(result[0].name).toBe('Alice');
    expect(result[0].score).toBe(95);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Quoted values
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — quoted values', () => {
  it('handles a quoted value containing a comma', () => {
    setupFile('id,name\n1,"Smith, John"\n2,Alice');
    const result = loadCSV<{ id: number; name: string }>('test.csv');
    expect(result[0].name).toBe('Smith, John');
    expect(result[1].name).toBe('Alice');
  });

  it('handles multiple quoted fields in one row', () => {
    setupFile('a,b,c\n"x,y","p,q",normal');
    const result = loadCSV<{ a: string; b: string; c: string }>('test.csv');
    expect(result[0].a).toBe('x,y');
    expect(result[0].b).toBe('p,q');
    expect(result[0].c).toBe('normal');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Line endings
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — line endings', () => {
  it('handles Windows CRLF line endings', () => {
    setupFile('id,name\r\n1,Alice\r\n2,Bob');
    const result = loadCSV<{ id: number; name: string }>('test.csv');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: 'Alice' });
    expect(result[1]).toEqual({ id: 2, name: 'Bob' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Missing / extra columns
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — column count mismatches', () => {
  it('fills missing columns with empty string', () => {
    setupFile('id,name,extra\n1,Alice');
    const result = loadCSV<{ id: number; name: string; extra: string }>('test.csv');
    expect(result[0].extra).toBe('');
  });

  it('ignores extra columns beyond header count', () => {
    // The current implementation maps each header to its column index,
    // so extra values are silently ignored (no header key for them).
    setupFile('id,name\n1,Alice,extra_col');
    const result = loadCSV<{ id: number; name: string }>('test.csv');
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('Alice');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-world shape: matches leads.csv schema
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCSV — leads.csv shape', () => {
  it('produces correctly typed rows for the leads schema', () => {
    const csv = [
      'id,company,contact,region,stage,probability,revenue_potential,owner,last_contact,due_date',
      '1,ACME Corp,Kim Jisu,서울,Negotiation,75,5000,Park Minsu,2025-01-01,2025-01-31',
    ].join('\n');
    setupFile(csv);

    interface LeadRow {
      id: number;
      company: string;
      probability: number;
      revenue_potential: number;
    }
    const result = loadCSV<LeadRow>('leads.csv');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].company).toBe('ACME Corp');
    expect(result[0].probability).toBe(75);
    expect(result[0].revenue_potential).toBe(5000);
  });
});
