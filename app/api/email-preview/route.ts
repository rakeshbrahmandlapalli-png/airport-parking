import { buildReceiptHtml, buildReviewHtml, type ReceiptHtmlParams } from "@/app/lib/mail";

// Renders the booking-confirmation email with SAMPLE data so you can preview the
// design in a browser without making a test booking.
//
//   Local:  http://localhost:3000/api/email-preview
//   Amend:  http://localhost:3000/api/email-preview?type=amendment
//
// Dev-only by default. To view on the deployed site, set EMAIL_PREVIEW_KEY in
// your env and append ?key=THAT_VALUE. No real customer data is ever used.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const allowed =
    process.env.NODE_ENV !== "production" ||
    (!!process.env.EMAIL_PREVIEW_KEY && searchParams.get("key") === process.env.EMAIL_PREVIEW_KEY);

  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }

  const type = searchParams.get("type");

  // Post-stay review email preview:  /api/email-preview?type=review
  if (type === "review") {
    return new Response(buildReviewHtml("Jordan", "APD-H29XTM"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const isAmendment = type === "amendment";

  const sample: ReceiptHtmlParams = {
    booking: {
      booking_ref: "APD-H29XTM",
      airport: "Heathrow (LHR)",
      full_name: "Jordan Taylor",
    },
    company: { name: "24/7 Meet & Greet" },
    isAmendment,
    terminalKey: "Terminal 2",
    displayAddress: "Terminal 2 Short Stay Car Park",
    displayPostcode: "TW6 1EW",
    mapsLink: "https://www.google.com/maps",
    phone1: "07397 705005",
    phone2: "07544 185858",
    phone1Link: "07397705005",
    phone2Link: "07544185858",
    arrivalInstructions:
      "Call your chauffeur 20–30 minutes before you reach the terminal. Head to Terminal 2 Short Stay and follow the signs for Off-Airport Meet & Greet.",
    returnInstructions:
      "Once you've collected your luggage, call dispatch and your driver will return your car to the Short Stay collection point.",
    dropDate: "Fri, 5 Jun 2026",
    pickDate: "Fri, 12 Jun 2026",
    dropTime: "09:00",
    pickTime: "18:00",
    licencePlate: "AB12 CDE",
    statusText: isAmendment ? "Updated" : "Confirmed",
    statusColor: isAmendment ? "#3b82f6" : "#059669",
    statusBg: isAmendment ? "#eff6ff" : "#ecfdf5",
    totalPaidStr: "£28.56",
    serviceType: "Meet & Greet",
    flightNumber: "BA123",
  };

  return new Response(buildReceiptHtml(sample), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
