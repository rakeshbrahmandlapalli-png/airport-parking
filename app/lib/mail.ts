import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendBookingReceipt = async (
  customerEmail: string, 
  flightNumber: string, 
  parkingType: string,
  bookingRef: string,
  customerPhone: string, 
  carDetails: string,    
  notes: string          
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Airport VIP Parking <onboarding@resend.dev>',
      to: [customerEmail],
      // 🔥 Automatically alert Swift Airport Parking
      bcc: ['ops@swiftairportparking.co.uk'], 
      subject: `✈️ Booking Confirmed: ${bookingRef} [${carDetails.split(' - ')[0]}]`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; background-color: #f1f5f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            
            <div style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">Booking Confirmed</h1>
            </div>
            
            <div style="padding: 40px;">
              <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Hello,</h2>
              <p>Your reservation with <strong>Airport VIP Parking</strong> is officially secured. Please have this voucher ready when arriving at the terminal.</p>
              
              <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; margin: 30px 0; border: 1px solid #e2e8f0;">
                
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Booking Reference</p>
                  <p style="margin: 0; font-size: 20px; font-weight: 900; color: #2563eb;">${bookingRef}</p>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                  <tr>
                    <td width="50%" style="vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Vehicle Registration</p>
                      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${carDetails.split(' - ')[0]}</p>
                    </td>
                    <td width="50%" style="vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Contact Number</p>
                      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${customerPhone}</p>
                    </td>
                  </tr>
                </table>

                <div style="margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Make & Color</p>
                  <p style="margin: 0; font-size: 15px; font-weight: 500;">${carDetails.split(' - ')[1] || 'Details provided at terminal'}</p>
                </div>

                <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Trip Information</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Flight:</strong> ${flightNumber} | <strong>Service:</strong> ${parkingType}</p>
                </div>

                ${notes ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Additional Notes</p>
                  <p style="margin: 5px 0 0 0; font-size: 13px; font-style: italic; color: #475569;">"${notes}"</p>
                </div>
                ` : ''}
              </div>
              
              <div style="font-size: 13px; color: #64748b; background-color: #fff7ed; padding: 15px; border-radius: 12px; border-left: 4px solid #f97316;">
                <strong>Arrival Tip:</strong> Call the driver 20 minutes before you arrive at the Luton terminal to ensure a priority handover.
              </div>
              
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