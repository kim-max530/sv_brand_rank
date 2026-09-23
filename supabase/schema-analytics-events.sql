-- Supabase SQL Editor에서 실행하세요.
-- 애널리틱스 / 저자 이벤트 테이블 + anon insert 정책

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  target_name text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type);

alter table public.analytics_events enable row level security;

drop policy if exists "anon_insert_analytics_events" on public.analytics_events;
create policy "anon_insert_analytics_events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (true);

-- 대시보드 조회는 서버 secret key(RLS bypass)로 처리합니다.
-- 필요 시 service_role만 select 하도록 정책을 추가해도 됩니다.

create table if not exists public.author_events (
  uid text primary key,
  author_name text not null,
  start_date date not null,
  end_date date not null,
  updated_at timestamptz not null default now()
);

alter table public.author_events enable row level security;

-- 클라이언트 직접 접근 차단. 서버 secret key로만 읽고/씁니다.
