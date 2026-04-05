create table if not exists integration_connections (
  id bigserial primary key,
  provider text not null,
  label text not null,
  status text not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, label)
);

create table if not exists sync_runs (
  id bigserial primary key,
  connection_id bigint not null references integration_connections(id) on delete cascade,
  provider text not null,
  status text not null default 'queued',
  source text,
  rows_processed integer not null default 0,
  rows_failed integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create trigger integration_connections_updated_at
  before update on integration_connections
  for each row execute function update_updated_at();

alter table integration_connections enable row level security;
alter table sync_runs enable row level security;

create policy "integration_connections_select"
  on integration_connections for select
  using (auth.role() = 'authenticated');

create policy "integration_connections_insert"
  on integration_connections for insert
  with check (auth.role() = 'authenticated');

create policy "integration_connections_update"
  on integration_connections for update
  using (auth.role() = 'authenticated');

create policy "integration_connections_delete"
  on integration_connections for delete
  using (auth.role() = 'authenticated');

create policy "sync_runs_select"
  on sync_runs for select
  using (auth.role() = 'authenticated');

create policy "sync_runs_insert"
  on sync_runs for insert
  with check (auth.role() = 'authenticated');
