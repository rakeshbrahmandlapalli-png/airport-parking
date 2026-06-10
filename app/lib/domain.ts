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

export type SortKey = "recommended" | "price" | "rating";

// ─── Pure helpers (no React, no `any`) ─────────────────────────────────────────

export const formatGBP = (n: number): string => `£${n.toFixed(2)}`;

export function getAvgRating(reviews: Review[] | null | undefined): number | null {
  if (!reviews?.length) return null;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

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

/**
 * Build 3–4 selling-point bullets for a result card. Prefers the operator's own
 * badges (filtered to the relevant service category), then tops up with
 * brand-universal trust points so every card shows a consistent value stack.
 */
export function buildHighlights(company: Company, isMeetGreet: boolean, max = 4): string[] {
  const fromBadges = (company.badges ?? [])
    .filter((b) => b.category === "General" || b.category === company.category)
    .map((b) => b.label.trim())
    .filter(Boolean);

  const defaults = isMeetGreet
    ? ["SIA & DBS-vetted drivers", "Terminal drop-off & collection", "Free cancellation", "Fully insured compound"]
    : ["Free 24/7 shuttle transfers", "Fully insured compound", "Free cancellation", "24/7 CCTV & patrols"];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...fromBadges, ...defaults]) {
    const key = item.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(item); }
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Apply a client-side sort to already-priced companies. "recommended" preserves
 * the engine's authoritative pinned order; other keys are pure view transforms.
 */
export function sortCompanies(
  companies: PricedCompany[],
  key: SortKey,
  isHeathrow: boolean,
): PricedCompany[] {
  if (key === "recommended") return companies;
  const copy = [...companies];
  if (key === "price") {
    copy.sort((a, b) => {
      const af = a.calculatedPriceObj.final || Number.POSITIVE_INFINITY;
      const bf = b.calculatedPriceObj.final || Number.POSITIVE_INFINITY;
      return af - bf;
    });
  } else {
    copy.sort((a, b) => {
      const ar = getAvgRating(isHeathrow ? a.lhr_reviews : a.ltn_reviews) ?? 0;
      const br = getAvgRating(isHeathrow ? b.lhr_reviews : b.ltn_reviews) ?? 0;
      return br - ar;
    });
  }
  return copy;
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
