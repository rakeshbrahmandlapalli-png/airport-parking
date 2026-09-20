-- ALREADY RUN on 20 Sep. DO NOT RUN AGAIN: it would put back the fees note and Premium changes you asked to undo.
-- OnPark Heathrow operators: brought in line with OnPark_Heathrow_Partner_Pack.pdf (19 Sep 2026).
-- Run once in Supabase > SQL Editor. Old values are copied to companies_backup_20260919 first (no api_token in it).

CREATE TABLE IF NOT EXISTS companies_backup_20260919 AS
  SELECT id, name, updated_at, phone_number, phone_number_2, on_arrival_lhr, lhr_fees_note, terminal_data, email, address, postcode, map_url, map_location, on_return_lhr FROM companies
  WHERE name IN ('OnPark Saver', 'OnPark Premium', 'Kangaroo Parking', 'Platinum Parking', 'Simple Parking', 'OnePark Premium Plus');
ALTER TABLE companies_backup_20260919 ENABLE ROW LEVEL SECURITY;   -- no policies = nobody but you can read it

BEGIN;

-- OnPark Saver
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>VEHICLE DROP OFF PROCEDURE</b><br/><br/>
Please call the dispatch number provided in your confirmation email when you are 20 mins away from the departing terminal. A driver will meet you at your departing terminal, at the pre-booked time, where he will assist with your luggage, confirm your return details, and together with the driver you will check the condition of the car and take pictures of your car to enter our system. If you are expecting to be earlier or later than the pre-booked time, we strongly recommend that you inform a member of staff.<br/><br/>
<b>Terminal 2 (TW6 1EW):</b> Follow signs to Terminal 2 short stay car park. Do not go to the Onpark office or any other car park. As you approach the ramp, stay in the far right hand lane, follow signs for Level 4 "Off airport parking" and drive and park your car in <b>Row B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 3 (TW6 1QG):</b> Follow signs to Terminal 3 short stay car park. Enter the Short-Stay Car-park and follow signs for Level 4 "Off airport parking". Park your car in <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 4 (TW6 3XL):</b> Follow signs to Terminal 4 Long Stay car park. Enter the Long Stay car park and follow signs for <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 5 (TW6 2GA):</b> Follow signs to Terminal 5 short stay car park. Take the far left side lane to enter Level 4 "Off airport parking". Park your car in <b>Row R or S</b>. Driver will meet you there.<br/><br/>
💰 <b>Important Payment Information:</b><br/>
The Short-Stay Parking Fee at Heathrow is Not Included in your booking price. You Must Pay This Fee Yourself Upon Entering And Exiting The Car Park. The Current Charge For Up To 30 Minutes Is £8 (Subject To Change By Heathrow Airport) Each Way. Please Check The Payment Machines For The Latest Tariff. Your Booking Covers Our Meet & Greet Service Only. All Airport-Imposed Charges Are The Customer's Responsibility.<br/><br/>
ℹ️ <b>Important Reminders:</b><br/>
• <b>Have Ready:</b> Your Booking Confirmation, Vehicle Keys, Vehicle Starting Options, Payment Method For The Car Park Fee.<br/>
• Remove All Valuables From your Vehicle before handing it over.<br/>
• Do Not Leave Your Vehicle Unattended. Wait for Our Driver To Meet You.<br/>
• Booking Cancellation/Amendments Need To Inform Us Via Email (cs@onpark.co.uk) 5 Days Before You Drop Off Your Car.$onpark$,
  lhr_fees_note = $onpark$Heathrow terminal car park fee not included: currently £8 each way (up to 30 mins), paid to the airport. ULEZ charge, if applicable, not included.$onpark$,
  terminal_data = $onpark${"T2":{"address":"Terminal 2 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1EW"},"T3":{"address":"Terminal 3 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1QG"},"T4":{"address":"Terminal 4 Long Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 3XL"},"T5":{"address":"Terminal 5 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 2GA"}}$onpark$
WHERE id = '2cb8f858-45c8-4d16-9fe5-99ad659afc79';

