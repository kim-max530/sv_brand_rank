-- Supabase SQL Editor에서 실행하세요.
-- 관리자: 저자별 추가 해시태그 (CSV record2에 병합)

create table if not exists public.author_hashtag_overrides (
  uid text primary key,
  tags text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.author_hashtag_overrides enable row level security;

-- 클라이언트 직접 접근 차단. 서버 secret key로만 읽고/씁니다.
