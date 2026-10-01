-- OnPark Heathrow Park & Ride + Self Park: new prices from OnPark_Price_List-1 (30 Sep 2026).
-- Run once in Supabase > SQL Editor. Old prices are copied to companies_backup_20260930 first.
--
-- OnPark's list is not a straight line for days 1-8 (days 1-3 are one flat price), so the exact
-- day-by-day totals are stored in the new lhr_day_prices column and used as-is for days 1-30.
-- The day pivots are set to the same list so stays past day 30 carry on at the list's daily
-- rate (Self Park +£7.29/day, Park & Ride +£6.89/day).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS lhr_day_prices jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ltn_day_prices jsonb;

CREATE TABLE IF NOT EXISTS companies_backup_20260930 AS
  SELECT id, name, heathrow_price, lhr_day2_price, lhr_day5_price, lhr_day8_price, lhr_day11_price,
         lhr_day14_price, lhr_day17_price, lhr_day22_price, lhr_day32_price, lhr_day_prices
  FROM companies
  WHERE category = 'park-ride' AND name IN ('OnPark Self Park', 'OnPark Park & Ride');
ALTER TABLE companies_backup_20260930 ENABLE ROW LEVEL SECURITY;   -- no policies = nobody but you can read it

BEGIN;

-- OnPark Self Park
UPDATE companies SET
  heathrow_price  = 34.00,
  lhr_day2_price  = 34.00,
  lhr_day5_price  = 46.00,
  lhr_day8_price  = 66.29,
  lhr_day11_price = 91.14,
  lhr_day14_price = 116.00,
  lhr_day17_price = 137.86,
  lhr_day22_price = 174.29,
  lhr_day32_price = 247.14,
  lhr_day_prices  = '[34.00, 34.00, 34.00, 40.00, 46.00, 52.00, 58.00, 66.29, 74.57, 82.86, 91.14, 99.43, 107.71, 116.00, 123.29, 130.57, 137.86, 145.14, 152.43, 159.71, 167.00, 174.29, 181.57, 188.86, 196.14, 203.43, 210.71, 218.00, 225.29, 232.57]'::jsonb
WHERE category = 'park-ride' AND name = 'OnPark Self Park';

-- OnPark Park & Ride
UPDATE companies SET
  heathrow_price  = 32.00,
  lhr_day2_price  = 32.00,
  lhr_day5_price  = 42.00,
  lhr_day8_price  = 59.89,
  lhr_day11_price = 80.56,
  lhr_day14_price = 101.23,
  lhr_day17_price = 121.90,
  lhr_day22_price = 156.35,
  lhr_day32_price = 225.25,
  lhr_day_prices  = '[32.00, 32.00, 32.00, 37.00, 42.00, 48.00, 53.00, 59.89, 66.78, 73.67, 80.56, 87.45, 94.34, 101.23, 108.12, 115.01, 121.90, 128.79, 135.68, 142.57, 149.46, 156.35, 163.24, 170.13, 177.02, 183.91, 190.80, 197.69, 204.58, 211.47]'::jsonb
WHERE category = 'park-ride' AND name = 'OnPark Park & Ride';

COMMIT;

-- Check: 1 day, 4 days, 7 days, 14 days should read Self Park 34 / 40 / 58 / 116 and Park & Ride 32 / 37 / 53 / 101.23
SELECT name, lhr_day_prices->0 AS d1, lhr_day_prices->3 AS d4, lhr_day_prices->6 AS d7, lhr_day_prices->13 AS d14, lhr_day32_price
FROM companies WHERE category = 'park-ride' AND name IN ('OnPark Self Park', 'OnPark Park & Ride') ORDER BY name;

-- Undo (only if needed):
-- UPDATE companies c SET heathrow_price = b.heathrow_price, lhr_day2_price = b.lhr_day2_price, lhr_day5_price = b.lhr_day5_price,
--   lhr_day8_price = b.lhr_day8_price, lhr_day11_price = b.lhr_day11_price, lhr_day14_price = b.lhr_day14_price,
--   lhr_day17_price = b.lhr_day17_price, lhr_day22_price = b.lhr_day22_price, lhr_day32_price = b.lhr_day32_price,
--   lhr_day_prices = b.lhr_day_prices FROM companies_backup_20260930 b WHERE b.id = c.id;
