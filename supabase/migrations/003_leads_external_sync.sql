alter table leads
  add column if not exists external_id text,
  add column if not exists source_system text,
  add column if not exists source_payload jsonb,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists leads_source_system_external_id_idx
  on leads (source_system, external_id)
  where source_system is not null and external_id is not null;