-- OnPark Premium
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>VEHICLE DROP OFF PROCEDURE</b><br/><br/>
Please call the dispatch number provided in your booking confirmation email when you are 20 mins away from the departing terminal. A driver will meet you at your departing terminal, at the pre-booked time, where he will assist with your luggage, confirm your return details, and together with the driver you will check the condition of the car and take pictures of your car to enter our system. If you are expecting to be earlier or later than the pre-booked time, we strongly recommend that you inform a member of staff.<br/><br/>
<b>Terminal 2 (TW6 1EW):</b> Follow signs to Terminal 2 short stay car park. Do not go to the Onpark office or any other car park. As you approach the ramp, stay in the far right hand lane, follow signs for Level 4 "Off airport parking" and drive and park your car in <b>Row B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 3 (TW6 1QG):</b> Follow signs to Terminal 3 short stay car park. Enter the Short-Stay Car-park and follow signs for Level 4 "Off airport parking". Park your car in <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 4 (TW6 3XL):</b> Follow signs to Terminal 4 Long Stay car park. Enter the Long Stay car park and follow signs for <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 5 (TW6 2GA):</b> Follow signs to Terminal 5 short stay car park. Take the far left side lane to enter Level 4 "Off airport parking". Park in <b>Row R or S</b>. Driver will meet you there.<br/><br/>
ℹ️ <b>Important Reminders:</b><br/>
• <b>Have Ready:</b> Your Booking Confirmation, Vehicle Keys, Vehicle Starting Options, Payment Method For The Car Park Fee.<br/>
• Remove All Valuables From your Vehicle before handing it over.<br/>
• Do Not Leave Your Vehicle Unattended. Wait for Our Driver To Meet You.<br/>
• Booking Cancellation/Amendments Need To Inform Us Via Email (cs@onpark.co.uk) 5 Days Before You Drop Off Your Car.$onpark$,
  lhr_fees_note = $onpark$Heathrow terminal car park fee not included: currently £8 each way (up to 30 mins), paid to the airport. ULEZ charge, if applicable, not included.$onpark$,
  terminal_data = $onpark${"T2":{"address":"Terminal 2 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1EW"},"T3":{"address":"Terminal 3 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1QG"},"T4":{"address":"Terminal 4 Long Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 3XL"},"T5":{"address":"Terminal 5 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 2GA"}}$onpark$,
  email = $onpark$onparkbookings@gmail.com$onpark$,
  address = $onpark$Heathrow Airport (Meet & Greet)$onpark$,
  postcode = $onpark$TW6 1EW$onpark$,
  map_url = $onpark$https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk$onpark$,
  map_location = $onpark$Terminal Forecourt$onpark$
WHERE id = '71f3764a-d5a1-4459-8b3a-de52ad22411b';

-- Kangaroo Parking
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>VEHICLE DROP OFF PROCEDURE</b><br/><br/>
Please call the dispatch number provided in your confirmation email when you are 20 mins away from the departing terminal. A driver will meet you at your departing terminal, at the pre-booked time, where he will assist with your luggage, confirm your return details, and together with the driver you will check the condition of the car and take pictures of your car to enter our system. If you are expecting to be earlier or later than the pre-booked time, we strongly recommend that you inform a member of staff.<br/><br/>
<b>Terminal 2 (TW6 1EW):</b> Follow signs to Terminal 2 short stay car park. Do not go to the Kangaroo Parking office or any other car park. As you approach the ramp, stay in the far right hand lane, follow signs for Level 4 "Off airport parking" and drive and park your car in <b>Row B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 3 (TW6 1QG):</b> Follow signs to Terminal 3 short stay car park. Enter the Short-Stay Car-park and follow signs for Level 4 "Off airport parking". Park your car in <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 4 (TW6 3XL):</b> Follow signs to Terminal 4 Long Stay car park. Enter the Long Stay car park and follow signs for <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 5 (TW6 2GA):</b> Follow signs to Terminal 5 short stay car park. Take the far left side lane to enter Level 4 "Off airport parking". Park your car in <b>Row R or S</b>. Driver will meet you there.<br/><br/>
💰 <b>Important Payment Information:</b><br/>
The Short-Stay Parking Fee at Heathrow is Not Included in your booking price. You Must Pay This Fee Yourself Upon Entering And Exiting The Car Park. The Current Charge For Up To 30 Minutes Is £8 (Subject To Change By Heathrow Airport) Each Way. Please Check The Payment Machines For The Latest Tariff. Your Booking Covers Our Meet & Greet Service Only. All Airport-Imposed Charges Are The Customer's Responsibility.<br/><br/>
ℹ️ <b>Important Reminders:</b><br/>
• <b>Have Ready:</b> Your Booking Confirmation, Vehicle Keys, Vehicle Starting Options, Payment Method For The Car Park Fee.<br/>
• Remove All Valuables From your Vehicle before handing it over.<br/>
• Do Not Leave Your Vehicle Unattended. Wait for Our Driver To Meet You.<br/>
• Booking Cancellation/Amendments Need To Inform Us Via Email (info@aeroparkdirect.co.uk) 5 Days Before You Drop Off Your Car.<br/><br/>$onpark$,
  lhr_fees_note = $onpark$Heathrow terminal car park fee not included: currently £8 each way (up to 30 mins), paid to the airport. ULEZ charge, if applicable, not included.$onpark$,
  terminal_data = $onpark${"T2":{"address":"Terminal 2 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1EW"},"T3":{"address":"Terminal 3 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1QG"},"T4":{"address":"Terminal 4 Long Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 3XL"},"T5":{"address":"Terminal 5 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 2GA"}}$onpark$,
  email = $onpark$onparkbookings@gmail.com$onpark$
