import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail"; // Adjust path if needed

export async function GET() {
  // Mock booking structure mimicking your operational payload
  const mockBooking = {
    booking_ref: "APD-TEST-999",
    email: "rakeshbrahmandlapalli@gmail.com", // 
    airport: "Luton Airport",
    terminal: "Terminal 1",
    license_plate: "TEST 2026",
    dropoff_date: new Date().toISOString(),
    dropoff_time: "05:00",
    pickup_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
    pickup_time: "21:00",
  };

  // Mock company structure matching your database fallback layout
  const mockCompany = {
    name: "24/7 Meet & Greet Test",
    dispatch_phone_1: "07397705005",
    dispatch_phone_2: "07544185858",
    on_arrival_ltn: "Test arrival steps: Drive to Terminal Car Park 1.",
    on_return_ltn: "Test return steps: Call us once you have bags.",
    address: "Terminal Car Park 1, Luton Airport",
    postcode: "LU2 9LY"
  };

  try {
    const result = await sendBookingReceipt(mockBooking, mockCompany, false);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: "Test email sent!", data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}