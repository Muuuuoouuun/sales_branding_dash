import 'server-only';

import type { LeadSyncRow, RegionMetricRow } from '@/lib/server/salesData';

export interface NeoCrmFieldMapping {
  id: string;
  company: string;
  contact: string;
  region: string;
  stage: string;
  probability: string;
  revenue_potential: string;
  owner: string;
  last_contact: string;
  due_date: string;
  notes: string;
}

export interface NeoCrmMetricsMapping {
  region: string;
  revenue: string;
  target: string;
  deals_active: string;
  deals_closed: string;
}

export interface NeoCrmConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  leadsUrl: string;
  metricsUrl: string | null;
  accessToken: string | null;
  grantType: string;
  scope: string | null;
  timeoutMs: number;
  leadMapping: NeoCrmFieldMapping;
  metricsMapping: NeoCrmMetricsMapping;
}

export interface NeoCrmSyncSnapshot {
  leads: LeadSyncRow[];
  metrics: RegionMetricRow[];
  metadata: {
    usedStaticToken: boolean;
    leadCount: number;
    metricCount: number;
  };
}

const DEFAULT_LEAD_MAPPING: NeoCrmFieldMapping = {
  id: 'id',
  company: 'name',
  contact: 'contact_name',
  region: 'region',
  stage: 'stage',
  probability: 'probability',
  revenue_potential: 'amount',
  owner: 'owner_name',
  last_contact: 'last_contact_time',
  due_date: 'expected_close_date',
  notes: 'description',
};

const DEFAULT_METRICS_MAPPING: NeoCrmMetricsMapping = {
  region: 'region',
  revenue: 'revenue',
  target: 'target',
  deals_active: 'deals_active',
  deals_closed: 'deals_closed',
};

type UnknownRecord = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function getByPath(source: UnknownRecord, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as UnknownRecord)[segment];
  }, source);
}

function parseJsonEnv<T>(value: string | undefined, fallback: T): T {
  if (!value?.trim()) {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(value) as T) };
  } catch {
    return fallback;
  }
}

function parseCollection(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object');
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as UnknownRecord;
  const collectionKeys = ['records', 'items', 'list', 'data', 'result', 'value'];

  for (const key of collectionKeys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object');
    }
  }

  return [];
}

function normalizeDate(value: unknown): string | null {
  const stringValue = toStringValue(value);
  return stringValue || null;
}

export function getNeoCrmConfig(): NeoCrmConfig | null {
  const baseUrl = process.env.NEO_CRM_BASE_URL?.trim();
  const clientId = process.env.NEO_CRM_CLIENT_ID?.trim();
  const clientSecret = process.env.NEO_CRM_CLIENT_SECRET?.trim();
  const tokenUrl = process.env.NEO_CRM_TOKEN_URL?.trim();
  const leadsUrl = process.env.NEO_CRM_LEADS_URL?.trim();

  if (!baseUrl || !clientId || !clientSecret || !tokenUrl || !leadsUrl) {
    return null;
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    tokenUrl,
    leadsUrl,
    metricsUrl: process.env.NEO_CRM_METRICS_URL?.trim() || null,
    accessToken: process.env.NEO_CRM_ACCESS_TOKEN?.trim() || null,
    grantType: process.env.NEO_CRM_GRANT_TYPE?.trim() || 'client_credentials',
    scope: process.env.NEO_CRM_SCOPE?.trim() || null,
    timeoutMs: Number(process.env.NEO_CRM_TIMEOUT_MS ?? '15000'),
    leadMapping: parseJsonEnv(process.env.NEO_CRM_LEAD_MAPPING, DEFAULT_LEAD_MAPPING),
    metricsMapping: parseJsonEnv(process.env.NEO_CRM_METRICS_MAPPING, DEFAULT_METRICS_MAPPING),
  };
}

