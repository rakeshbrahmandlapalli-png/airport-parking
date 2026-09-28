import { logger } from "@/app/lib/logger";
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getClientIp } from '@/app/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const rl = rateLimit(`price-match:${getClientIp(req)}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }
  try {
    const { name, email, link } = await req.json();

    await resend.emails.send({
      // Use an email address tied to your verified aeroparkdirect.co.uk domain
      from: 'AeroPark Direct <info@aeroparkdirect.co.uk>',
      to: 'info@aeroparkdirect.co.uk',
      subject: `Cheaper quote sent in: ${String(name || '').slice(0, 80)}`,
      text: `A customer sent in a cheaper quote via "Seen it cheaper?" on www.aeroparkdirect.co.uk. Reply to them by email.\n\nName: ${name}\nEmail: ${email}\nOther quote: ${link}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Price Match Email Error:", error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}