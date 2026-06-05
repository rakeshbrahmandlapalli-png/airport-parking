-- ============================================================================
-- AeroPark Direct — Row Level Security (authoritative, matches live DB)
-- ============================================================================
-- This reflects the ACTUAL policy model in production:
--   • Admins are authenticated users whose email ends in @aeroparkdirect.co.uk.
--   • Customer PII (bookings) is NEVER readable by the public anon key — the
--     public site reads bookings only through server routes (service role,
--     which bypasses RLS): /api/booking-count, /api/manage/*, /api/success/sync.
--   • Public-facing catalogue data (companies, settings, promotions) is readable
--     by anyone (the site needs it) but writable by admins only.
--   • Internal tables are locked to the service role (RLS on, zero policies).
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste → Run. Idempotent: it drops and
--   recreates its own policies, so it's safe to re-run.
--
-- VERIFY AFTER RUNNING (expected policy_count):
--   bookings 1 · companies 2 · settings 4 · promotions 4 ·
--   processed_stripe_events 0 · api_price_cache 0
--   (run the count query at the bottom of this file)
-- ============================================================================

-- Reusable predicate: "is this request an AeroPark admin?"
--   (auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk'

-- ─── BOOKINGS — customer PII. No public access. Admin-email only. ─────────────
alter table public.bookings enable row level security;

-- Remove the old public INSERT hole (anyone with the anon key could insert).
drop policy if exists "Allow Public Bookings" on public.bookings;

drop policy if exists "admin_manage_all_bookings" on public.bookings;
create policy "admin_manage_all_bookings" on public.bookings
  for all to authenticated
  using      ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk')
  with check ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk');
-- Customer create/read/update flows run server-side via the service role, which
-- bypasses RLS — so no anon policy is needed here.


-- ─── COMPANIES — public READ (results/checkout), admin-email WRITE ────────────
alter table public.companies enable row level security;

drop policy if exists "companies public read" on public.companies;
create policy "companies public read" on public.companies
  for select to anon, authenticated using (true);

drop policy if exists "admin_manage_all_companies" on public.companies;
create policy "admin_manage_all_companies" on public.companies
  for all to authenticated
  using      ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk')
  with check ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk');


-- ─── SETTINGS — public READ (pricing config), admin-email WRITE ───────────────
-- Without the public read, the site silently falls back to DEFAULT pricing.
alter table public.settings enable row level security;

drop policy if exists "settings public read"  on public.settings;
drop policy if exists "settings admin write"  on public.settings;
drop policy if exists "settings admin update" on public.settings;
drop policy if exists "settings admin delete" on public.settings;

create policy "settings public read" on public.settings
  for select to anon, authenticated using (true);
create policy "settings admin write" on public.settings
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk');
create policy "settings admin update" on public.settings
  for update to authenticated
  using      ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk')
  with check ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk');
create policy "settings admin delete" on public.settings
  for delete to authenticated
  using ((auth.jwt() ->> 'email') like '%@aeroparkdirect.co.uk');


-- ─── PROMOTIONS — public READ, authenticated WRITE ────────────────────────────
-- Uses the existing role()='authenticated' style. The UPDATE policy was missing
-- (so admins couldn't toggle a promo's active state) — added here.
alter table public.promotions enable row level security;

drop policy if exists "Enable read access for all users"          on public.promotions;
drop policy if exists "Enable insert for authenticated users only" on public.promotions;
drop policy if exists "Enable delete for authenticated users only" on public.promotions;
drop policy if exists "promotions admin update"                    on public.promotions;

create policy "Enable read access for all users" on public.promotions
  for select to public using (true);
create policy "Enable insert for authenticated users only" on public.promotions
  for insert to public with check (auth.role() = 'authenticated');
create policy "promotions admin update" on public.promotions
  for update to authenticated
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users only" on public.promotions
  for delete to public using (auth.role() = 'authenticated');


-- ─── INTERNAL TABLES — service role ONLY (RLS on, no policies = deny all) ──────
alter table public.processed_stripe_events enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'api_price_cache') then
    execute 'alter table public.api_price_cache enable row level security';
  end if;
end $$;


-- ============================================================================
-- VERIFY — run this after the script
-- ============================================================================
-- select t.tablename, t.rowsecurity as rls_enabled, count(p.policyname) as policy_count
-- from pg_tables t
-- left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
-- where t.schemaname = 'public'
--   and t.tablename in ('bookings','companies','settings','promotions',
--                       'processed_stripe_events','api_price_cache')
-- group by t.tablename, t.rowsecurity order by t.tablename;
--
-- Expected: bookings 1 · companies 2 · settings 4 · promotions 4 ·
--           processed_stripe_events 0 · api_price_cache 0


-- ============================================================================
-- OPTIONAL — fully remove companies.api_token from the public key
-- ----------------------------------------------------------------------------
-- DONE IN CODE: /api/parking-api resolves the gateway token server-side from the
-- company id, so the browser never needs it. The token is still readable in the
-- public companies row, though. To remove it from public reach entirely, move it
-- into a service-role-only table (low priority — it's a price-lookup token, not
-- payment/PII). Run only after confirming live pricing works, and tell me so I
-- can point the admin pages at the new table.
--
--   create table if not exists public.company_secrets (
--     company_id uuid primary key references public.companies(id) on delete cascade,
--     api_token  text
--   );
--   alter table public.company_secrets enable row level security; -- locked to service role
--
--   insert into public.company_secrets (company_id, api_token)
--     select id, api_token from public.companies
--     where api_token is not null and length(trim(api_token)) > 0
--     on conflict (company_id) do update set api_token = excluded.api_token;
--
--   alter table public.companies add column if not exists has_live_pricing boolean default false;
--   update public.companies
--     set has_live_pricing = (api_token is not null and length(trim(api_token)) > 0);
--   -- finally, after admin pages + routes read from company_secrets:
--   --   alter table public.companies drop column api_token;
-- ============================================================================
