import 'server-only';

import { hasSupabaseAdminConfig, hasSupabasePublicConfig } from '@/lib/supabase/config';

export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: 'database' | 'spreadsheet' | 'crm' | 'custom';
  ready: boolean;
  configuredWith: 'env' | 'database' | 'mixed';
  summary: string;
  requiredEnvKeys: string[];
}

function hasEnvKeys(keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export function getIntegrationStatuses(): IntegrationStatusItem[] {
  const googleSheetsKeys = [
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SHEETS_CLIENT_EMAIL',
    'GOOGLE_SHEETS_PRIVATE_KEY',
  ];

  const neoCrmKeys = [
    'NEO_CRM_BASE_URL',
    'NEO_CRM_CLIENT_ID',
    'NEO_CRM_CLIENT_SECRET',
    'NEO_CRM_TOKEN_URL',
    'NEO_CRM_LEADS_URL',
  ];

  const restKeys = ['CRM_SYNC_ENDPOINT', 'CRM_SYNC_TOKEN'];

  return [
    {
      id: 'supabase',
      name: 'Supabase',
      category: 'database',
      ready: hasSupabasePublicConfig() && hasSupabaseAdminConfig(),
      configuredWith: 'env',
      summary: hasSupabaseAdminConfig()
        ? 'Configured for read/write API routes.'
        : 'Missing public URL, anon key, or service role key.',
      requiredEnvKeys: [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      category: 'spreadsheet',
      ready: hasEnvKeys(googleSheetsKeys),
      configuredWith: 'env',
      summary: hasEnvKeys(googleSheetsKeys)
        ? 'Ready for sheet-driven imports and sync jobs.'
        : 'Waiting for spreadsheet ID and service-account credentials.',
      requiredEnvKeys: googleSheetsKeys,
    },
    {
      id: 'neo_crm',
      name: 'Neo CRM',
      category: 'crm',
      ready: hasEnvKeys(neoCrmKeys),
      configuredWith: 'env',
      summary: hasEnvKeys(neoCrmKeys)
        ? 'Ready for server-side CRM sync adapter wiring.'
        : 'Waiting for Neo CRM auth and lead-sync endpoint configuration.',
      requiredEnvKeys: neoCrmKeys,
    },
    {
      id: 'rest',
      name: 'REST API',
      category: 'custom',
      ready: hasEnvKeys(restKeys),
      configuredWith: 'env',
      summary: hasEnvKeys(restKeys)
        ? 'Ready for generic webhook or middleware sync.'
        : 'Waiting for endpoint and bearer token.',
      requiredEnvKeys: restKeys,
    },
  ];
}
