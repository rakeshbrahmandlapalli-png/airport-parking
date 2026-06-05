import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/app/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const rl = rateLimit(`notify-admin:${getClientIp(request)}`, 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }
  try {
    const body = await request.json();
    const { type, ref, oldDate, newDate, addedCost, oldFlight, newFlight } = body;

    let subject = '';
    let message = '';

    if (type === 'EXTENSION') {
      subject = `🚨 Booking Extended: ${ref}`;
      message = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Booking Extension Alert</h2>
          <p><strong>Reference:</strong> ${ref}</p>
          <p><strong>Old Return Date:</strong> ${oldDate}</p>
          <p><strong>New Return Date:</strong> ${newDate}</p>
          <p style="font-size: 18px; color: #10b981;"><strong>Additional Amount Due:</strong> £${addedCost.toFixed(2)}</p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 14px;"><em>Please ensure the operator is notified of this new return date.</em></p>
        </div>
      `;
    } else if (type === 'FLIGHT_CHANGE') {
      subject = `✈️ Flight Updated: ${ref}`;
      message = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Flight Detail Update</h2>
          <p><strong>Reference:</strong> ${ref}</p>
          <p><strong>Old Flight:</strong> ${oldFlight || 'None'}</p>
          <p><strong>New Flight:</strong> <span style="color: #2563eb; font-weight: bold;">${newFlight}</span></p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 14px;"><em>Please update your dispatch board.</em></p>
        </div>
      `;
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
    console.error("Resend Error:", error);
    return NextResponse.json({ success: false, error: "Failed to send email via Resend" }, { status: 500 });
  }
}