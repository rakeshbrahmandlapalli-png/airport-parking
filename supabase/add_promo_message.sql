-- ============================================================================
-- PROMOTIONS — banner wording lives with the code
--
-- WHY
--   The promo bar's wording was hardcoded in components/PromoBanner.tsx, in a
--   lookup keyed on the code itself. Any code generated in Promo Manager that
--   was not in that list fell back to "Save X% on your next booking!", and
--   changing the wording meant a developer and a deploy.
--
--   This column puts the sentence next to the code that earns it, so Promo
--   Manager owns it end to end.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste → Run.
--   Idempotent: safe to re-run, and safe to run before or after the deploy —
--   the banner treats the column as optional.
-- ============================================================================

alter table public.promotions
  add column if not exists message text;

comment on column public.promotions.message is
  'Banner sentence shown on the public site. Blank falls back to "Save X% on your next booking!".';

-- Backfill the four that were hardcoded, so nothing changes wording on deploy.
-- Only fills blanks: re-running never overwrites something typed since.
update public.promotions set message = 'Returning Traveler? Get 15% off your 3rd booking!'
  where code = 'AERO15'   and (message is null or message = '');
update public.promotions set message = 'Launch Offer: Save 10% on your airport parking today!'
  where code = 'LAUNCH10' and (message is null or message = '');
update public.promotions set message = 'First time? Save 5% on your first booking!'
  where code = 'AERO5'    and (message is null or message = '');
update public.promotions set message = 'Exclusive member rate — 1% extra off every trip!'
  where code = 'AERO1'    and (message is null or message = '');

-- Check
select code, discount_percent, is_active, message
from public.promotions
order by is_active desc, code;
