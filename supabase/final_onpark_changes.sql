-- FINAL OnPark set-up. Run this INSTEAD of revert_extra_onpark_changes.sql.
-- It works from wherever the database is now, using the backup made by the first file (companies_backup_20260919).
--
--   OnPark Saver           keeps: new phone numbers + Terminal 4 location. Fees note and fee sentence back to the old wording.
--   OnPark Premium         keeps: new phone numbers, Terminal 4 / location fixes, onparkbookings@gmail.com. Fees note back to the old wording.
--   Kangaroo, Platinum, Simple, OnePark Premium Plus:  EVERYTHING back to the old details (numbers, Terminal 4, email, all of it).
--   OnPark Park & Ride / Self Park:  added by add_onpark_park_and_ride_self_park.sql (separate file).
--
-- Run once in Supabase > SQL Editor.

BEGIN;

-- 1. These four keep every old detail
UPDATE companies c
SET phone_number   = b.phone_number,
    phone_number_2 = b.phone_number_2,
    on_arrival_lhr = b.on_arrival_lhr,
    on_return_lhr  = b.on_return_lhr,
    lhr_fees_note  = b.lhr_fees_note,
    terminal_data  = b.terminal_data,
    email          = b.email,
    address        = b.address,
    postcode       = b.postcode,
    map_url        = b.map_url,
    map_location   = b.map_location
FROM companies_backup_20260919 b
WHERE b.id = c.id
  AND c.name IN ('Kangaroo Parking', 'Platinum Parking', 'Simple Parking', 'OnePark Premium Plus');

-- 2. Saver and Premium: fees note back to what it was
UPDATE companies c
SET lhr_fees_note = b.lhr_fees_note
FROM companies_backup_20260919 b
WHERE b.id = c.id
  AND c.name IN ('OnPark Saver', 'OnPark Premium');

-- 3. Saver: the fee sentence in the drop-off instructions back to the old wording (Terminal 4 fix stays)
UPDATE companies
SET on_arrival_lhr = replace(
      on_arrival_lhr,
      'Not Included in your booking price. You Must Pay',
      'Not Included in your booking price for Saver and Premium Services. It is Only Included for Premium Plus Service. You Must Pay')
WHERE name = 'OnPark Saver';

COMMIT;

-- Check. Expected:
--   OnPark Saver / OnPark Premium: 07762569061 / 07762569062, t4_postcode TW6 3XL, fees note "Drop-off / ULEZ charge not included"
--   the other four: their OLD numbers (07479259475 / 07519731761), t4_postcode TW6 3XA, their old email
SELECT name, phone_number, phone_number_2, email, lhr_fees_note,
       terminal_data->'T4'->>'postcode' AS t4_postcode,
       on_arrival_lhr LIKE '%for Saver and Premium Services%' AS old_fee_sentence
FROM companies
WHERE name IN ('OnPark Saver', 'OnPark Premium', 'Kangaroo Parking', 'Platinum Parking', 'Simple Parking', 'OnePark Premium Plus')
ORDER BY name;
