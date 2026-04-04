import 'server-only';

import { hasSupabaseAdminConfig, hasSupabasePublicConfig } from '@/lib/supabase/config';
import { hasGoogleSheetsConfig } from '@/lib/server/googleSheets';

export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: 'database' | 'spreadsheet' | 'crm' | 'custom';
  ready: boolean;
  configuredWith: 'env' | 'database' | 'mixed';
  summary: string;
  requiredEnvKeys: string[];
  missingEnvKeys: string[];
}

function getMissingEnvKeys(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim());
}

export function getIntegrationStatuses(): IntegrationStatusItem[] {
  const supabaseKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

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

  const supabaseMissing = getMissingEnvKeys(supabaseKeys);
  const googleSheetsMissing = getMissingEnvKeys(googleSheetsKeys);
  const neoCrmMissing = getMissingEnvKeys(neoCrmKeys);
  const restMissing = getMissingEnvKeys(restKeys);
  const googleSheetsReady = hasGoogleSheetsConfig();

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
      requiredEnvKeys: supabaseKeys,
      missingEnvKeys: supabaseMissing,
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      category: 'spreadsheet',
      ready: googleSheetsReady,
      configuredWith: 'env',
      summary: googleSheetsReady
        ? 'Ready for sheet-driven imports and sync jobs.'
        : 'Waiting for spreadsheet ID and service-account credentials.',
      requiredEnvKeys: googleSheetsKeys,
      missingEnvKeys: googleSheetsReady ? [] : googleSheetsMissing,
    },
    {
      id: 'neo_crm',
      name: 'Neo CRM',
      category: 'crm',
      ready: neoCrmMissing.length === 0,
      configuredWith: 'env',
      summary: neoCrmMissing.length === 0
        ? 'Ready for server-side CRM sync adapter wiring.'
        : 'Waiting for Neo CRM auth and lead-sync endpoint configuration.',
      requiredEnvKeys: neoCrmKeys,
      missingEnvKeys: neoCrmMissing,
    },
    {
      id: 'rest',
      name: 'REST API',
      category: 'custom',
      ready: restMissing.length === 0,
      configuredWith: 'env',
      summary: restMissing.length === 0
        ? 'Ready for generic webhook or middleware sync.'
        : 'Waiting for endpoint and bearer token.',
      requiredEnvKeys: restKeys,
      missingEnvKeys: restMissing,
    },
  ];
}
