-- ============================================================================
-- AeroPark Direct — Row Level Security lockdown
-- ============================================================================
-- WHAT THIS DOES
--   The browser uses the PUBLIC anon key (it ships in the JS bundle), so the
--   ONLY thing protecting your database is Row Level Security. This script:
--     • Fully locks the `bookings` table from the public/anon key (PII).
--     • Locks the events/cache tables to the service role only.
--     • Keeps `companies` / `settings` / `promotions` publicly READABLE
--       (the public site needs them) but makes them WRITE-only for logged-in
--       admins — stopping price/promo tampering and stored-XSS injection.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   Safe to re-run (idempotent: it drops/recreates its own policies).
--
-- AFTER RUNNING — verify:
--   • Logged OUT, your live booking counter still works (served via /api/booking-count).
--   • The results/checkout pages still load companies + prices.
--   • Admin dashboard (logged in) still reads/writes bookings & companies.
--   • Logged OUT, you CANNOT read `bookings` directly with the anon key.
-- ============================================================================

-- Service-role (used by all your /api routes) BYPASSES RLS automatically, so
-- your server endpoints keep full access no matter what the policies say.

-- ─── BOOKINGS — most sensitive (names, emails, phones, plates, travel dates) ──
alter table public.bookings enable row level security;

drop policy if exists "anon read bookings"        on public.bookings;
drop policy if exists "public read bookings"       on public.bookings;
drop policy if exists "bookings select authenticated" on public.bookings;
drop policy if exists "bookings write authenticated"  on public.bookings;
drop policy if exists "bookings update authenticated" on public.bookings;
drop policy if exists "bookings delete authenticated" on public.bookings;

-- NO anon access at all. Only logged-in admins (authenticated) may read/manage,
-- and your server routes (service role) bypass RLS for the customer flows.
create policy "bookings select authenticated" on public.bookings
  for select to authenticated using (true);
create policy "bookings write authenticated" on public.bookings
  for insert to authenticated with check (true);
create policy "bookings update authenticated" on public.bookings
  for update to authenticated using (true) with check (true);
create policy "bookings delete authenticated" on public.bookings
  for delete to authenticated using (true);

-- OPTIONAL — restrict admin access to specific email(s) instead of any
-- authenticated user. Uncomment and edit, then drop the four policies above.
-- create policy "bookings admin only" on public.bookings
--   for all to authenticated
--   using ( (auth.jwt() ->> 'email') in ('info@aeroparkdirect.co.uk') )
--   with check ( (auth.jwt() ->> 'email') in ('info@aeroparkdirect.co.uk') );


-- ─── COMPANIES — public can READ (results/checkout); only admins WRITE ────────
alter table public.companies enable row level security;

drop policy if exists "companies public read"  on public.companies;
drop policy if exists "companies admin write"   on public.companies;
drop policy if exists "companies admin update"  on public.companies;
drop policy if exists "companies admin delete"  on public.companies;

create policy "companies public read" on public.companies
  for select to anon, authenticated using (true);
create policy "companies admin write" on public.companies
  for insert to authenticated with check (true);
create policy "companies admin update" on public.companies
  for update to authenticated using (true) with check (true);
create policy "companies admin delete" on public.companies
  for delete to authenticated using (true);


-- ─── SETTINGS — public READ (pricing config), admin WRITE ─────────────────────
alter table public.settings enable row level security;

drop policy if exists "settings public read" on public.settings;
drop policy if exists "settings admin write" on public.settings;
drop policy if exists "settings admin update" on public.settings;
drop policy if exists "settings admin delete" on public.settings;

create policy "settings public read" on public.settings
  for select to anon, authenticated using (true);
create policy "settings admin write" on public.settings
  for insert to authenticated with check (true);
create policy "settings admin update" on public.settings
  for update to authenticated using (true) with check (true);
create policy "settings admin delete" on public.settings
  for delete to authenticated using (true);


-- ─── PROMOTIONS — public READ (banner/checkout validation), admin WRITE ───────
alter table public.promotions enable row level security;

drop policy if exists "promotions public read" on public.promotions;
drop policy if exists "promotions admin write" on public.promotions;
drop policy if exists "promotions admin update" on public.promotions;
drop policy if exists "promotions admin delete" on public.promotions;

create policy "promotions public read" on public.promotions
  for select to anon, authenticated using (true);
create policy "promotions admin write" on public.promotions
  for insert to authenticated with check (true);
create policy "promotions admin update" on public.promotions
  for update to authenticated using (true) with check (true);
create policy "promotions admin delete" on public.promotions
  for delete to authenticated using (true);


-- ─── INTERNAL TABLES — service role ONLY (no anon, no authenticated) ──────────
-- RLS enabled with NO policies = everyone denied except service role (bypasses).
alter table public.processed_stripe_events enable row level security;

-- api_price_cache may not exist in every environment; guard it.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'api_price_cache') then
    execute 'alter table public.api_price_cache enable row level security';
  end if;
end $$;


-- ============================================================================
-- OPTIONAL — fully remove companies.api_token from the public key
-- ----------------------------------------------------------------------------
-- DONE IN CODE ALREADY: /api/parking-api now resolves the gateway token
-- server-side from the company id, so the browser no longer NEEDS the token.
-- The token is still readable in the public `companies` row, though. To remove
-- it from public reach entirely, move it into a service-role-only table.
--
-- This is OPTIONAL and low-impact (it's a price-lookup token, not payment/PII).
-- Run it only after confirming live pricing still works, and tell me so I can
-- point the admin pages (settings/companies) at the new table.
--
--   -- 1. Secrets table — service role only (RLS on, no policies = locked).
--   create table if not exists public.company_secrets (
--     company_id uuid primary key references public.companies(id) on delete cascade,
--     api_token  text
--   );
--   alter table public.company_secrets enable row level security;
--
--   -- 2. Migrate existing tokens across.
--   insert into public.company_secrets (company_id, api_token)
--     select id, api_token from public.companies
--     where api_token is not null and length(trim(api_token)) > 0
--     on conflict (company_id) do update set api_token = excluded.api_token;
--
--   -- 3. Expose a NON-secret flag the results page can use instead of the token.
--   alter table public.companies add column if not exists has_live_pricing boolean default false;
--   update public.companies
--     set has_live_pricing = (api_token is not null and length(trim(api_token)) > 0);
--
--   -- 4. After the admin pages + server routes read from company_secrets,
--   --    finally drop the public column:
--   --    alter table public.companies drop column api_token;
-- ============================================================================
