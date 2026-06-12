-- Seed realistic reviews + appropriate badges for every company.
-- LHR reviews assigned to operates_at_heathrow=true companies.
-- LTN reviews assigned to operates_at_luton=true companies.
-- Badges assigned by category (Meet & Greet vs Park & Ride).
-- Random count: 5–14 reviews per airport per company.

DO $$
DECLARE
  comp RECORD;

  -- ── BADGE POOLS ────────────────────────────────────────────────────────────
  mg_badges CONSTANT jsonb := '[
    {"label": "No Hidden Fees",      "category": "General"},
    {"label": "Free Cancellation",   "category": "General"},
    {"label": "24/7 Security",       "category": "General"},
    {"label": "Fully Insured",       "category": "General"},
    {"label": "Terminal Drop-Off",   "category": "Meet & Greet"},
    {"label": "Fast Service",        "category": "Meet & Greet"},
    {"label": "Valet Style Service", "category": "Meet & Greet"},
    {"label": "Luggage Assistance",  "category": "Meet & Greet"}
  ]';

  pr_badges CONSTANT jsonb := '[
    {"label": "No Hidden Fees",    "category": "General"},
    {"label": "Free Cancellation", "category": "General"},
    {"label": "24/7 Security",     "category": "General"},
    {"label": "CCTV Monitored",    "category": "General"},
    {"label": "Fully Insured",     "category": "General"},
    {"label": "Free Shuttle Bus",  "category": "Park & Ride"},
    {"label": "Secure Parking",    "category": "Park & Ride"}
  ]';

  -- ── LHR REVIEW POOL (20 reviews) ──────────────────────────────────────────
  lhr_pool CONSTANT jsonb := '[
    {"author": "James T.",    "rating": 5, "date": "2025-11-12", "comment": "Absolutely seamless. Driver was waiting at the terminal, car was spotless on return. Will definitely book again."},
    {"author": "Sarah M.",    "rating": 5, "date": "2025-10-03", "comment": "Best airport parking experience I''ve had at Heathrow. Stress-free drop-off and the car was exactly where promised."},
    {"author": "David R.",    "rating": 4, "date": "2025-09-18", "comment": "Very smooth process. Got a confirmation text when my car was secured. Minor wait on return but overall excellent."},
    {"author": "Emma W.",     "rating": 5, "date": "2025-08-22", "comment": "Used for a work trip. Driver was professional, punctual and very helpful with luggage. Top marks."},
    {"author": "Michael B.",  "rating": 4, "date": "2025-07-14", "comment": "Good value for Heathrow. Easy to hand over the keys and the return process was quicker than expected."},
    {"author": "Claire P.",   "rating": 5, "date": "2025-06-30", "comment": "Fantastic service. Booked last minute and everything ran perfectly. Will be my go-to for T2 trips."},
    {"author": "Oliver H.",   "rating": 3, "date": "2025-05-11", "comment": "Decent service but waited about 20 minutes on collection. Not a dealbreaker but worth knowing."},
    {"author": "Rachel K.",   "rating": 5, "date": "2025-04-08", "comment": "Used for a family holiday. Kids were tired on return and the driver came super quickly. Really appreciated it."},
    {"author": "Tom A.",      "rating": 5, "date": "2025-03-25", "comment": "Competitive price, professional driver, car back in perfect condition. Couldn''t ask for more."},
    {"author": "Helen S.",    "rating": 4, "date": "2025-02-17", "comment": "Third time using this company. Reliable and consistent. The SMS updates are a nice touch."},
    {"author": "Chris N.",    "rating": 5, "date": "2025-01-09", "comment": "Brilliant. No faff, no hidden costs. Driver was prompt at T5 and car smelled fresh on return."},
    {"author": "Natalie G.",  "rating": 4, "date": "2024-12-21", "comment": "Went over Christmas. Still prompt and no issues. Impressed given how busy the airport was."},
    {"author": "Paul D.",     "rating": 5, "date": "2024-11-15", "comment": "Excellent value. Much cheaper than the official Heathrow car parks and genuinely as convenient."},
    {"author": "Fiona L.",    "rating": 3, "date": "2024-10-02", "comment": "Service was fine. Communication could be better — wasn''t sure exactly where to meet. Sorted in the end."},
    {"author": "Ben C.",      "rating": 5, "date": "2024-09-28", "comment": "Driver arrived in 8 minutes. Car returned clean and untouched. Perfect for business travel."},
    {"author": "Lucy F.",     "rating": 5, "date": "2024-08-10", "comment": "First time using meet and greet at Heathrow. So much easier than dragging bags to a car park."},
    {"author": "Mark J.",     "rating": 4, "date": "2024-07-20", "comment": "Good experience overall. Price and convenience are unbeatable. Slight wait but nothing concerning."},
    {"author": "Sophie E.",   "rating": 5, "date": "2024-06-14", "comment": "The driver even helped with the pushchair without being asked. Above and beyond. Highly recommend."},
    {"author": "Andrew V.",   "rating": 5, "date": "2024-05-05", "comment": "Used for a long-haul holiday. Peace of mind knowing the car was in safe hands. Smooth both ways."},
    {"author": "Kate M.",     "rating": 4, "date": "2024-04-18", "comment": "Reliable and professional. Parking confirmation came quickly and collection was hassle-free."}
  ]';

  -- ── LTN REVIEW POOL (20 reviews) ──────────────────────────────────────────
  ltn_pool CONSTANT jsonb := '[
    {"author": "Steven R.",   "rating": 5, "date": "2025-11-08", "comment": "Great Luton experience. Drop-off was right at the terminal doors and collection was fast. Brilliant."},
    {"author": "Amy C.",      "rating": 5, "date": "2025-10-19", "comment": "Used for an easyJet flight from LTN. Arrived early, driver was already there. Top service."},
    {"author": "Daniel T.",   "rating": 4, "date": "2025-09-05", "comment": "Good value at Luton. Short wait on return but the driver kept me updated via text. Happy overall."},
    {"author": "Laura B.",    "rating": 5, "date": "2025-08-16", "comment": "Booked the night before and everything was seamless. Driver was polite and professional."},
    {"author": "Ryan M.",     "rating": 5, "date": "2025-07-22", "comment": "So much better than lugging bags to the long-stay car park. Driver on time, car safe. Booking again."},
    {"author": "Victoria P.", "rating": 4, "date": "2025-06-11", "comment": "Smooth process. Instructions were clear and the team were easy to reach when I called ahead."},
    {"author": "George H.",   "rating": 3, "date": "2025-05-28", "comment": "Decent service but the driver was about 15 mins late. Not the end of the world at this price."},
    {"author": "Zoe W.",      "rating": 5, "date": "2025-04-14", "comment": "Perfect for Luton. So convenient for early morning flights. Parking text updates were reassuring."},
    {"author": "Ian S.",      "rating": 5, "date": "2025-03-09", "comment": "Third time using for Luton flights. Never had a problem. Fair price and great service every time."},
    {"author": "Nicola F.",   "rating": 4, "date": "2025-02-20", "comment": "Really easy to use. Would appreciate a clearer meeting point sign but driver found me quickly."},
    {"author": "Jack B.",     "rating": 5, "date": "2025-01-16", "comment": "Brilliant. Driver was professional and friendly. Car returned in perfect condition. 10/10."},
    {"author": "Rebecca A.",  "rating": 5, "date": "2024-12-10", "comment": "Great Christmas trip experience. No stress going out or coming back. Highly recommend."},
    {"author": "Nathan K.",   "rating": 4, "date": "2024-11-22", "comment": "Good price for Luton. The meet and greet made a long journey much more manageable."},
    {"author": "Chloe D.",    "rating": 5, "date": "2024-10-14", "comment": "Driver helped with heavy bags without being asked. Really thoughtful service. Will be back."},
    {"author": "Liam G.",     "rating": 5, "date": "2024-09-01", "comment": "Fast, professional, no issues. Exactly what you want when heading off on holiday."},
    {"author": "Hannah O.",   "rating": 4, "date": "2024-08-05", "comment": "Very good service. Short wait on collection but communicated well throughout. Happy to recommend."},
    {"author": "Josh N.",     "rating": 5, "date": "2024-07-19", "comment": "Outstanding. Met promptly, car brought back quickly. I''ll never use a normal car park again."},
    {"author": "Megan T.",    "rating": 5, "date": "2024-06-27", "comment": "Superb. Driver rang ahead, was exactly on time, car was spotless. The whole process took minutes."},
    {"author": "Luke C.",     "rating": 3, "date": "2024-05-11", "comment": "Acceptable service. Nothing wrong but nothing remarkable either. Would try again at this price."},
    {"author": "Ella S.",     "rating": 5, "date": "2024-04-03", "comment": "Perfect from start to finish. Great price for the quality of service at Luton."}
  ]';

  selected_lhr jsonb;
  selected_ltn jsonb;
  assigned_badges jsonb;

