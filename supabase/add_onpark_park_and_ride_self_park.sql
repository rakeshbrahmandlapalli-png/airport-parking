-- Adds two Heathrow Park & Ride operators from OnPark_Heathrow_Partner_Pack.pdf:
--   OnPark Park & Ride  (staff keep your key)
--   OnPark Self Park    (you keep your key, staff-allocated bay)
-- Both drop off at Sheraton Skyline Hotel, A4 Bath Road, Hayes, UB3 5BP.
-- Base prices are OnPark's 2026 list (pack p.6). Surcharge and modifier are left neutral.
-- Safe to run twice: a row is only inserted if that name does not already exist as Park & Ride.
-- Run once in Supabase > SQL Editor.

INSERT INTO companies (
  name, category, operates_at_heathrow, operates_at_luton, is_active,
  luton_price, heathrow_price,
  lhr_day2_price, lhr_day5_price, lhr_day8_price, lhr_day11_price, lhr_day14_price, lhr_day17_price, lhr_day22_price, lhr_day32_price,
  pricing_mode, price_modifier, dynamic_surcharge_percent, commission_rate,
  is_sold_out, lhr_sold_out, ltn_sold_out, is_recommended, is_featured, lhr_featured, ltn_featured,
  address, postcode, map_url, map_location,
  phone_number, phone_number_2, email, logo_url,
  terminal_data, badges, lhr_fees_note,
  overview, on_arrival_lhr, on_return_lhr
)
SELECT
  'OnPark Park & Ride', 'park-ride', true, false, true,
  0, 34.99,
  34.99, 46.99, 64.99, 82.99, 100.99, 115.99, 140.99, 190.99,
  'pivot', 1, 0, 30,
  false, false, false, false, false, false, false,
  'Sheraton Skyline Hotel London Heathrow, A4 Bath Road, Hayes', 'UB3 5BP', '', 'Sheraton Skyline Hotel, Hayes',
  '07762569061', '07762569062', 'onparkbookings@gmail.com', '/logos/onpark-saver.jpg',
  $j${"T2":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T3":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T4":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T5":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"}}$j$,
  $j$[{"label":"Free Cancellation","category":"General"},{"label":"CCTV Monitored","category":"General"},{"label":"Staff Meet You at Drop-off","category":"Park & Ride"},{"label":"Photo Vehicle Check","category":"Park & Ride"}]$j$,
  'Transfer to the terminal is not included: use Hotel Hoppa or a local bus. An OnPark private transfer, if available, is £12.99 each way, payable before drop-off or pick-up.',
  $o$<b>OnPark Park & Ride</b><br/><br/>
Drive to the Sheraton Skyline Hotel on the A4 Bath Road, Hayes. A member of the OnPark team meets you, helps with your luggage and checks your vehicle with photographs. They keep your key for the whole of your stay. From the hotel you travel to your terminal by Hotel Hoppa or local bus.<br/><br/>
<b>Key Features:</b><br/>
• Staff meet you at drop-off<br/>
• Photographed vehicle condition check<br/>
• 24/7 CCTV monitoring of the car park<br/>
• DBS-checked drivers<br/>
• Incoming flights are monitored, so early, delayed or cancelled flights are taken into account<br/><br/>
<b>Important Notes:</b><br/>
• Getting to the terminal is not included. Hotel Hoppa or local buses run from the hotel area. An OnPark private transfer may be available but is not guaranteed; if used it is £12.99 each way per booking.<br/>
• Make sure you have another way to reach the terminal.<br/>
• Number plate recognition (ANPR) may record vehicles entering and leaving the car park.$o$,
  $o$<b>VEHICLE DROP-OFF</b><br/><br/>
1. Call the operations team on the contact numbers given with your booking when you are about 30 minutes from the drop-off location.<br/>
2. Drive to Sheraton Heathrow / Sheraton Skyline Hotel, A4 Bath Road, Harlington, Hayes, UB3 5BP.<br/>
3. A member of staff will meet you, help with your luggage, confirm your return details and complete a vehicle condition check with photographs.<br/>
4. Hand your key to the OnPark team. They hold it for the duration of your stay. If you would rather keep your key, ask about the Self Park option; additional charges may apply.<br/>
5. If you expect to arrive earlier or later than your booked time, please tell the operations team.<br/><br/>
<b>GETTING TO YOUR TERMINAL</b><br/><br/>
Hotel Hoppa runs to every terminal from the Marriott stop, or you can use public transport from the bus stops on Bath Road:<br/>
• Terminal 5: bus 423 from Harlington Corner (Stop J), about 15 minutes.<br/>
• Terminal 4: bus 285 from New Road Harlington (Stop D), then the Piccadilly line from Hatton Cross, about 20 minutes.<br/>
• Terminals 2 and 3: buses 278, 111, 275 or SL9 from Harlington Corner (Stop J), about 15 minutes.<br/>
A private OnPark transfer may be available but is not guaranteed. If used, it is £12.99 each way per booking, payable before drop-off or pick-up.$o$,
  $o$<b>VEHICLE COLLECTION</b><br/><br/>
1. Call the operations team on the contact numbers given with your booking when your plane lands and speak to them so your vehicle can be prepared.<br/>
2. After you have collected all your baggage, call again.<br/>
3. Your vehicle will be ready at Sheraton Heathrow / Sheraton Skyline Hotel, A4 Bath Road, Harlington, Hayes, UB3 5BP.<br/><br/>
OnPark monitors incoming flights, so if your flight is early, delayed or cancelled they will already know.$o$
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'OnPark Park & Ride' AND category = 'park-ride');

