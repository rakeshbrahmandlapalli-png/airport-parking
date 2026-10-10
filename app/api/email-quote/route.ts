import { logger } from "@/app/lib/logger";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { emailShell, emailSection, paragraph, detailTable, emailButton, noteBox } from "@/app/lib/receiptEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://www.aeroparkdirect.co.uk";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
  const rl = rateLimit(`email-quote:${getClientIp(req)}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
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

    const priceNum = parseFloat(String(fromPrice).replace(/[^0-9.]/g, ""));
    const priceText = Number.isFinite(priceNum) && priceNum > 0 ? `£${priceNum.toFixed(2)}` : "";
    const dropText = `${fmtDate(dropoffDate)}${dropoffTime ? `, ${dropoffTime}` : ""}`;
    const pickText = `${fmtDate(pickupDate)}${pickupTime ? `, ${pickupTime}` : ""}`;

    const customerHtml = emailShell({
      title: "Your parking quote",
      kicker: "Quote",
      heading: priceText ? `Your quote: from ${priceText}` : "Your parking quote",
      preheader: `${service} at ${airport}, ${dropText} to ${pickText}.`,
      bodyHtml:
        emailSection(
          paragraph(`Thanks for searching with AeroPark Direct. Here is a summary of your ${esc(service)} quote for ${esc(airport)}.`) +
            detailTable([
              ["Airport", esc(airport)],
              ["Service", esc(service)],
              ["Drop-off", esc(dropText)],
              ["Pick-up", esc(pickText)],
              ["Price", priceText ? `from ${esc(priceText)}` : ""],
            ])
        ) +
        emailSection(emailButton(resultsUrl, "View live prices and book")) +
        emailSection(
          noteBox(
            "Please note",
            "Prices are live and can change with availability. This quote is a guide based on your search. Reply to this email if you need a hand."
          )
        ),
    });

    const customerText = [
      priceText ? `Your quote: from ${priceText}` : "Your parking quote",
      "",
      `Airport: ${airport}`,
      `Service: ${service}`,
      `Drop-off: ${dropText}`,
      `Pick-up: ${pickText}`,
      "",
      `View live prices and book: ${resultsUrl}`,
      "",
      "Prices are live and can change with availability. This quote is a guide based on your search.",
      "",
      "AeroPark Direct Ltd. Registered in England and Wales, company number 17211973.",
    ].join("\n");

    // Send the quote to the customer.
    try {
      await resend.emails.send({
        from: "AeroPark Direct <bookings@aeroparkdirect.co.uk>",
        to: cleanEmail,
        subject: `Your ${service} quote for ${airport} — AeroPark Direct`,
        html: customerHtml,
        text: customerText,
      });
    } catch (err) {
      logger.error("email-quote: failed to send customer email", err);
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
        subject: `New quote lead: ${cleanEmail} (${String(airport).replace(/[\r\n]/g, " ")})`,
        html: `
          <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">
            <h2 style="margin:0 0 12px;">New "Email me this quote" lead</h2>
            <p style="margin:4px 0;"><strong>Email:</strong> ${esc(cleanEmail)}</p>
            <p style="margin:4px 0;"><strong>Airport:</strong> ${esc(airport)}</p>
            <p style="margin:4px 0;"><strong>Service:</strong> ${esc(service)}</p>
            <p style="margin:4px 0;"><strong>Drop-off:</strong> ${esc(dropText)}</p>
            <p style="margin:4px 0;"><strong>Pick-up:</strong> ${esc(pickText)}</p>
            <p style="margin:12px 0 0;"><a href="${esc(resultsUrl)}">${esc(resultsUrl)}</a></p>
          </div>`,
      });
    } catch (err) {
      logger.error("email-quote: failed to send internal lead notification", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("email-quote: unexpected error", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
