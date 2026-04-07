import 'server-only';

import fs from 'fs';
import path from 'path';
import { loadCSV } from '@/lib/csvLoader';
import { getCurrentMonthPeriod } from '@/lib/fiscalCalendar';
import { hasGoogleSheetsConfig } from '@/lib/server/googleSheets';
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
  deal_type?: "New" | "Renew" | null;
  product_type?: string | null;
  importance?: string | null;
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
  backend: DataBackend | 'google-sheets';
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

  if (hasGoogleSheetsConfig()) {
    try {
      const { getMultipleSheetValues } = await import('@/lib/server/googleSheets');
      const ranges = await getMultipleSheetValues(['3. REV!A1:Z400']);
      const sheetRows = ranges['3. REV!A1:Z400'] || [];
      const TARGET_MANAGERS = ['han', 'wangchan', 'junhyuk'];

      const parsedLeads: LeadRow[] = [];
      let rowId = 1;

      for (const row of sheetRows.slice(2)) {
        const account = (row[0] || '').trim();
        const branch = (row[1] || '').trim();
        const team = (row[2] || '').trim();
        const manager = (row[3] || '').trim().toLowerCase();

        if (account && team === 'BD' && TARGET_MANAGERS.includes(manager)) {
          const type = (row[4] || '').trim();
          const pStatus = (row[5] || '').trim();
          const firstPayment = (row[6] || '').trim();
          const location = (row[8] || '').trim();
          const importance = (row[9] || '').trim();  // col[9]: A / B / KA tier
          const remark = (row[11] || '').trim();

          let amount = Number((row[12] || '').replace(/[^\d.-]/g, ''));
          if (!Number.isFinite(amount)) amount = 0;

          let probScore = pStatus === 'Renew' ? 72 : 58;
          if (importance === 'KA') probScore += 18;
          else if (importance === 'A') probScore += 10;
          else if (importance === 'B') probScore += 4;
          if (type === 'Channel') probScore -= 4;
          let probability = Math.min(Math.max(probScore, 20), 95);
          if (firstPayment && firstPayment !== '-') probability = 100;

          let stage = 'Lead';
          if (probability === 100) stage = 'Contract';
          else if (probability >= 70) stage = 'Negotiation';
          else if (probability >= 50) stage = 'Proposal';

          const productType = (row[7] || '').trim() || null;

          parsedLeads.push({
            id: rowId++,
            company: account,
            contact: branch && branch !== '-' ? branch : '-',
            region: location,
            stage,
            probability,
            revenue_potential: amount,
            owner: (row[3] || '').trim(),
            last_contact: '',
            due_date: firstPayment && firstPayment !== '-' ? firstPayment : '',
            notes: remark || null,
            deal_type: pStatus === 'Renew' ? 'Renew' : 'New',
            product_type: productType,
            importance: importance || null,
          });
        }
      }
      
      if (parsedLeads.length > 0) {
        return {
          backend: 'google-sheets',
          rows: parsedLeads,
        };
      }
    } catch (err) {
      console.error("Failed to load CRM leads from Google Sheets, falling back to CSV:", err);
    }
  }

  return {
    backend: 'csv',
    rows: loadLeadsFromCsv(),
  };
}

// CSV leads 전체를 쓰는 내부 함수
function writeLeadsToCsv(rows: LeadRow[]): void {
  const filePath = path.join(process.cwd(), 'data', 'leads.csv');
  const header = 'id,company,contact,region,stage,probability,revenue_potential,owner,last_contact,due_date,notes,deal_type,product_type,importance';
  const lines = rows.map((r) =>
    [r.id, r.company, r.contact, r.region, r.stage, r.probability, r.revenue_potential,
     r.owner, r.last_contact, r.due_date,
     r.notes ?? '', r.deal_type ?? '', r.product_type ?? '', r.importance ?? '']
    .map(String).join(',')
  );
  fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');
}

// 새 리드 생성
export async function createLead(data: Omit<LeadRow, 'id'>): Promise<{ backend: DataBackend; id: number }> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert({ ...data, updated_at: new Date().toISOString() })
        .select('id')
        .single();
      if (!error && inserted) return { backend: 'supabase', id: (inserted as { id: number }).id };
    }
  }
  const existing = loadLeadsFromCsv();
  const newId = existing.length > 0 ? Math.max(...existing.map(r => r.id)) + 1 : 1;
  writeLeadsToCsv([...existing, { ...data, id: newId }]);
  return { backend: 'csv', id: newId };
}

// 리드 필드 업데이트
export async function updateLead(id: number, data: Partial<LeadRow>): Promise<{ backend: DataBackend }> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase
        .from('leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) return { backend: 'supabase' };
    }
  }
  const existing = loadLeadsFromCsv();
  writeLeadsToCsv(existing.map(r => r.id === id ? { ...r, ...data } : r));
  return { backend: 'csv' };
}

// 리드 삭제
export async function deleteLead(id: number): Promise<{ backend: DataBackend }> {
  if (hasSupabaseServerConfig()) {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) return { backend: 'supabase' };
    }
  }
  const existing = loadLeadsFromCsv();
  writeLeadsToCsv(existing.filter(r => r.id !== id));
  return { backend: 'csv' };
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
