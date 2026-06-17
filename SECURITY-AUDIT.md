# Security Audit — AeroPark Direct

Branch: `claude/security-hardening-v2` (cut fresh from `main`). Type-checks clean
(`tsc --noEmit` passes). These fixes were re-verified against current `main` — the
ones `main` already handles (HTML-email escaping in `mail.ts`, the sanitized
`logger`) were intentionally left alone.

## ⚠️ Manual actions (only you can do)
1. **Rotate the Luton247 gateway token.** It was hardcoded in `app/api/checkout/route.ts`
   and is in git history. Now env-only (`LUTON247_FALLBACK_TOKEN` / `LUTON247_API_TOKEN`).
   *(Mitigated already by making the repo private, but rotating is the clean fix.)*
2. **Run `supabase/security_rls.sql`** in Supabase → SQL Editor (already run once on the
   live DB; this just keeps the file in sync).

## HIGH — fixed
- **Deleted `/api/verify-promo`** — a second, unused, unprotected checkout endpoint that
  trusted the client price when the price engine failed (pay-any-amount). Still present
  and vulnerable on `main` until this merges.
- **Removed legacy `createCheckoutSession`** server action (created a Stripe session from
  the client's price with no server recompute).
- **Secured `/api/send`** — the admin dashboard actions (`manual_provider_notify`,
  `manual_customer_notify`, `review_request`) now require an admin session; customer
  emails are sent only to the address stored on the DB booking (resolved by ref), never a
  caller-supplied address; all interpolated values are HTML-escaped. Previously an
  unauthenticated open relay from your verified domain.
- **Hardcoded gateway token → env-only** in `/api/checkout`.

## MEDIUM — fixed
- **Restored the admin middleware** (`middleware.ts`) with an admin-email check, not just
  "any session." `main` had deleted it, leaving `/admin` with only a client-side guard —
  even though `supabase.ts` still uses cookie auth specifically so middleware can gate it.
- **`promotions` RLS** tightened to the admin domain (was any authenticated user).
- **Removed leftover `bookings` RLS template policies** (account-model "own row" rules
  that never matched — no customer logins).
- **`/api/notify-admin`** — HTML-escaped + numeric guard + unknown-type rejection.
- **`/api/verify-session` and `/api/chat`** no longer return internal error messages.

## New
- `app/lib/adminAuth.ts` — `getAdminUser(req)` cookie-based admin check for route handlers.

## Deferred (documented, not urgent)
- `// @ts-nocheck` on the payment routes (type safety off on money code).
- `companies.api_token` readable via the public anon key (migration sketch at the bottom
  of `security_rls.sql`).
- CSP `unsafe-eval`/`unsafe-inline` (needs preview-deploy testing of gtag/Clarity).
