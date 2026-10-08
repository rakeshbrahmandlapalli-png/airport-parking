# Pending: OnPark Heathrow Park & Ride + Self Park price update

Status (8 Oct 2026): code pushed on branch `ccr-db58c064-ner1bs`, SQL **not yet run**, no PR yet.

## What's done
- `app/lib/pricing.ts`: optional exact day-by-day price list (`lhr_day_prices` / `ltn_day_prices`,
  JSON array, index 0 = 1 day). Used before the pivots; longer stays fall back to the pivots.
- `app/airport-parking-price-guide/page.tsx`: selects `*` so the guide sees the new column.
- `supabase/update_onpark_heathrow_park_ride_prices_2026-09-30.sql`: adds the columns, backs up old
  prices to `companies_backup_20260930`, sets exact prices for days 1-30 from OnPark_Price_List-1.
  Only touches `OnPark Self Park` and `OnPark Park & Ride` (category `park-ride`). Nothing else changes.

## Still to do
1. Run the SQL file against the **website's** Supabase project.
   - NOT `oioqjfrlwrjovnouhusp` ("Ops"): that is the staff/operations app (tables staff, flight_runs,
     timetable…), with no price columns. The website's project ID is in the host's
     `NEXT_PUBLIC_SUPABASE_URL`.
   - Before running, confirm `companies` has `heathrow_price`, `category` and the two OnPark rows.
   - After running, the check query at the bottom should show Self Park 34 / 40 / 58 / 116 and
     Park & Ride 32 / 37 / 53 / 101.23 for 1 / 4 / 7 / 14 days.
2. Open a PR to merge `ccr-db58c064-ner1bs` so the pricing code goes live (needed for exact
   days 3, 4, 6, 7).
3. Delete this file once both are done.
