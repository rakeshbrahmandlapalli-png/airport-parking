-- Persist the "fees covered by AeroPark" promise on the booking itself, so it
-- survives reassignment from AeroPark Exclusive to a real operator.
--
-- Before this, the promise was inferred from which company a booking was
-- CURRENTLY assigned to. The moment an Exclusive booking was transferred to a
-- normal operator (e.g. 24/7 Meet & Greet), the promise silently disappeared:
-- the customer's confirmation email would switch to that operator's own
-- instructions, which say to pay a barrier/exit fee — directly contradicting
-- what she was told and paid for.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fees_covered boolean NOT NULL DEFAULT false;

-- Backfill: any booking still sitting on an "Exclusive" company keeps the
-- promise once it's reassigned. Covers APD-ETC0HQ (Peaches Clayton-temple)
-- and anyone else waiting to be transferred.
UPDATE bookings
SET fees_covered = true
WHERE fees_covered = false
  AND company_id IN (SELECT id FROM companies WHERE name ILIKE '%exclusive%');
