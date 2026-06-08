-- Add Kangaroo Parking, Platinum Parking, Simple Parking as Heathrow Meet & Greet providers.
-- Data (arrival/return instructions, address, phones, API token) is copied from OnPark Saver.
-- Safe to re-run: UPDATEs if the company already exists, INSERTs if it doesn't.

DO $$
DECLARE
  src RECORD;
  company_name TEXT;
BEGIN
  -- Pull everything we need from OnPark Saver
  SELECT
    api_token,
    on_arrival_lhr, on_return_lhr,
    on_arrival,     on_return,
    terminal_data,
    address,        postcode,
    map_url,
    phone_number,   phone_number_2,
    overview
  INTO src
  FROM companies
  WHERE name = 'OnPark Saver'
  LIMIT 1;

  IF src IS NULL THEN
    RAISE EXCEPTION 'OnPark Saver not found in companies table — check the exact name.';
  END IF;

  FOREACH company_name IN ARRAY ARRAY['Kangaroo Parking', 'Platinum Parking', 'Simple Parking']
  LOOP
    IF EXISTS (SELECT 1 FROM companies WHERE name = company_name) THEN
      -- Company exists — update fields only
      UPDATE companies SET
        category             = 'Meet & Greet',
        operates_at_heathrow = true,
        is_active            = true,
        api_token            = src.api_token,
        on_arrival_lhr       = src.on_arrival_lhr,
        on_return_lhr        = src.on_return_lhr,
        on_arrival           = src.on_arrival,
        on_return            = src.on_return,
        terminal_data        = src.terminal_data,
        address              = src.address,
        postcode             = src.postcode,
        map_url              = src.map_url,
        phone_number         = src.phone_number,
        phone_number_2       = src.phone_number_2,
        overview             = src.overview
      WHERE name = company_name;
      RAISE NOTICE 'Updated: %', company_name;
    ELSE
      -- Company doesn't exist — insert fresh row
      INSERT INTO companies (
        name,
        category,             operates_at_heathrow, operates_at_luton, is_active,
        api_token,
        on_arrival_lhr,       on_return_lhr,
        on_arrival,           on_return,
        terminal_data,
        address,              postcode,
        map_url,
        phone_number,         phone_number_2,
        overview
      ) VALUES (
        company_name,
        'Meet & Greet',       true,                 false,             true,
        src.api_token,
        src.on_arrival_lhr,   src.on_return_lhr,
        src.on_arrival,       src.on_return,
        src.terminal_data,
        src.address,          src.postcode,
        src.map_url,
        src.phone_number,     src.phone_number_2,
        src.overview
      );
      RAISE NOTICE 'Inserted: %', company_name;
    END IF;
  END LOOP;
END $$;
