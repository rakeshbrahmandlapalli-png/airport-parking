// @ts-nocheck
// app/api/parking-api/route.ts
// Server-side proxy to the Luton 247 parking-price gateway.
// Keeps the API token secret (env var, never sent to the browser),
// works around CORS, and aggressively caches responses to prevent gateway timeouts.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

// Use Service Role to bypass RLS for server-side caching operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GATEWAY_URL = "https://luton247airportparking.co.uk/agent/get_parking_price";

// 🟢 Short-lived in-memory cache. The upstream gateway is slow on a cold request
// but the same token+dates query returns the same price for a while, so caching
// successful responses makes retries and subsequent page loads instant.
const CACHE_TTL_MS = 60_000;
type CacheEntry = { rates: any[]; expires: number };
const rateCache = new Map<string, CacheEntry>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { drop_date, drop_time, return_date, return_time } = body;

    // Resolve the gateway token SERVER-SIDE from the company id where possible,
    // so we don't blindly trust a token supplied by the browser. Falls back to a
    // client-supplied token / env for backward compatibility.
    let token = body.token_no || process.env.LUTON247_API_TOKEN;
    if (body.companyId) {
      try {
        const { data: c } = await supabaseAdmin
          .from("companies")
          .select("api_token")
          .eq("id", body.companyId)
          .maybeSingle();
        if (c?.api_token) token = c.api_token;
      } catch { /* fall back to supplied/env token */ }
    }

    if (!token) {
      return NextResponse.json({ error: "Missing API token", rates: [] }, { status: 200 });
    }
    if (!drop_date || !return_date) {
      return NextResponse.json({ error: "Missing dates", rates: [] }, { status: 200 });
    }

    const dt = drop_time || "09:00";
    const rt = return_time || "09:00";
    const cacheKey = `${token}|${drop_date}|${dt}|${return_date}|${rt}`;

    // ── 1a. IN-MEMORY CACHE (fastest — same serverless instance) ──────────────
    const cached = rateCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({ rates: cached.rates, cached: true }, { status: 200 });
    }

    // ── 1b. SUPABASE CACHE (persistent across instances) ──────────────────────
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    try {
      const { data: cachedData } = await supabaseAdmin
        .from('api_price_cache')
        .select('price')
        .eq('token_no', token)
        .eq('drop_date', drop_date)
        .eq('return_date', return_date)
        .gte('created_at', threeHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedData && cachedData.price > 0) {
        console.log(`⚡ CACHE HIT for ${token}: £${cachedData.price}`);
        // Return exact format expected by frontend
        return NextResponse.json({ rates: [{ parking_price: cachedData.price }] }, { status: 200 });
      }
    } catch (cacheErr) {
      console.warn("Cache read failed, proceeding to live fetch:", cacheErr);
    }

    // ── 2. LIVE FETCH FROM SLOW GATEWAY ───────────────────────────────────────
    console.log(`🐌 CACHE MISS. Fetching live for ${token}...`);

    // 🟢 TIMEOUT: If Luton 247 hangs, abort after 9 seconds and fail soft
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    let res: Response;
    try {
      res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          token_no: token,
          drop_date,            // YYYY-MM-DD
          drop_time: dt,        // HH:MM
          return_date,          // YYYY-MM-DD
          return_time: rt,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    // The provider returns Content-Type: text/html even though the body is JSON,
    // so parse defensively.
    const text = await res.text();
    let data: any = [];
    try {
      data = JSON.parse(text);
    } catch {
      console.error("parking-api: provider returned non-JSON:", text.slice(0, 200));
      return NextResponse.json({ error: "Bad gateway response", rates: [] }, { status: 200 });
    }

    // Always return an array under `rates`
    const rates = Array.isArray(data) ? data : [data];

    // ── 3. STORE RESULT IN CACHE (Non-blocking) ───────────────────────────────
    // Only cache genuine, priced responses so we never pin an empty/failed result.
    const validRate = rates.find((r: any) => r && r.parking_price != null);
    if (validRate) {
      // In-memory cache (instant for subsequent same-instance loads)
      rateCache.set(cacheKey, { rates, expires: Date.now() + CACHE_TTL_MS });

      // Supabase persistent cache (fire-and-forget)
      const fetchedPrice = Number(validRate.parking_price);
      if (fetchedPrice > 0) {
        supabaseAdmin.from('api_price_cache').insert([{
          token_no: token,
          drop_date,
          return_date,
          price: fetchedPrice
        }]).then(({ error }) => {
          if (error) console.error("Cache insert error:", error.message);
        });
      }
    }

    return NextResponse.json({ rates }, { status: 200 });

  } catch (err: any) {
    console.error("parking-api proxy error:", err?.message);
    // 🟢 Fail soft: empty rates → computePrice falls back to the company's manual pivots.
    return NextResponse.json({ error: err?.message || "proxy failed", rates: [] }, { status: 200 });
  }
}