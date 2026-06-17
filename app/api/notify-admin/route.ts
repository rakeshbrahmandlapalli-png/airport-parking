import { logger } from "@/app/lib/logger";
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/app/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

// Escape untrusted values before interpolating them into the HTML alert.
function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const rl = rateLimit(`notify-admin:${getClientIp(request)}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }
  try {
    const body = await request.json();
    const { type, ref, oldDate, newDate, addedCost, oldFlight, newFlight } = body;

    const safeRef = escapeHtml(ref);
    const addedCostNum = Number(addedCost);
    const addedCostStr = isNaN(addedCostNum) ? "0.00" : addedCostNum.toFixed(2);

    let subject = '';
    let message = '';

    if (type === 'EXTENSION') {
      subject = `Booking Extended: ${safeRef}`;
      message = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Booking Extension Alert</h2>
          <p><strong>Reference:</strong> ${safeRef}</p>
          <p><strong>Old Return Date:</strong> ${escapeHtml(oldDate)}</p>
          <p><strong>New Return Date:</strong> ${escapeHtml(newDate)}</p>
          <p style="font-size: 18px; color: #10b981;"><strong>Additional Amount Due:</strong> £${addedCostStr}</p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 14px;"><em>Please ensure the operator is notified of this new return date.</em></p>
        </div>
      `;
    } else if (type === 'FLIGHT_CHANGE') {
      subject = `Flight Updated: ${safeRef}`;
      message = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Flight Detail Update</h2>
          <p><strong>Reference:</strong> ${safeRef}</p>
          <p><strong>Old Flight:</strong> ${escapeHtml(oldFlight || 'None')}</p>
          <p><strong>New Flight:</strong> <span style="color: #2563eb; font-weight: bold;">${escapeHtml(newFlight)}</span></p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 14px;"><em>Please update your dispatch board.</em></p>
        </div>
      `;
    } else {
      return NextResponse.json({ success: false, error: 'Unknown notification type.' }, { status: 400 });
    }

    // Send the email via Resend
    const data = await resend.emails.send({
      from: 'AeroPark System <system@aeroparkdirect.co.uk>', // Must be your verified domain in Resend
      to: 'info@aeroparkdirect.co.uk',
      subject: subject,
      html: message,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    logger.error("Resend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to send email via Resend" }, { status: 500 });
  }
}