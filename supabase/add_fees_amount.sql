-- Numeric companion to the existing ltn_fees_note / lhr_fees_note text fields.
-- The note is customer-facing prose ("£10 barrier charge payable on
-- collection"); this is the real £ figure the payout math actually uses.
--
-- Only matters for a fee-covered booking (bookings.fees_covered = true, e.g.
-- a transferred AeroPark Exclusive booking): the operator would normally
-- collect this amount from the customer directly, in cash, at the barrier.
-- Since the customer was promised it's covered, AeroPark owes the operator
-- that amount instead — split out of the commissionable parking value and
-- paid in full, commission-free. See computeProviderPayout in app/lib/mail.ts.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS ltn_fees_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lhr_fees_amount numeric NOT NULL DEFAULT 0;

-- 24/7 Meet & Greet's real Luton barrier fee, confirmed by Rakesh (22 Sep).
UPDATE companies SET ltn_fees_amount = 10.00 WHERE name = '24/7 Meet & Greet';

-- Other operators known (from the price-transparency work) to charge the same
-- £10 Luton barrier fee are NOT set here — check each one's real figure in
-- Admin > Companies before filling in ltn_fees_amount / lhr_fees_amount for
-- them (Airport Parking Bay and others in the ltn_fees_note "£10" group).
