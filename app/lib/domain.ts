// ============================================================================
// lib/domain.ts — Canonical domain model for AeroPark Direct.
//
// P0.1 of the senior audit: this replaces the `any` soup scattered across the
// results and checkout pages with one shared, typed source of truth. Components
// and the pricing engine should import these types rather than redeclaring
// loose shapes locally.
//
// Pure module: types + framework-free helpers only (no React state, no fetch).
// ============================================================================

import type { LucideIcon } from "lucide-react";
import {
  Footprints, Bus, CarFront, Clock, Navigation, Tag, Sparkles, Zap,
  ShieldCheck, User, BedDouble, BatteryCharging, Briefcase, CheckCircle2,
  Percent, Star, Gift, Info,
} from "lucide-react";

// ─── Core entities ────────────────────────────────────────────────────────────

/** A customer review, stored in companies.{lhr,ltn}_reviews (jsonb arrays). */
export interface Review {
  id?: string | number;
  author: string;
  rating: number;
  date?: string;
  comment: string;
  verified?: boolean;
  source?: string;
}

/** A feature tag, stored in companies.badges (jsonb). */
export interface Badge {
  label: string;
  /** "General" | "Meet & Greet" | "Park & Ride" | … */
  category: string;
}

export type PricingSource = "api" | "pivot" | "fallback" | "none";

/** The resolved quote attached to a company as `calculatedPriceObj`. */
export interface Quote {
  /** Pre-discount, post-markup price (for strikethrough display). */
  original: number;
  /** The amount actually charged. */
  final: number;
  modifier: number;
  source: PricingSource;
}

/**
 * The subset of the Supabase `companies` row the UI consumes. The index
 * signature is retained so a row can still carry the pricing-pivot columns
 * (ltn_day5_price, lhr_day8_price, api_token, price_modifier, …) that the
 * pricing engine reads, without widening the typed UI surface.
 */
export interface Company {
  id: string;
  name: string;
  logo_url?: string | null;
  category?: string | null;
  pricing_mode?: string | null;
  is_active?: boolean | null;
  operates_at_heathrow?: boolean | null;
  operates_at_luton?: boolean | null;

  overview?: string | null;
  address?: string | null;
  postcode?: string | null;
  map_url?: string | null;
  phone_number?: string | null;

  lhr_featured?: boolean | null;
  ltn_featured?: boolean | null;
  lhr_sold_out?: boolean | null;
  ltn_sold_out?: boolean | null;
  lhr_reviews?: Review[] | null;
  ltn_reviews?: Review[] | null;
  on_arrival_lhr?: string | null;
  on_arrival_ltn?: string | null;
  on_return_lhr?: string | null;
  on_return_ltn?: string | null;
  // Per-airport disclosure of any charge the customer pays separately (e.g. a
  // barrier charge on collection, or ULEZ not being covered). Shown on the
  // result card + checkout so there are no surprises. Blank = nothing extra.
  ltn_fees_note?: string | null;
  lhr_fees_note?: string | null;
  badges?: Badge[] | null;

  /** Pricing-pivot + token columns consumed by the pricing engine. */
  [pivotColumn: string]: unknown;
}

/** A company with its resolved quote — the shape handed to result cards. */
export interface PricedCompany extends Company {
  calculatedPriceObj: Quote;
}

/** The user's parking search, parsed once from URL params. */
export interface SearchCriteria {
  airport: string;
  dropoffDate: string;
  pickupDate: string;
  dropoffTime: string;
  pickupTime: string;
  serviceType: string;
  isHeathrow: boolean;
}

// No "rating" sort: the stored reviews were seeded placeholders, so sorting by
// them would rank real operators on invented scores.
export type SortKey = "recommended" | "price";

// ─── Pure helpers (no React, no `any`) ─────────────────────────────────────────

export const formatGBP = (n: number): string => `£${n.toFixed(2)}`;

