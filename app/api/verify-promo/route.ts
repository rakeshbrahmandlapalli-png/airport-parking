import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// 🟢 Use the Service Role Key to safely query past bookings from the backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ count: 0 }, { status: 400 });
    }

    // Securely ask Supabase how many bookings match this email
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .ilike('email', email.trim());

    if (error) {
      console.error("Promo Verification Database Error:", error);
      return NextResponse.json({ count: 0 }, { status: 500 });
    }

    // Return the total number of past bookings found
    return NextResponse.json({ count: data ? data.length : 0 }, { status: 200 });

  } catch (error: any) {
    console.error("Promo Verification Server Error:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}