-- Supabase SQL Editor에서 실행하세요.
-- 해시태그 설명·숨김(삭제) 메타데이터 — brand_info 재업로드와 무관하게 영구 보존

create table if not exists public.hashtag_metadata (
  tag text primary key,
  description text not null default '',
  is_hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.hashtag_metadata enable row level security;

-- 클라이언트 직접 접근 차단. 서버 secret key로만 읽고/씁니다.
