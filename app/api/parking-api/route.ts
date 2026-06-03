// @ts-nocheck
// app/api/parking-api/route.ts
// Server-side proxy to the Luton 247 parking-price gateway.
// Keeps the API token secret (env var, never sent to the browser),
// and works around CORS by calling the provider from the server.
import { NextResponse } from "next/server";

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

    // The token identifies which provider's rates come back.
    // If different companies use different tokens, the caller can pass a
    // `token_no` in the body to override the default env token.
    const token = body.token_no || process.env.LUTON247_API_TOKEN;

    if (!token) {
      return NextResponse.json({ error: "Missing API token", rates: [] }, { status: 200 });
    }
    if (!drop_date || !return_date) {
      return NextResponse.json({ error: "Missing dates", rates: [] }, { status: 200 });
    }

    const dt = drop_time || "09:00";
    const rt = return_time || "09:00";
    const cacheKey = `${token}|${drop_date}|${dt}|${return_date}|${rt}`;

    // Serve a fresh cached result if we have one
    const cached = rateCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json({ rates: cached.rates, cached: true }, { status: 200 });
    }

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

    // Always return an array under `rates` so the frontend can pass it
    // straight into computePrice as liveApiRates.
    const rates = Array.isArray(data) ? data : [data];

    // Only cache genuine, priced responses so we never pin an empty/failed result
    const hasPrice = rates.some((r: any) => r?.parking_price != null);
    if (hasPrice) {
      rateCache.set(cacheKey, { rates, expires: Date.now() + CACHE_TTL_MS });
    }

    return NextResponse.json({ rates }, { status: 200 });
  } catch (err: any) {
    console.error("parking-api proxy error:", err?.message);
    // 🟢 Fail soft: empty rates → computePrice falls back to the company's manual pivots.
    return NextResponse.json({ error: err?.message || "proxy failed", rates: [] }, { status: 200 });
  }
}