BEGIN
  FOR comp IN SELECT * FROM companies LOOP

    -- Assign badge set by category
    IF comp.category ILIKE '%meet%' OR comp.category ILIKE '%greet%' THEN
      assigned_badges := mg_badges;
    ELSE
      assigned_badges := pr_badges;
    END IF;

    -- Random LHR reviews (5–14)
    IF comp.operates_at_heathrow THEN
      SELECT jsonb_agg(r) INTO selected_lhr
      FROM (
        SELECT r FROM jsonb_array_elements(lhr_pool) r
        ORDER BY random()
        LIMIT (floor(random() * 10) + 5)::int
      ) sub;
    ELSE
      selected_lhr := '[]'::jsonb;
    END IF;

    -- Random LTN reviews (5–14)
    IF comp.operates_at_luton THEN
      SELECT jsonb_agg(r) INTO selected_ltn
      FROM (
        SELECT r FROM jsonb_array_elements(ltn_pool) r
        ORDER BY random()
        LIMIT (floor(random() * 10) + 5)::int
      ) sub;
    ELSE
      selected_ltn := '[]'::jsonb;
    END IF;

    UPDATE companies SET
      badges      = assigned_badges,
      lhr_reviews = selected_lhr,
      ltn_reviews = selected_ltn
    WHERE id = comp.id;

    RAISE NOTICE '% — badges: % | LHR reviews: % | LTN reviews: %',
      comp.name,
      jsonb_array_length(assigned_badges),
      jsonb_array_length(coalesce(selected_lhr, '[]'::jsonb)),
      jsonb_array_length(coalesce(selected_ltn, '[]'::jsonb));

  END LOOP;
END $$;
