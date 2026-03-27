import 'server-only';

import fs from 'fs';
import path from 'path';
import { loadCSV } from '@/lib/csvLoader';
import { createSupabaseAdminClient, hasSupabaseServerConfig } from '@/lib/supabase/server';

export type DataBackend = 'supabase' | 'csv';

export interface RegionMetricRow {
  name: string;
  revenue: number;
  target: number;
  deals_active: number;
  deals_closed: number;
}

export interface LeadRow {
  id: number;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string;
  due_date: string;
  notes?: string | null;
}

export interface LeadSyncRow {
  external_id: string;
  source_system: string;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: number;
  revenue_potential: number;
  owner: string;
  last_contact: string | null;
  due_date: string | null;
  notes?: string | null;
  source_payload?: Record<string, unknown>;
}

interface SalesTableRow {
  region: string;
  revenue: number | string | null;
  target: number | string | null;
  deals_active: number | string | null;
  deals_closed: number | string | null;
  period?: string | null;
}

interface LeadsTableRow {
  id: number | string;
  company: string | null;
  contact: string | null;
  region: string | null;
  stage: string | null;
  probability: number | string | null;
  revenue_potential: number | string | null;
  owner: string | null;
  last_contact: string | null;
  due_date: string | null;
  notes?: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCurrentMonthPeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function normalizeSalesRow(row: SalesTableRow): RegionMetricRow {
  return {
    name: row.region,
    revenue: toNumber(row.revenue),
    target: toNumber(row.target),
    deals_active: toNumber(row.deals_active),
    deals_closed: toNumber(row.deals_closed),
  };
}

function normalizeLeadRow(row: LeadsTableRow): LeadRow {
  return {
    id: toNumber(row.id),
    company: row.company ?? '',
    contact: row.contact ?? '',
    region: row.region ?? '',
    stage: row.stage ?? 'Lead',
    probability: toNumber(row.probability),
    revenue_potential: toNumber(row.revenue_potential),
    owner: row.owner ?? '',
    last_contact: row.last_contact ?? '',
    due_date: row.due_date ?? '',
    notes: row.notes ?? null,
  };
}

function loadRegionalMetricsFromCsv(): RegionMetricRow[] {
  const rows = loadCSV<RegionMetricRow>('regions.csv');
  return rows.map((row) => ({
    name: String(row.name ?? ''),
    revenue: toNumber(row.revenue),
    target: toNumber(row.target),
    deals_active: toNumber(row.deals_active),
    deals_closed: toNumber(row.deals_closed),
  }));
}

function loadLeadsFromCsv(): LeadRow[] {
  const rows = loadCSV<LeadRow>('leads.csv');
  return rows.map((row) => ({
    id: toNumber(row.id),
    company: String(row.company ?? ''),
    contact: String(row.contact ?? ''),
    region: String(row.region ?? ''),
    stage: String(row.stage ?? 'Lead'),
    probability: toNumber(row.probability),
    revenue_potential: toNumber(row.revenue_potential),
    owner: String(row.owner ?? ''),
    last_contact: String(row.last_contact ?? ''),
    due_date: String(row.due_date ?? ''),
    notes: row.notes ?? null,
  }));
}

function writeRegionalMetricsToCsv(rows: RegionMetricRow[]): void {
  const filePath = path.join(process.cwd(), 'data', 'regions.csv');
  const backupPath = path.join(process.cwd(), 'data', `regions.backup.${Date.now()}.csv`);

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  const header = 'name,revenue,target,deals_active,deals_closed';
  const lines = rows.map((row) =>
    `${row.name},${row.revenue},${row.target},${row.deals_active},${row.deals_closed}`,
  );

  fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');
}

export async function listRegionalMetrics(): Promise<{
  backend: DataBackend;
  rows: RegionMetricRow[];
}> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();
    const period = getCurrentMonthPeriod();

    if (supabase) {
      const { data, error } = await supabase
        .from('sales')
        .select('region, revenue, target, deals_active, deals_closed, period')
        .eq('period', period)
        .order('region');

      if (!error && Array.isArray(data) && data.length > 0) {
        return {
          backend: 'supabase',
          rows: (data as SalesTableRow[]).map(normalizeSalesRow),
        };
      }
    }
  }

  return {
    backend: 'csv',
    rows: loadRegionalMetricsFromCsv(),
  };
}

export async function saveRegionalMetrics(rows: RegionMetricRow[]): Promise<{
  backend: DataBackend;
  savedAt: string;
}> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();
    const period = getCurrentMonthPeriod();

    if (supabase) {
      const payload = rows.map((row) => ({
        region: row.name,
        revenue: row.revenue,
        target: row.target,
        deals_active: row.deals_active,
        deals_closed: row.deals_closed,
        period,
      }));

      const { error } = await supabase
        .from('sales')
        .upsert(payload, { onConflict: 'region,period' });

      if (!error) {
        return {
          backend: 'supabase',
          savedAt: new Date().toISOString(),
        };
      }
    }
  }

  writeRegionalMetricsToCsv(rows);

  return {
    backend: 'csv',
    savedAt: new Date().toISOString(),
  };
}

export async function listLeads(): Promise<{
  backend: DataBackend;
  rows: LeadRow[];
}> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, company, contact, region, stage, probability, revenue_potential, owner, last_contact, due_date, notes',
        )
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return {
          backend: 'supabase',
          rows: (data as LeadsTableRow[]).map(normalizeLeadRow),
        };
      }
    }
  }

  return {
    backend: 'csv',
    rows: loadLeadsFromCsv(),
  };
}

export async function saveLeads(rows: LeadSyncRow[]): Promise<{
  backend: DataBackend;
  savedAt: string;
}> {
  if (!rows.length) {
    return {
      backend: hasSupabaseServerConfig() ? 'supabase' : 'csv',
      savedAt: new Date().toISOString(),
    };
  }

  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const payload = rows.map((row) => ({
        external_id: row.external_id,
        source_system: row.source_system,
        company: row.company,
        contact: row.contact,
        region: row.region,
        stage: row.stage,
        probability: row.probability,
        revenue_potential: row.revenue_potential,
        owner: row.owner,
        last_contact: row.last_contact,
        due_date: row.due_date,
        notes: row.notes ?? null,
        source_payload: row.source_payload ?? {},
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('leads')
        .upsert(payload, { onConflict: 'source_system,external_id' });

      if (!error) {
        return {
          backend: 'supabase',
          savedAt: new Date().toISOString(),
        };
      }
    }
  }

  return {
    backend: 'csv',
    savedAt: new Date().toISOString(),
  };
}
