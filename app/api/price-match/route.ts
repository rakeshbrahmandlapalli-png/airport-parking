import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, link } = await req.json();

    await resend.emails.send({
      // Use an email address tied to your verified aeroparkdirect.co.uk domain
      from: 'Aeropark Direct info@aeroparkdirect.co.uk>', 
      to: 'info@aeroparkdirect.co.uk',
      subject: `Price Match Request: ${name}`,
      text: `New Price Match Request received via www.aeroparkdirect.co.uk\n\nCustomer Name: ${name}\nEmail: ${email}\nCompetitor Link/Quote: ${link}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Price Match Email Error:", error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}