// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
  }

  try {
    // 1. Retrieve the session and expand the line_items to see what they paid for
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const metadata = session.metadata;
      
      // 2. Identify if this was an amendment or a new booking
      const isAmendment = metadata?.is_amendment === "true";

      return NextResponse.json({
        status: "success",
        isAmendment: isAmendment, // Tells the frontend which success message to show
        metadata: metadata,
        amount: session.amount_total / 100,
        customerEmail: session.customer_details?.email,
        // We return the booking_ref so the frontend can look up the updated record
        bookingRef: metadata?.booking_ref || null 
      });
    } else {
      return NextResponse.json({ status: "unpaid" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Stripe Session Verification Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}