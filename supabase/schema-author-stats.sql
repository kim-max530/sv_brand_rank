-- Supabase SQL Editor에서 실행하세요.
-- 저자별 누적 클릭수 (자료보기)

create table if not exists public.author_stats (
  uid text primary key,
  total_clicks integer not null default 0 check (total_clicks >= 0),
  updated_at timestamptz not null default now()
);

alter table public.author_stats enable row level security;

-- 클라이언트 직접 접근 차단. 서버 secret key로만 읽고/씁니다.

create or replace function public.increment_author_clicks(p_uid text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_uid is null or length(trim(p_uid)) = 0 then
    raise exception 'uid required';
  end if;

  insert into public.author_stats (uid, total_clicks, updated_at)
  values (trim(p_uid), 1, now())
  on conflict (uid) do update
    set total_clicks = public.author_stats.total_clicks + 1,
        updated_at = now()
  returning total_clicks into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_author_clicks(text) from public;
grant execute on function public.increment_author_clicks(text) to service_role;
