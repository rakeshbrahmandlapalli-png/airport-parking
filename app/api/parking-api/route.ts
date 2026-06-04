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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { drop_date, drop_time, return_date, return_time } = body;

    // The token identifies which provider's rates come back.
    const token = body.token_no || process.env.LUTON247_API_TOKEN;

    if (!token) {
      return NextResponse.json({ error: "Missing API token", rates: [] }, { status: 200 });
    }
    if (!drop_date || !return_date) {
      return NextResponse.json({ error: "Missing dates", rates: [] }, { status: 200 });
    }

    // ── 1. CHECK SUPABASE CACHE FIRST (Speed Boost) ───────────────────────────
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

    // TIMEOUT: If Luton 247 hangs, abort after 7 seconds and fail soft
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        token_no: token,
        drop_date,                       // YYYY-MM-DD
        drop_time: drop_time || "09:00", // HH:MM
        return_date,                     // YYYY-MM-DD
        return_time: return_time || "09:00",
      }),
    });

    clearTimeout(timeout);

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
    const validRate = rates.find(r => r && r.parking_price != null);
    if (validRate) {
      const fetchedPrice = Number(validRate.parking_price);
      if (fetchedPrice > 0) {
        // Fire and forget cache insert
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