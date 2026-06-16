import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { computePrice, calculateDays, isApiCompany, FAST_TRACK_PRICE, DEFAULT_SETTINGS, loadPricingSettings } from "@/app/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GATEWAY_URL = "https://luton247airportparking.co.uk/agent/get_parking_price";
// Moved out of source code — set LUTON247_FALLBACK_TOKEN in your environment
// (and rotate the old hardcoded token, which was previously committed).
const FALLBACK_TOKEN = process.env.LUTON247_FALLBACK_TOKEN || process.env.LUTON247_API_TOKEN || "";

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

    const settings = await loadPricingSettings(supabaseAdmin);

    let liveApiRates: any[] = [];
    const isLuton = (airport || "").toLowerCase().includes("luton");
    const isDynamic = isApiCompany(company);

    if (isDynamic && isLuton && dropDate && pickDate) {
      const token = company?.api_token || process.env.LUTON247_API_TOKEN || FALLBACK_TOKEN;
      try {
        const apiRes = await fetch(GATEWAY_URL, {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          body: JSON.stringify({ token_no: token, drop_date: dropDate, drop_time: dropTime, return_date: pickDate, return_time: pickTime })
        });
        const text = await apiRes.text();
        let parsedData: unknown;
        try { parsedData = JSON.parse(text); } catch (e) { /* non-JSON response — skip */ }
        liveApiRates = Array.isArray(parsedData) ? parsedData
          : (parsedData && typeof parsedData === "object" && (parsedData as any).parking_price ? [parsedData] : []);
      } catch (e) { /* network error — fall back to pivots */ }
    }

    const duration = calculateDays(dropDate, pickDate);
    const priceResult = computePrice({
      company, providerName: provider || metadata?.service_type || "", airport, duration, dropDate, liveApiRates, settings, fallbackPrice: 0,
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

    // Add-on prices + tolerance come from Platform Settings (settings table),
    // falling back to defaults so a missing row never breaks checkout.
    const fastTrackPrice = Number(settings.fastTrackPrice) > 0 ? Number(settings.fastTrackPrice) : FAST_TRACK_PRICE;
    const loungePrice    = Number(settings.loungePrice)    > 0 ? Number(settings.loungePrice)    : 35.0;
    const priceTolerance = Number(settings.priceTolerance) > 0 ? Number(settings.priceTolerance) : 2.0;

    serverTotal = serverTotal + fastTrackCount * fastTrackPrice;
    if (metadata?.lounge === "yes") serverTotal += loungePrice;
    serverTotal = Math.round(serverTotal * 100) / 100;

    const clientTotal = Number(price) || 0;
    if (Math.abs(clientTotal - serverTotal) > priceTolerance) {
      return NextResponse.json({ error: "The price has updated since you loaded this page. Please go back and re-confirm your booking before paying.", serverPrice: serverTotal }, { status: 409 });
    }

    return await createSession({
      price: clientTotal, airport, provider, metadata: { ...metadata, promo_used: appliedPromo }, isAmendment: false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

interface SessionArgs {
  price: number;
  airport: string;
  provider: string;
  metadata: Record<string, string>;
  isAmendment: boolean;
}

async function createSession({ price, airport, provider, metadata, isAmendment }: SessionArgs) {
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
      service_type: String(metadata.service_type || "Meet & Greet"), booking_ref: String(metadata.booking_ref || ""),
      is_amendment: isAmendment ? "true" : "false", promo_used: String(metadata.promo_used || "None"), fast_track_count: String(metadata.fast_track_count || "0"),
    },
    mode: "payment",
    success_url: `${baseUrl}${successPath}`,
    cancel_url: `${baseUrl}${isAmendment ? "/manage" : "/checkout"}`,
  });

  return NextResponse.json({ url: session.url });
}