import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://www.aeroparkdirect.co.uk";

const isEmail = (v: unknown): v is string =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function fmtDate(d?: string) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function serviceLabel(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("park-ride") || t.includes("park & ride")) return "Park & Ride";
  if (t.includes("hotel")) return "Hotel & Parking";
  return "Meet & Greet";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      email,
      airport = "Luton (LTN)",
      dropoffDate = "",
      pickupDate = "",
      dropoffTime = "",
      pickupTime = "",
      serviceType = "meet-greet",
      fromPrice = "",
    } = body || {};

    if (!isEmail(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const service = serviceLabel(serviceType);

    // Rebuild the exact search so the CTA reopens their live results.
    const params = new URLSearchParams();
    if (airport) params.set("airport", airport);
    if (dropoffDate) params.set("dropoffDate", dropoffDate);
    if (pickupDate) params.set("pickupDate", pickupDate);
    if (dropoffTime) params.set("dropoffTime", dropoffTime);
    if (pickupTime) params.set("pickupTime", pickupTime);
    if (serviceType) params.set("type", serviceType);
    const resultsUrl = `${BASE_URL}/results?${params.toString()}`;

    const summaryRow = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:13px;color:#64748b;font-weight:600;">${label}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eef2f7;font-size:13px;color:#0f172a;font-weight:700;text-align:right;">${value}</td>
      </tr>`;

    const priceLine = fromPrice
      ? `<p style="margin:4px 0 0;font-size:14px;color:#10b981;font-weight:800;">Prices from £${String(
          fromPrice
        ).replace(/[^0-9.]/g, "")}</p>`
      : "";

    const customerHtml = `
      <div style="background:#f1f5f9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <div style="background:#0b1220;padding:28px 28px 24px;">
            <p style="margin:0;color:#60a5fa;font-size:11px;letter-spacing:2px;font-weight:800;text-transform:uppercase;">AeroPark Direct</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Your parking quote is ready</h1>
            ${priceLine}
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.6;">
              Thanks for searching with AeroPark Direct. Here's a summary of your ${service} quote for ${airport}. Prices are live and your free cancellation still applies — tap below to view today's rates and book in under 60 seconds.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              ${summaryRow("Airport", airport)}
              ${summaryRow("Service", service)}
              ${summaryRow("Drop-off", `${fmtDate(dropoffDate)}${dropoffTime ? ` · ${dropoffTime}` : ""}`)}
              ${summaryRow("Pick-up", `${fmtDate(pickupDate)}${pickupTime ? ` · ${pickupTime}` : ""}`)}
            </table>
            <a href="${resultsUrl}" style="display:block;text-align:center;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:16px;border-radius:12px;letter-spacing:0.5px;">
              View Live Prices &amp; Book →
            </a>
            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
              Fully insured operators · Free cancellation · 4.8★ rated<br/>
              Prices may change with availability. This quote is a guide based on your search.
            </p>
          </div>
          <div style="background:#f8fafc;padding:18px 28px;border-top:1px solid #eef2f7;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              AeroPark Direct · Luton &amp; Heathrow Airport Parking<br/>
              Need help? Reply to this email or contact info@aeroparkdirect.co.uk
            </p>
          </div>
        </div>
      </div>`;

    // Send the quote to the customer.
    try {
      await resend.emails.send({
        from: "AeroPark Direct <bookings@aeroparkdirect.co.uk>",
        to: cleanEmail,
        subject: `Your ${service} quote for ${airport} — AeroPark Direct`,
        html: customerHtml,
      });
    } catch (err) {
      console.error("email-quote: failed to send customer email", err);
      return NextResponse.json(
        { success: false, error: "Could not send the quote right now." },
        { status: 502 }
      );
    }

    // Internal lead capture — non-blocking; never fail the request on this.
    try {
      await resend.emails.send({
        from: "AeroPark System <system@aeroparkdirect.co.uk>",
        to: "info@aeroparkdirect.co.uk",
        subject: `New quote lead: ${cleanEmail} (${airport})`,
        html: `
          <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">
            <h2 style="margin:0 0 12px;">New "Email me this quote" lead</h2>
            <p style="margin:4px 0;"><strong>Email:</strong> ${cleanEmail}</p>
            <p style="margin:4px 0;"><strong>Airport:</strong> ${airport}</p>
            <p style="margin:4px 0;"><strong>Service:</strong> ${service}</p>
            <p style="margin:4px 0;"><strong>Drop-off:</strong> ${fmtDate(dropoffDate)} ${dropoffTime}</p>
            <p style="margin:4px 0;"><strong>Pick-up:</strong> ${fmtDate(pickupDate)} ${pickupTime}</p>
            <p style="margin:12px 0 0;"><a href="${resultsUrl}">${resultsUrl}</a></p>
          </div>`,
      });
    } catch (err) {
      console.error("email-quote: failed to send internal lead notification", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("email-quote: unexpected error", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
