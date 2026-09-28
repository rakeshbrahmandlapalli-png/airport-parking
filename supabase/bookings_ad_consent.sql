-- Applied via Supabase migration "bookings_ad_consent".
-- The customer's advertising-cookie choice, captured at checkout. Only
-- bookings with 'granted' are uploaded to Google Ads (UK GDPR / PECR and
-- Google's EU user consent policy). null = not known (older or admin-made).
alter table public.bookings add column if not exists ad_consent text
  check (ad_consent in ('granted','denied'));
