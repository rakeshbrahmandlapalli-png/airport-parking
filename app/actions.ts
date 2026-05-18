"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { sendBookingReceipt } from "./lib/mail"; 
import { createClient } from '@supabase/supabase-js';

// 🟢 BYPASS PRISMA: Use Supabase to prevent the "Table does not exist" crash
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🟢 SAFE DATE PARSER HELPER (Prevents Server-Side Invalid Date Crashes)
const safeParseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
};

export async function createCheckoutSession(formData: FormData) {
  // 1. Initialise Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // 2. Extract every field from the form
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const flightNumber = formData.get("flightNumber") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const parkingType = formData.get("parkingType") as string || "standard";
  const totalPrice = parseFloat(formData.get("totalPrice") as string) || 0;
  
  const airport = formData.get("airport") as string || "Luton Airport (LTN)";
  const terminal = formData.get("terminal") as string || "Main Terminal";

  const dropoffDateStr = formData.get("dropoffDate") as string;
  const pickupDateStr = formData.get("pickupDate") as string;
  
  // 🟢 EXTRACT COMPANY ID FROM FORM
  const companyId = formData.get("companyId") as string;

  // 🚀 USE SAFE DATE PARSER
  const dropoffDate = dropoffDateStr ? safeParseDate(dropoffDateStr) : new Date();
  const pickupDate = pickupDateStr ? safeParseDate(pickupDateStr) : new Date();

  const tempRef = "VIP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  let sessionUrl = "";

  // 3. DATABASE, EMAIL & STRIPE LOGIC
  try {
    // 🟢 1. FETCH REAL COMPANY DATA (No more 'null'!)
    let company = null;
    if (companyId && companyId !== "null" && companyId !== "") {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
      company = data;
    }
    
    // Backup search by name just in case
    if (!company) {
      const { data } = await supabase.from('companies').select('*').ilike('name', `%${parkingType}%`).maybeSingle();
      company = data;
    }

    // A. Save the booking to Supabase Database
    await supabase.from('bookings').insert([{
      booking_ref: tempRef,
      full_name: customerName,
      email: customerEmail,
      phone_number: customerPhone,
      flight_number: flightNumber,
      license_plate: licensePlate,
      service_type: parkingType,
      total_price: totalPrice,
      status: "pending",
      airport: airport,    
      terminal: terminal,   
      dropoff_date: dropoffDate.toISOString(),
      pickup_date: pickupDate.toISOString(),  
      company_id: company ? company.id : null 
    }]);

    // B. Fire off the email receipt via Resend ✈️
    if (customerEmail) {
      const tempBookingObj = {
        email: customerEmail,
        customerEmail: customerEmail,
        booking_ref: tempRef,
        license_plate: licensePlate,
        licensePlate: licensePlate,
        airport: airport,
        terminal: terminal,
        phone_number: customerPhone,
        customerPhone: customerPhone,
        flight_number: flightNumber,
        flightNumber: flightNumber,
        service_type: parkingType,
        parkingType: parkingType
      };

      // 🟢 THE ULTIMATE FIX: Pass the real company data instead of 'null'
      await sendBookingReceipt(tempBookingObj, company, false);
    }

    // C. Create the Stripe Checkout Session 💳
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `AeroPark Direct: ${parkingType.toUpperCase()}`,
              description: `Flight: ${flightNumber} | License: ${licensePlate} | Ref: ${tempRef}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
         company_id: company ? company.id : "",
         provider_name: company ? company.name : parkingType,
         booking_ref: tempRef
      },
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.aeroparkdirect.co.uk'}/success?session_id={CHECKOUT_SESSION_ID}&ref=${tempRef}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.aeroparkdirect.co.uk'}/checkout?type=${parkingType}`,
      customer_email: customerEmail,
    });

    sessionUrl = session.url as string;

  } catch (error) {
    console.error("Critical Error in createCheckoutSession:", error);
    return;
  }

  // 4. THE REDIRECT
  if (sessionUrl) {
    redirect(sessionUrl);
  }
}

// ============================================================================
// 🔥 NEW INVENTORY ENGINE
// ============================================================================
export async function checkAvailability(airport: string, dropoffStr: string, pickupStr: string) {
  const MAX_CAPACITY = 50; 

  try {
    if (!dropoffStr || !pickupStr) {
      return { isAvailable: true, spotsLeft: MAX_CAPACITY }; 
    }

    // 🚀 USE SAFE DATE PARSER
    const requestedStart = safeParseDate(dropoffStr);
    const requestedEnd = safeParseDate(pickupStr);

    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
       return { isAvailable: true, spotsLeft: MAX_CAPACITY };
    }

    // 🟢 Ask Supabase (bypassing Prisma)
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('airport', airport)
      .neq('status', 'cancelled')
      .lte('dropoff_date', requestedEnd.toISOString())
      .gte('pickup_date', requestedStart.toISOString());

    if (error) throw error;

    const overlappingCars = count || 0;
    const spotsLeft = MAX_CAPACITY - overlappingCars;

    return {
      isAvailable: overlappingCars < MAX_CAPACITY,
      spotsLeft: spotsLeft > 0 ? spotsLeft : 0,
    };
    
  } catch (error) {
    console.error("Inventory check failed:", error);
    return { isAvailable: false, spotsLeft: 0 }; 
  }
}