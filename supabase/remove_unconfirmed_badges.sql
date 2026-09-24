-- Remove the trust badges nobody confirmed.
--
-- Every operator's badges ("Fully Insured", "24/7 Security", "Fast Service",
-- "Valet Style Service", "Luggage Assistance", "Terminal Drop-Off", ...) came
-- from supabase/seed_reviews_and_badges.sql — assigned by category, not
-- confirmed by the operator. They are shown to customers as facts about real
-- businesses; "Fully Insured" on OnPark even contradicts OnPark's own policy.
--
-- Kept:
--   * OnPark Park & Ride and OnPark Self Park — written from OnPark's own
--     partner pack (20 Sep 2026), so they are confirmed. Not touched.
--   * AeroPark Exclusive — keeps "No Hidden Fees": covering the barrier and
--     drop-off fees is that product's own stated promise.
-- Reviews are NOT touched by this file.
--
-- "Free cancellation up to 24h before drop-off" is now added by the site
-- itself for every operator (AeroPark's own policy), so it is not needed here.

CREATE TABLE IF NOT EXISTS companies_badges_backup_20260924 AS
SELECT id, name, badges FROM companies;

UPDATE companies
SET badges = '[{"label": "No Hidden Fees", "category": "General"}]'
WHERE name = 'AeroPark Exclusive';

UPDATE companies
SET badges = '[]'
WHERE name NOT IN ('AeroPark Exclusive', 'OnPark Park & Ride', 'OnPark Self Park');

-- Check: what each operator now shows.
SELECT name, category, badges FROM companies ORDER BY name;
