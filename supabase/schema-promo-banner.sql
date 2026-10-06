-- Supabase SQL Editor에서 실행하세요.
-- 메인/태그 페이지 프로모 배너 (싱글톤)

create table if not exists public.promo_banners (
  id text primary key default 'default',
  title text not null default '',
  button_text text not null default '',
  button_url text not null default '',
  show_brand boolean not null default true,
  show_recommend boolean not null default true,
  show_hashtag_tab boolean not null default true,
  show_hashtag_list boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.promo_banners enable row level security;

-- 서버 secret key로만 읽기/쓰기 (RLS: 공개 정책 없음)

insert into public.promo_banners (
  id,
  title,
  button_text,
  button_url,
  show_brand,
  show_recommend,
  show_hashtag_tab,
  show_hashtag_list
)
values (
  'default',
  '중간고사 대비 자료, 더 좋은 자료는 없을지 고민되시나요? 쏠북 가입하고 전문 브랜드를 만나보세요.',
  '중간고사 직전 자료 찾기',
  'https://solvook.com',
  true,
  true,
  true,
  true
)
on conflict (id) do nothing;
