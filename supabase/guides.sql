-- Applied via Supabase migration "guides".
-- Help articles written in /admin/guides and shown at /guides/<slug>.
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  title text not null check (length(title) between 3 and 120),
  summary text not null default '' check (length(summary) <= 300),
  body text not null default '',
  airport text check (airport in ('LTN','LHR')),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists guides_published_idx on public.guides (status, published_at desc);

alter table public.guides enable row level security;
drop policy if exists "guides public read published" on public.guides;
create policy "guides public read published" on public.guides
  for select to anon, authenticated using (status = 'published');
-- Writes and draft reads go through /api/admin/guides (service role, admin-checked).