WHERE id = 'b910ea9c-7d3f-415e-8ce7-06991a8b231a';

-- Platinum Parking
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>VEHICLE DROP OFF PROCEDURE</b><br/><br/>
Please call the dispatch number provided in your confirmation email when you are 20 mins away from the departing terminal. A driver will meet you at your departing terminal, at the pre-booked time, where he will assist with your luggage, confirm your return details, and together with the driver you will check the condition of the car and take pictures of your car to enter our system. If you are expecting to be earlier or later than the pre-booked time, we strongly recommend that you inform a member of staff.<br/><br/>
<b>Terminal 2 (TW6 1EW):</b> Follow signs to Terminal 2 short stay car park. Do not go to the Platinum Parking office or any other car park. As you approach the ramp, stay in the far right hand lane, follow signs for Level 4 "Off airport parking" and drive and park your car in <b>Row B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 3 (TW6 1QG):</b> Follow signs to Terminal 3 short stay car park. Enter the Short-Stay Car-park and follow signs for Level 4 "Off airport parking". Park your car in <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 4 (TW6 3XL):</b> Follow signs to Terminal 4 Long Stay car park. Enter the Long Stay car park and follow signs for <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 5 (TW6 2GA):</b> Follow signs to Terminal 5 short stay car park. Take the far left side lane to enter Level 4 "Off airport parking". Park your car in <b>Row R or S</b>. Driver will meet you there.<br/><br/>
💰 <b>Important Payment Information:</b><br/>
The Short-Stay Parking Fee at Heathrow is Not Included in your booking price. You Must Pay This Fee Yourself Upon Entering And Exiting The Car Park. The Current Charge For Up To 30 Minutes Is £8 (Subject To Change By Heathrow Airport) Each Way. Please Check The Payment Machines For The Latest Tariff. Your Booking Covers Our Meet & Greet Service Only. All Airport-Imposed Charges Are The Customer's Responsibility.<br/><br/>
ℹ️ <b>Important Reminders:</b><br/>
• <b>Have Ready:</b> Your Booking Confirmation, Vehicle Keys, Vehicle Starting Options, Payment Method For The Car Park Fee.<br/>
• Remove All Valuables From your Vehicle before handing it over.<br/>
• Do Not Leave Your Vehicle Unattended. Wait for Our Driver To Meet You.<br/>
• Booking Cancellation/Amendments Need To Inform Us Via Email (info@aeroparkdirect.co.uk) 5 Days Before You Drop Off Your Car.<br/><br/>$onpark$,
  lhr_fees_note = $onpark$Heathrow terminal car park fee not included: currently £8 each way (up to 30 mins), paid to the airport. ULEZ charge, if applicable, not included.$onpark$,
  terminal_data = $onpark${"T2":{"address":"Terminal 2 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1EW"},"T3":{"address":"Terminal 3 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1QG"},"T4":{"address":"Terminal 4 Long Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 3XL"},"T5":{"address":"Terminal 5 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 2GA"}}$onpark$,
  email = $onpark$onparkbookings@gmail.com$onpark$
WHERE id = '6cc08bec-12e2-4570-8d73-efcf6c70e08f';

