// ============================================================================
// lib/pricing.ts — SINGLE SOURCE OF TRUTH for all AeroPark pricing
// Sheet-free. Token-based. Pivots fallback. Simple.
// ============================================================================

export const FAST_TRACK_PRICE = 8.0;

export interface PricingSettings {
  markupEnabled: boolean;
  markupPercent: number; 
}

export const DEFAULT_SETTINGS: PricingSettings = {
  markupEnabled: true,
  markupPercent: 10,
};

// ── Helper: Is this company API-priced? ──────────────────────────────────────
// 🟢 THIS IS THE NEW DECISION POINT (replaces DYNAMIC_PROVIDERS name-matching)
export function isApiCompany(company: any): boolean {
  return !!(company?.api_token && typeof company.api_token === "string" && company.api_token.trim().length > 0);
}

// ── Safe helpers ────────────────────────────────────────────────────────────
export const parsePrice = (val: any, fallback: number) => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return num > 0 ? num : fallback;
};

export const safeParseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/").map((p) => parseInt(p, 10));
    if (day && month && year) return new Date(Date.UTC(year, month - 1, day));
  }
  if (typeof dateStr === "string") {
    const isoDatePart = dateStr.split("T")[0];
    const m = isoDatePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

export function calculateDays(dropoff: string, pickup: string): number {
  if (!dropoff || !pickup) return 1;
  const start = safeParseDate(dropoff);
  const end = safeParseDate(pickup);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diff = Math.abs(end.getTime() - start.getTime());
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  return days <= 0 ? 1 : days;
}

export function interpolateTier(
  duration: number, p1: number, p2: number, p5: number, p8: number,
  p11: number, p14: number, p17: number, p22: number, p32: number
): number {
  if (duration <= 1) return p1;
  if (duration === 2) return p2;
  if (duration <= 5) return p2 + ((p5 - p2) / 3) * (duration - 2);
  if (duration <= 8) return p5 + ((p8 - p5) / 3) * (duration - 5);
  if (duration <= 11) return p8 + ((p11 - p8) / 3) * (duration - 8);
  if (duration <= 14) return p11 + ((p14 - p11) / 3) * (duration - 11);
  if (duration <= 17) return p14 + ((p17 - p14) / 3) * (duration - 14);
  if (duration <= 22) return p17 + ((p22 - p17) / 5) * (duration - 17);
  if (duration <= 32) return p22 + ((p32 - p22) / 10) * (duration - 22);
  return p32 + ((p32 - p22) / 10) * (duration - 32);
}

// ── Compute base price from manual pivots (Luton/Heathrow specific) ──────────
function staticBase(company: any, isLuton: boolean, duration: number): number {
  const pick = (lhrKey: string, ltnKey: string, fb: number) => 
    parsePrice(isLuton ? company[ltnKey] : company[lhrKey], fb);
  
  const p1 = parsePrice(isLuton ? company.luton_price : company.heathrow_price, 0);
  const p2 = pick("lhr_day2_price", "ltn_day2_price", p1);
  const p5 = pick("lhr_day5_price", "ltn_day5_price", p2);
  const p8 = pick("lhr_day8_price", "ltn_day8_price", p5);
  const p11 = pick("lhr_day11_price", "ltn_day11_price", p8);
  const p14 = pick("lhr_day14_price", "ltn_day14_price", p11);
  const p17 = pick("lhr_day17_price", "ltn_day17_price", p14);
  const p22 = pick("lhr_day22_price", "ltn_day22_price", p17);
  const p32 = pick("lhr_day32_price", "ltn_day32_price", p22);
  
  return interpolateTier(duration, p1, p2, p5, p8, p11, p14, p17, p22, p32);
}

// ── Extract first valid rate from the live API response array ────────────────
// 🟢 Each token = one product. We just grab the parking_price from the first valid item.
function getLiveApiBaseRate(liveApiRates: any[]): number | null {
  if (!Array.isArray(liveApiRates) || liveApiRates.length === 0) return null;
  
  for (const rate of liveApiRates) {
    if (rate && rate.parking_price != null) {
      const price = Number(rate.parking_price);
      if (price > 0) return price;
    }
  }
  return null;
}

export interface PriceResult {
  base: number;        // The raw calculated base (before modifier/markup)
  original: number;    // base × markup (for display)
  final: number;       // base × modifier × markup (the actual charge)
  modifier: number;    
  isDynamic: boolean;  // true if company has api_token
  ok: boolean;         // false if calculation failed (price <= 0)
  source: "api" | "pivots" | "fallback"; 
}

// ── THE ENGINE ───────────────────────────────────────────────────────────────
// 🟢 COMPLETELY SHEET-FREE. Inputs: company, airport, duration, liveApiRates array.
// Decision: isApiCompany(company) ? liveApiRates : pivots
// Fallback: the company's own pivots (for same company, both API and manual)
export function computePrice(opts: {
  company: any | null;
  providerName?: string;     
  airport: string;
  duration: number;
  dropDate: string;
  liveApiRates?: any[];      // 🟢 ARRAY, not a single price
  settings?: PricingSettings;
  fallbackPrice?: number;    
}): PriceResult {
  const {
    company, airport, duration, dropDate,
    liveApiRates = [], settings = DEFAULT_SETTINGS, fallbackPrice = 0,
  } = opts;

  const isLuton = airport.toLowerCase().includes("luton");
  const isDynamic = isApiCompany(company);

  const markupFactor = settings.markupEnabled ? 1 + settings.markupPercent / 100 : 1;
  const modifier = Number(company?.price_modifier ?? 1) || 1;
  const surcharge = Number(company?.dynamic_surcharge_percent ?? 0) || 0;

  let base: number;
  let ok = true;
  let source: PriceResult["source"] = "fallback";

  if (isDynamic) {
    // 🟢 API company: try liveApiRates first, fall back to its own manual pivots
    const apiRate = getLiveApiBaseRate(liveApiRates);
    if (apiRate !== null) {
      base = apiRate * (1 + surcharge / 100);
      source = "api";
    } else {
      // API failed or returned empty: fall to this company's manual pivots
      if (!company) {
        base = fallbackPrice;
        ok = fallbackPrice > 0;
        source = "fallback";
      } else {
        base = staticBase(company, isLuton, duration);
        source = "pivots";
      }
    }
  } else {
    // 🟢 Manual company: just use pivots
    if (!company) {
      base = fallbackPrice;
      ok = fallbackPrice > 0;
      source = "fallback";
    } else {
      base = staticBase(company, isLuton, duration);
      source = "pivots";
    }
  }

  // Final validation: if still 0 or negative, mark as failed
  if (base <= 0) ok = false;

  const original = base * markupFactor;          
  const final = base * modifier * markupFactor;  

  return { base, original, final, modifier, isDynamic, ok, source };
}