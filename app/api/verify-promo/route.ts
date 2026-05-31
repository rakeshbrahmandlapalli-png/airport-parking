// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
// ✅ FIXED IMPORT
import { computePrice, calculateDays, FAST_TRACK_PRICE, DEFAULT_SETTINGS } from "@/app/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICING_FEED_URL = "https://script.google.com/macros/s/AKfycbwd4zT_JLMbufzexsJ4GKtkyvVh5EvxUQ0XA_i5cg6f19QXFutErdrU3i57TIF-D8Ku/exec";
const GATEWAY_URL = "https://luton247airportparking.co.uk/agent/get_parking_price";
const FALLBACK_TOKEN = "6a0b8fa913e0463e9ad0247";

export async function POST(req: Request) {
  try {
    const { price, airport, provider, metadata, isAmendment } = await req.json();

    if (isAmendment) return await createSession({ price, airport, provider, metadata, isAmendment: true });

    const companyId = metadata?.company_id || "";
    const dropDate = metadata?.dropoff_date || metadata?.dropDate || "";
    const pickDate = metadata?.pickup_date || metadata?.pickDate || "";
    const dropTime = metadata?.dropoff_time || metadata?.dropTime || "09:00";
    let pickTime = metadata?.pickup_time || metadata?.pickTime || "09:00";
    
    if (dropDate === pickDate && dropTime === pickTime) pickTime = "23:59";

    const fastTrackCount = Math.max(0, parseInt(metadata?.fast_track_count || "0", 10) || 0);
    const promoCode = (metadata?.promo_used && metadata.promo_used !== "None") ? String(metadata.promo_used).toUpperCase().trim() : "";

    let company = null;
    if (companyId) {
      const { data } = await supabaseAdmin.from("companies").select("*").eq("id", companyId).maybeSingle();
      company = data;
    }

    let pricingEngine = [];
    try {
      const feedRes = await fetch(PRICING_FEED_URL, { headers: { "Content-Type": "text/plain;charset=utf-8" }, cache: "no-store" });
      pricingEngine = await feedRes.json();
    } catch (e) {}

    let settings = { ...DEFAULT_SETTINGS };
    try {
      const { data: setRows } = await supabaseAdmin.from("settings").select("*").in("key", ["markup_enabled", "markup_percent"]);
      if (setRows) {
        const en = setRows.find((r) => r.key === "markup_enabled");
        const pc = setRows.find((r) => r.key === "markup_percent");
        settings = { markupEnabled: en ? en.value === "true" : true, markupPercent: pc ? Number(pc.value) || 10 : 10 };
      }
    } catch (e) {}

    let liveApiPrice: number | null = null;
    const isLuton = (airport || "").toLowerCase().includes("luton");
    const nameLower = (company?.name || provider || "").toLowerCase().trim();
    const isDynamic = !!company?.api_token || DYNAMIC_PROVIDERS.includes(nameLower);

    if (isDynamic && isLuton && dropDate && pickDate) {
      const token = company?.api_token || process.env.LUTON247_API_TOKEN || FALLBACK_TOKEN;
      try {
        const apiRes = await fetch(GATEWAY_URL, {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          body: JSON.stringify({ token_no: token, drop_date: dropDate, drop_time: dropTime, return_date: pickDate, return_time: pickTime })
        });
        const text = await apiRes.text();
        let parsedData;
        try { parsedData = JSON.parse(text); } catch (e) {}
        const rates = Array.isArray(parsedData) ? parsedData : (parsedData && typeof parsedData === 'object' && parsedData.parking_price ? [parsedData] : []);
        const validQuote = rates.find((q: any) => q && q.parking_price != null);
        if (validQuote) liveApiPrice = Number(validQuote.parking_price);
      } catch (e) {}
    }

    const duration = calculateDays(dropDate, pickDate);
    const priceResult = computePrice({
      company, providerName: provider || metadata?.service_type || "", airport, duration, dropDate, pricingEngine, liveApiPrice, settings, fallbackPrice: 0,
    });

    if (!priceResult.ok || priceResult.final <= 0) {
      priceResult.final = Number(price) || 0; 
    }

    let serverTotal = priceResult.final;
    let appliedPromo = "None";
    if (promoCode) {
      const { data: promo } = await supabaseAdmin.from("promotions").select("*").eq("code", promoCode).maybeSingle();
      const valid = promo && promo.is_active !== false && (!promo.expiry_date || new Date(promo.expiry_date) >= new Date());
      if (valid) {
        const pct = Number(promo.discount_percent) / 100;
        if (pct > 0 && pct <= 1) {
          serverTotal = serverTotal * (1 - pct);
          appliedPromo = promo.code;
        }
      }
    }

    serverTotal = serverTotal + fastTrackCount * FAST_TRACK_PRICE;
    if (metadata?.lounge === "yes") serverTotal += 35.0; 
    serverTotal = Math.round(serverTotal * 100) / 100;
    
    const clientTotal = Number(price) || 0;
    if (Math.abs(clientTotal - serverTotal) > 2.00) {
      return NextResponse.json({ error: "The price has updated since you loaded this page. Please go back and re-confirm your booking before paying.", serverPrice: serverTotal }, { status: 409 });
    }

    return await createSession({
      price: clientTotal, airport, provider, metadata: { ...metadata, promo_used: appliedPromo }, isAmendment: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function createSession({ price, airport, provider, metadata, isAmendment }) {
  const productName = isAmendment ? `Booking Amendment: ${metadata.booking_ref}` : `AeroPark: ${airport}`;
  const productDesc = isAmendment ? `Date Change Adjustment - ${provider}` : `${provider} Parking Services`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk";
  const successPath = isAmendment ? `/manage?ref=${metadata.booking_ref}&updated=true` : `/success?session_id={CHECKOUT_SESSION_ID}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: metadata.email ? String(metadata.email) : undefined,
    phone_number_collection: { enabled: true },
    line_items: [{
      price_data: { currency: "gbp", product_data: { name: productName, description: productDesc }, unit_amount: Math.round(price * 100) },
      quantity: 1,
    }],
    metadata: {
      full_name: String(metadata.full_name || ""), email: String(metadata.email || ""), phone: String(metadata.phone || ""),
      license_plate: String(metadata.registration || metadata.license_plate || ""), car_make: String(metadata.car_make || ""), car_color: String(metadata.car_color || ""),
      airport: String(airport || ""), terminal: String(metadata.terminal || "Main Terminal"),
      dropoff_date: String(metadata.dropoff_date || ""), pickup_date: String(metadata.pickup_date || ""), dropoff_time: String(metadata.dropTime || metadata.dropoff_time || "09:00"), pickup_time: String(metadata.pickTime || metadata.pickup_time || "09:00"),
      flight_number: String(metadata.flightNumber || metadata.flight_number || ""), provider_name: String(provider || ""), company_id: String(metadata.company_id || ""),
      service_type: String(metadata.service_type || "Premium Meet & Greet"), booking_ref: String(metadata.booking_ref || ""),
      is_amendment: isAmendment ? "true" : "false", promo_used: String(metadata.promo_used || "None"), fast_track_count: String(metadata.fast_track_count || "0"),
    },
    mode: "payment",
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${isAmendment ? "/manage" : "/checkout"}`,
  });

  return NextResponse.json({ url: session.url });
}