-- Simple Parking
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>VEHICLE DROP OFF PROCEDURE</b><br/><br/>
Please call the dispatch number provided in your confirmation email when you are 20 mins away from the departing terminal. A driver will meet you at your departing terminal, at the pre-booked time, where he will assist with your luggage, confirm your return details, and together with the driver you will check the condition of the car and take pictures of your car to enter our system. If you are expecting to be earlier or later than the pre-booked time, we strongly recommend that you inform a member of staff.<br/><br/>
<b>Terminal 2 (TW6 1EW):</b> Follow signs to Terminal 2 short stay car park. Do not go to the Simple Parking office or any other car park. As you approach the ramp, stay in the far right hand lane, follow signs for Level 4 "Off airport parking" and drive and park your car in <b>Row B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 3 (TW6 1QG):</b> Follow signs to Terminal 3 short stay car park. Enter the Short-Stay Car-park and follow signs for Level 4 "Off airport parking". Park your car in <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 4 (TW6 3XL):</b> Follow signs to Terminal 4 Long Stay car park. Enter the Long Stay car park and follow signs for <b>Row A or B</b>. Driver will meet you there.<br/><br/>
<b>Terminal 5 (TW6 2GA):</b> Follow signs to Terminal 5 short stay car park. Take the far left side lane to enter Level 4 "Off airport parking". Park your car in <b>Row R or S</b>. Driver will meet you there.<br/><br/>
💰 <b>Important Payment Information:</b><br/>
The Short-Stay Parking Fee at Heathrow is Not Included in your booking price. You Must Pay This Fee Yourself Upon Entering And Exiting The Car Park. The Current Charge For Up To 30 Minutes Is £8 (Subject To Change By Heathrow Airport) Each Way. Please Check The Payment Machines For The Latest Tariff. Your Booking Covers Our Meet & Greet Service Only. All Airport-Imposed Charges Are The Customer's Responsibility.<br/><br/>
ℹ️ <b>Important Reminders:</b><br/>
• <b>Have Ready:</b> Your Booking Confirmation, Vehicle Keys, Vehicle Starting Options, Payment Method For The Car Park Fee.<br/>
• Remove All Valuables From your Vehicle before handing it over.<br/>
• Do Not Leave Your Vehicle Unattended. Wait for Our Driver To Meet You.<br/>
• Booking Cancellation/Amendments Need To Inform Us Via Email (info@aeroparkdirect.co.uk) 5 Days Before You Drop Off Your Car.<br/><br/>$onpark$,
  lhr_fees_note = $onpark$Heathrow terminal car park fee not included: currently £8 each way (up to 30 mins), paid to the airport. ULEZ charge, if applicable, not included.$onpark$,
  terminal_data = $onpark${"T2":{"address":"Terminal 2 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1EW"},"T3":{"address":"Terminal 3 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 1QG"},"T4":{"address":"Terminal 4 Long Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 3XL"},"T5":{"address":"Terminal 5 Short Stay","map_url":"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19875.46271923485!2d-0.4735956037088998!3d51.47002040000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1716100000000!5m2!1sen!2suk","postcode":"TW6 2GA"}}$onpark$,
  email = $onpark$onparkbookings@gmail.com$onpark$
WHERE id = '69649d0d-246c-40f1-9516-b30901026b2f';

-- OnePark Premium Plus
UPDATE companies SET
  phone_number = $onpark$07762569061$onpark$,
  phone_number_2 = $onpark$07762569062$onpark$,
  on_arrival_lhr = $onpark$<b>Please follow these steps for your drop-off:</b><br><br>
1. <b>Pre-arrival call:</b> Call our dispatch team on <b>07762 569061</b> or <b>07762 569062</b> when you are 20 minutes away from the airport.<br>
2. <b>Meeting point:</b> Drive directly to the <b>Short Stay Car Park</b> for your departing terminal.<br>
3. <b>Handover:</b> Our uniformed driver will meet you at the designated level, assist with your bags, and take photos of your car. <br>
4. <b>Ready to fly:</b> Your car is now in our care. You are just a short walk from the check-in desks.

<br><br>
<div style="background: #0f172a; padding: 10px; border-radius: 8px; border-left: 4px solid #10b981;">
  <b>Premium Plus Payment:</b> Your booking includes the standard Short Stay airport entry fee. You do <b>not</b> need to pay at the machines upon exit.
</div>$onpark$,
  on_return_lhr = $onpark$<b>Follow these steps upon landing:</b><br><br>
1. <b>Call upon landing:</b> Call us on <b>07762 569061</b> or <b>07762 569062</b> as soon as you land to confirm your return.<br>
2. <b>Call after baggage:</b> Once you have collected your baggage, call the same number again. This allows us to dispatch your vehicle to the terminal car park so it is waiting for you.<br>
3. <b>Pick up:</b> Your vehicle will be returned to the same Short Stay car park area where you dropped it off.$onpark$,
  email = $onpark$onparkbookings@gmail.com$onpark$
WHERE id = 'c607edbf-5a45-4641-a9c6-6d2e6c9d7c61';

COMMIT;

-- Check: should list the new numbers and 'TW6 3XL' for every OnPark brand
SELECT name, phone_number, phone_number_2, email, terminal_data->'T4'->>'postcode' AS t4_postcode FROM companies WHERE name IN ('OnPark Saver', 'OnPark Premium', 'Kangaroo Parking', 'Platinum Parking', 'Simple Parking', 'OnePark Premium Plus') ORDER BY name;

-- Undo (only if needed): UPDATE companies c SET <column> = b.<column> FROM companies_backup_20260919 b WHERE b.id = c.id;
