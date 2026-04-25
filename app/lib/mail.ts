import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendBookingReceipt = async (
  customerEmail: string, 
  flightNumber: string, 
  parkingType: string,
  bookingRef: string,
  customerPhone: string, 
  carDetails: string,    
  notes: string,
  airport: string,     
  terminal: string     
) => {
  try {
    // Safety check for vehicle details formatting
    const registration = carDetails.includes(' - ') ? carDetails.split(' - ')[0] : carDetails;
    const makeAndColor = carDetails.includes(' - ') ? carDetails.split(' - ')[1] : 'Details provided at terminal';

    // Dynamic arrival instruction based on airport
    const isHeathrow = airport.includes("Heathrow");
    const arrivalTip = isHeathrow 
      ? `Call the operator exactly 30 minutes before arriving at the <strong>${terminal} Short Stay car park</strong> to ensure a priority handover.`
      : `Call the operator exactly 20 minutes before you arrive at the <strong>Luton terminal (Car Park 1)</strong> to ensure a priority handover.`;

    const { data, error } = await resend.emails.send({
      from: 'AeroPark Direct Parking <onboarding@resend.dev>', // Update this to your verified domain later (e.g., bookings@airportvip.com)
      to: [customerEmail.trim().toLowerCase()],
      subject: `✈️ Booking Confirmed: ${bookingRef} [${registration}]`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
            
            <div style="background-color: #0f172a; padding: 40px 30px; text-align: center; border-bottom: 4px solid #2563eb;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
              <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 12px 0 0 0; font-weight: bold;">Secure Parking Reservation</p>
            </div>
            
            <div style="padding: 40px 30px;">
              
              <div style="text-align: center; margin-bottom: 40px;">
                <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">✓ Status: Confirmed</span>
                <h2 style="margin: 24px 0 8px 0; font-size: 42px; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 4px; font-weight: 900;">${bookingRef}</h2>
                <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">Please present this reference upon arrival</p>
              </div>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px;">
                
                <div style="margin-bottom: 25px;">
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Meeting Location</p>
                  <p style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a;">${airport}</p>
                  <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 800; color: #2563eb;">${terminal}</p>
                </div>

                <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" style="padding-bottom: 25px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Vehicle Registration</p>
                      <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a; font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: 2px;">${registration}</p>
                    </td>
                    <td width="50%" style="padding-bottom: 25px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Contact Number</p>
                      <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a;">${customerPhone}</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Make & Color</p>
                      <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${makeAndColor}</p>
                    </td>
                    <td width="50%" style="vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Service & Flight</p>
                      <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${flightNumber} | ${parkingType}</p>
                    </td>
                  </tr>
                </table>

                ${notes ? `
                <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />
                <div>
                  <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Additional Notes</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px; font-style: italic; color: #475569; line-height: 1.6;">"${notes}"</p>
                </div>
                ` : ''}
              </div>
              
              <div style="margin-top: 30px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 6px solid #2563eb; padding: 24px; border-radius: 12px;">
                <p style="margin: 0; font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;">🚨 Important Arrival Instructions</p>
                <p style="margin: 0; font-size: 14px; color: #1e3a8a; line-height: 1.6;">${arrivalTip}</p>
              </div>
              
              <div style="margin-top: 40px; text-align: center;">
                <a href="https://yourdomain.com/manage" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 16px; font-weight: 900; font-size: 13px; display: inline-block; text-transform: uppercase; letter-spacing: 2px;">Manage Your Trip Online</a>
              </div>
            </div>
            
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800;">© ${new Date().getFullYear()} AeroPark Direct Parking.</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">Need help? Contact our 24/7 Concierge: <a href="mailto:support@airportvip.com" style="color: #2563eb; text-decoration: none; font-weight: 700;">support@airportvip.com</a></p>
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