/** Map a badge/highlight label to a representative Lucide icon. */
export function getBadgeIcon(label: string): LucideIcon {
  const l = label.toUpperCase();
  if (l.includes("WALK")) return Footprints;
  if (l.includes("BUS")) return Bus;
  if (l.includes("VALET")) return CarFront;
  if (l.includes("HOUR")) return Clock;
  if (l.includes("TERMINAL")) return Navigation;
  if (l.includes("FEE")) return Tag;
  if (l.includes("AERO")) return Sparkles;
  if (l.includes("FAST")) return Zap;
  if (l.includes("SECUR") || l.includes("DBS") || l.includes("SIA")) return ShieldCheck;
  if (l.includes("MEET")) return User;
  if (l.includes("HOTEL")) return BedDouble;
  if (l.includes("CHARG")) return BatteryCharging;
  if (l.includes("LUGGAGE")) return Briefcase;
  if (l.includes("FREE") || l.includes("CANCEL") || l.includes("INCLUDED")) return CheckCircle2;
  if (l.includes("DISCOUNT") || l.includes("OFFER")) return Percent;
  if (l.includes("VIP") || l.includes("STAR")) return Star;
  if (l.includes("LOYALTY") || l.includes("BONUS")) return Gift;
  return Info;
}

// AeroPark's own policy, enforced by /cancel and the refund rules — true for
// every booking whoever the operator is.
const CANCELLATION_POLICY = "Free cancellation up to 24h before drop-off";

/**
 * Selling points for a result card: only claims someone has actually stood
 * behind. That is AeroPark's own cancellation policy, plus whatever badges were
 * entered for this operator in Admin → Companies. There is deliberately NO
 * built-in fallback list any more: it used to add "Fully insured", "SIA &
 * DBS-vetted drivers" and similar to every operator, unverified, which is how
 * three different companies ended up with word-for-word identical claims.
 */
export function buildHighlights(company: Company, _isMeetGreet: boolean, max = 4, feesNote?: string | null): string[] {
  // If this operator discloses an extra charge, never surface a "no hidden
  // fees" style badge — it would directly contradict the disclosure.
  const hasExtraFees = !!(feesNote && feesNote.trim());

  const fromBadges = (company.badges ?? [])
    .filter((b) => b.category === "General" || b.category === company.category)
    .map((b) => b.label.trim())
    .filter(Boolean)
    // The universal line below already covers cancellation.
    .filter((label) => !/cancel/i.test(label));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...fromBadges, CANCELLATION_POLICY]) {
    if (hasExtraFees && /hidden fee|no\s+fee|all[- ]?inclusive/i.test(item)) continue;
    const key = item.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(item); }
    if (out.length >= max) break;
  }
  // Keep the policy line even if an operator has `max` badges of its own.
  if (!out.includes(CANCELLATION_POLICY)) out[out.length - 1] = CANCELLATION_POLICY;
  return out;
}

/**
 * Apply a client-side sort to already-priced companies. "recommended" preserves
 * the engine's authoritative pinned order; other keys are pure view transforms.
 */
export function sortCompanies(companies: PricedCompany[], key: SortKey): PricedCompany[] {
  if (key === "recommended") return companies;
  return [...companies].sort((a, b) => {
    const af = a.calculatedPriceObj.final || Number.POSITIVE_INFINITY;
    const bf = b.calculatedPriceObj.final || Number.POSITIVE_INFINITY;
    return af - bf;
  });
}

// ─── ADMIN AUDIT LEDGER ────────────────────────────────────────────────────────
// Mirrors public.admin_audit_logs (see supabase/admin_audit_logs.sql).

/** Structured context stored on each audit row; before/after enable diffs. */
export interface AuditMetadata {
  /** Human label for the affected field, e.g. "Promo Badge text". */
  label?: string;
  before?: unknown;
  after?: unknown;
  [key: string]: unknown;
}

export interface AdminAuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;        // e.g. "promo.badge.update"
  entity_type: string | null; // e.g. "company" | "promotion" | "setting"
  entity_id: string | null;
  metadata: AuditMetadata;
  created_at: string;         // ISO timestamp
}