INSERT INTO companies (
  name, category, operates_at_heathrow, operates_at_luton, is_active,
  luton_price, heathrow_price,
  lhr_day2_price, lhr_day5_price, lhr_day8_price, lhr_day11_price, lhr_day14_price, lhr_day17_price, lhr_day22_price, lhr_day32_price,
  pricing_mode, price_modifier, dynamic_surcharge_percent, commission_rate,
  is_sold_out, lhr_sold_out, ltn_sold_out, is_recommended, is_featured, lhr_featured, ltn_featured,
  address, postcode, map_url, map_location,
  phone_number, phone_number_2, email, logo_url,
  terminal_data, badges, lhr_fees_note,
  overview, on_arrival_lhr, on_return_lhr
)
SELECT
  'OnPark Self Park', 'park-ride', true, false, true,
  0, 47.99,
  47.99, 63.99, 86.99, 107.99, 128.99, 146.99, 175.99, 225.99,
  'pivot', 1, 0, 30,
  false, false, false, false, false, false, false,
  'Sheraton Skyline Hotel London Heathrow, A4 Bath Road, Hayes', 'UB3 5BP', '', 'Sheraton Skyline Hotel, Hayes',
  '07762569061', '07762569062', 'onparkbookings@gmail.com', '/logos/onpark-saver.jpg',
  $j${"T2":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T3":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T4":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"},"T5":{"address":"Sheraton Skyline Hotel, A4 Bath Road, Hayes","map_url":"","postcode":"UB3 5BP"}}$j$,
  $j$[{"label":"Free Cancellation","category":"General"},{"label":"CCTV Monitored","category":"General"},{"label":"Keep Your Keys","category":"Park & Ride"},{"label":"Allocated Bay","category":"Park & Ride"}]$j$,
  'Transfer to the terminal is not included: use Hotel Hoppa or a local bus. An OnPark private transfer, if available, is £12.99 each way, payable before drop-off or pick-up.',
  $o$<b>OnPark Self Park</b><br/><br/>
Drive to the Sheraton Skyline Hotel on the A4 Bath Road, Hayes. Staff meet you, check your vehicle with photographs and show you to your allocated bay. You lock the car and keep your keys for the whole trip. From the hotel you travel to your terminal by Hotel Hoppa or local bus.<br/><br/>
<b>Key Features:</b><br/>
• You keep your keys<br/>
• Photographed vehicle condition check at drop-off<br/>
• Your own allocated bay<br/>
• 24/7 CCTV monitoring of the car park<br/>
• Incoming flights are monitored, so early, delayed or cancelled flights are taken into account<br/><br/>
<b>Important Notes:</b><br/>
• Park only in the bay staff allocate to you. Parking in another bay or outside the bay area may result in a Penalty Charge Notice.<br/>
• Getting to the terminal is not included. Hotel Hoppa or local buses run from the hotel area. An OnPark private transfer may be available but is not guaranteed; if used it is £12.99 each way per booking.<br/>
• Make sure you have another way to reach the terminal.<br/>
• Number plate recognition (ANPR) may record vehicles entering and leaving the car park.$o$,
  $o$<b>VEHICLE DROP-OFF</b><br/><br/>
1. Call the operations team on the contact numbers given with your booking when you are about 30 minutes from the drop-off location.<br/>
2. Drive to Sheraton Heathrow / Sheraton Skyline Hotel, A4 Bath Road, Harlington, Hayes, UB3 5BP.<br/>
3. A member of staff will meet you, help with your luggage, confirm your return details and complete a vehicle condition check with photographs.<br/>
4. Park only in the bay staff allocate to you. Do not park in another bay or outside the bay area.<br/>
5. Lock your vehicle and keep your keys with you for the duration of your booking.<br/>
6. If you expect to arrive earlier or later than your booked time, please tell the operations team.<br/><br/>
<b>BEFORE YOU LEAVE THE CAR</b><br/><br/>
• Have your booking confirmation ready.<br/>
• Make sure the vehicle is locked, the parking brake is on, and the ignition and lights are off.<br/>
• Keep any EV charging cables or cards with you if they apply.<br/>
• If you cannot find a member of staff, call the operations team.<br/><br/>
<b>GETTING TO YOUR TERMINAL</b><br/><br/>
Hotel Hoppa runs to every terminal from the Marriott stop, or you can use public transport from the bus stops on Bath Road:<br/>
• Terminal 5: bus 423 from Harlington Corner (Stop J), about 15 minutes.<br/>
• Terminal 4: bus 285 from New Road Harlington (Stop D), then the Piccadilly line from Hatton Cross, about 20 minutes.<br/>
• Terminals 2 and 3: buses 278, 111, 275 or SL9 from Harlington Corner (Stop J), about 15 minutes.<br/>
A private OnPark transfer may be available but is not guaranteed. If used, it is £12.99 each way per booking.$o$,
  $o$<b>VEHICLE COLLECTION</b><br/><br/>
Return to the collection point at Sheraton Heathrow / Sheraton Skyline Hotel, A4 Bath Road, Harlington, Hayes, UB3 5BP and collect your vehicle.<br/><br/>
OnPark monitors incoming flights, so if your flight is early, delayed or cancelled they will already know.$o$
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'OnPark Self Park' AND category = 'park-ride');

-- Check: two new rows, park-ride, Heathrow only, with the OnPark numbers
SELECT name, category, operates_at_heathrow, operates_at_luton, is_active, heathrow_price, lhr_day2_price, lhr_day5_price, lhr_day8_price, lhr_day11_price, lhr_day14_price, lhr_day17_price, lhr_day22_price, lhr_day32_price, phone_number, email
FROM companies WHERE name IN ('OnPark Park & Ride', 'OnPark Self Park');

-- Undo (only if needed): DELETE FROM companies WHERE name IN ('OnPark Park & Ride', 'OnPark Self Park') AND category = 'park-ride';
