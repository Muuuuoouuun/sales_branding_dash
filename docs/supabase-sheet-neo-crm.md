# Supabase, Spreadsheet, Neo CRM Plan

## Goal

Move the project from local CSV persistence to a Supabase-backed data layer while keeping CSV fallback during migration.

## Current source of truth

- `data/regions.csv` drives dashboard regional metrics
- `data/leads.csv` drives CRM pipeline views
- `localStorage` stores OKR overrides in the browser

## Target source of truth

- `sales` in Supabase for regional metrics
- `leads` in Supabase for CRM pipeline records
- `integration_connections` in Supabase for provider metadata and field mappings
- `sync_runs` in Supabase for operational sync history

## Connector strategy

- `Supabase`: operational database for the app
- `Google Sheets`: controlled spreadsheet import or scheduled sync
- `Neo CRM`: server-side adapter that normalizes CRM records into the app data model
- `REST API`: fallback adapter for middleware or internal ETL jobs

## Environment variables

### Required for Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Required for Google Sheets

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`

### Required for Neo CRM

- `NEO_CRM_BASE_URL`
- `NEO_CRM_CLIENT_ID`
- `NEO_CRM_CLIENT_SECRET`
- `NEO_CRM_TOKEN_URL`
- `NEO_CRM_LEADS_URL`

### Optional for Neo CRM

- `NEO_CRM_METRICS_URL`
- `NEO_CRM_ACCESS_TOKEN`
- `NEO_CRM_GRANT_TYPE`
- `NEO_CRM_SCOPE`
- `NEO_CRM_TIMEOUT_MS`
- `NEO_CRM_LEAD_MAPPING`
- `NEO_CRM_METRICS_MAPPING`

## Notes

- The codebase now prefers Supabase in server routes and falls back to CSV if the environment or tables are not ready.
- Neo CRM is treated as an Open API style enterprise CRM integration. The exact endpoint map and auth flow still depend on the tenant-specific developer documentation or internal API handbook.
- Neo CRM pull sync entry point lives at `/api/integrations/neo-crm/sync`.
- `POST /api/integrations/neo-crm/sync` accepts `{ "dryRun": true }` for non-persistent validation.