export function getNeoCrmSetupChecklist(): string[] {
  return [
    'NEO_CRM_BASE_URL',
    'NEO_CRM_CLIENT_ID',
    'NEO_CRM_CLIENT_SECRET',
    'NEO_CRM_TOKEN_URL',
    'NEO_CRM_LEADS_URL',
  ];
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Neo CRM request failed (${response.status}): ${body}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAccessToken(config: NeoCrmConfig): Promise<{
  accessToken: string;
  usedStaticToken: boolean;
}> {
  if (config.accessToken) {
    return {
      accessToken: config.accessToken,
      usedStaticToken: true,
    };
  }

  const body = new URLSearchParams({
    grant_type: config.grantType,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  if (config.scope) {
    body.set('scope', config.scope);
  }

  const payload = await requestJson(
    config.tokenUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
    config.timeoutMs,
  );

  if (!payload || typeof payload !== 'object') {
    throw new Error('Neo CRM token response is not a JSON object.');
  }

  const token = toStringValue(
    (payload as UnknownRecord).access_token ??
      (payload as UnknownRecord).accessToken ??
      (payload as UnknownRecord).token,
  );

  if (!token) {
    throw new Error('Neo CRM token response did not include an access token.');
  }

  return {
    accessToken: token,
    usedStaticToken: false,
  };
}

function normalizeLeadRecord(
  record: UnknownRecord,
  mapping: NeoCrmFieldMapping,
): LeadSyncRow | null {
  const externalId = toStringValue(getByPath(record, mapping.id));
  if (!externalId) {
    return null;
  }

  return {
    external_id: externalId,
    source_system: 'neo_crm',
    company: toStringValue(getByPath(record, mapping.company)),
    contact: toStringValue(getByPath(record, mapping.contact)),
    region: toStringValue(getByPath(record, mapping.region)),
    stage: toStringValue(getByPath(record, mapping.stage)) || 'Lead',
    probability: toNumber(getByPath(record, mapping.probability)),
    revenue_potential: toNumber(getByPath(record, mapping.revenue_potential)),
    owner: toStringValue(getByPath(record, mapping.owner)),
    last_contact: normalizeDate(getByPath(record, mapping.last_contact)),
    due_date: normalizeDate(getByPath(record, mapping.due_date)),
    notes: toStringValue(getByPath(record, mapping.notes)) || null,
    source_payload: record,
  };
}

function normalizeMetricsRecord(
  record: UnknownRecord,
  mapping: NeoCrmMetricsMapping,
): RegionMetricRow | null {
  const region = toStringValue(getByPath(record, mapping.region));
  if (!region) {
    return null;
  }

  return {
    name: region,
    revenue: toNumber(getByPath(record, mapping.revenue)),
    target: toNumber(getByPath(record, mapping.target)),
    deals_active: toNumber(getByPath(record, mapping.deals_active)),
    deals_closed: toNumber(getByPath(record, mapping.deals_closed)),
  };
}

export async function pullNeoCrmSnapshot(): Promise<NeoCrmSyncSnapshot> {
  const config = getNeoCrmConfig();
  if (!config) {
    throw new Error(`Neo CRM env is incomplete. Required keys: ${getNeoCrmSetupChecklist().join(', ')}`);
  }

  const { accessToken, usedStaticToken } = await resolveAccessToken(config);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  const leadsPayload = await requestJson(
    config.leadsUrl,
    {
      method: 'GET',
      headers: authHeaders,
    },
    config.timeoutMs,
  );

  const leads = parseCollection(leadsPayload)
    .map((record) => normalizeLeadRecord(record, config.leadMapping))
    .filter((record): record is LeadSyncRow => record !== null);

  let metrics: RegionMetricRow[] = [];

  if (config.metricsUrl) {
    const metricsPayload = await requestJson(
      config.metricsUrl,
      {
        method: 'GET',
        headers: authHeaders,
      },
      config.timeoutMs,
    );

    metrics = parseCollection(metricsPayload)
      .map((record) => normalizeMetricsRecord(record, config.metricsMapping))
      .filter((record): record is RegionMetricRow => record !== null);
  }

  return {
    leads,
    metrics,
    metadata: {
      usedStaticToken,
      leadCount: leads.length,
      metricCount: metrics.length,
    },
  };
}
