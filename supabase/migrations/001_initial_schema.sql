-- ============================================================
-- 1. LEADS (영업 파이프라인)
-- ============================================================
create table if not exists leads (
  id            bigserial primary key,
  company       text        not null,
  contact       text,
  region        text,
  stage         text        not null default 'Lead',
  -- Lead | Proposal | Negotiation | Contract | Closed
  probability   integer     check (probability between 0 and 100),
  revenue_potential bigint  default 0,
  owner         text,
  last_contact  date,
  due_date      date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 2. SALES (지역별 매출 실적)
-- ============================================================
create table if not exists sales (
  id            bigserial primary key,
  region        text        not null,
  revenue       bigint      not null default 0,
  target        bigint      not null default 0,
  deals_active  integer     default 0,
  deals_closed  integer     default 0,
  period        date        not null default date_trunc('month', now()),
  -- 월별 스냅샷용
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (region, period)
);

-- ============================================================
-- 3. ACTIVITY_LOGS (변경 이력 / 액션 로그)
-- ============================================================
create table if not exists activity_logs (
  id            bigserial primary key,
  table_name    text        not null,  -- 'leads' | 'sales' | 'system'
  record_id     bigint,
  action        text        not null,  -- 'create' | 'update' | 'delete' | 'view'
  actor         text,                  -- 담당자명 or 이메일
  payload       jsonb,                 -- 변경 전/후 데이터
  created_at    timestamptz not null default now()
);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

create trigger sales_updated_at
  before update on sales
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table leads         enable row level security;
alter table sales         enable row level security;
alter table activity_logs enable row level security;

-- leads: 인증된 사용자만 읽기/쓰기
create policy "leads_select" on leads for select using (auth.role() = 'authenticated');
create policy "leads_insert" on leads for insert with check (auth.role() = 'authenticated');
create policy "leads_update" on leads for update using (auth.role() = 'authenticated');
create policy "leads_delete" on leads for delete using (auth.role() = 'authenticated');

-- sales: 인증된 사용자만 읽기/쓰기
create policy "sales_select" on sales for select using (auth.role() = 'authenticated');
create policy "sales_insert" on sales for insert with check (auth.role() = 'authenticated');
create policy "sales_update" on sales for update using (auth.role() = 'authenticated');
create policy "sales_delete" on sales for delete using (auth.role() = 'authenticated');

-- activity_logs: 읽기만 허용 (쓰기는 service_role만)
create policy "logs_select" on activity_logs for select using (auth.role() = 'authenticated');
