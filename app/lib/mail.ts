import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendBookingReceipt = async (
  customerEmail: string, 
  flightNumber: string, 
  parkingType: string,
  bookingRef: string // 🔥 Added this 4th parameter
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Airport VIP Parking <onboarding@resend.dev>',
      to: [customerEmail],
      // Tip: Add your own email here to get a copy of every booking!
      // bcc: ['your-email@gmail.com'], 
      subject: `✈️ Booking Confirmed: ${bookingRef}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Confirmed</h1>
            </div>
            
            <div style="padding: 40px;">
              <h2 style="margin-top: 0; font-size: 20px;">Hello,</h2>
              <p>Your reservation with <strong>Airport VIP Parking</strong> is officially secured. We have your details and will be ready for your arrival.</p>
              
              <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; margin: 30px 0; border: 1px solid #f1f5f9;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Booking Reference</p>
                <p style="margin: 0 0 20px 0; font-size: 22px; font-weight: 900; color: #0f172a;">${bookingRef}</p>
                
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Return Flight</p>
                <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: bold;">${flightNumber}</p>
                
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Service Type</p>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #2563eb;">${parkingType}</p>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">You can manage your booking or print your receipt at any time by visiting our "Manage Trip" portal using your reference code.</p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0; font-weight: bold; color: #0f172a;">Safe travels!</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Airport VIP Parking Team</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
};