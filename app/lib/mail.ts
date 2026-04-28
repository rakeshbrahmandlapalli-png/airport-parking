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
      from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
      to: [customerEmail.trim().toLowerCase()],
      subject: `✈️ Booking Confirmed: ${bookingRef} [${registration}]`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* 🟢 MOBILE RESPONSIVE CSS */
          @media only screen and (max-width: 600px) {
            .main-wrapper { padding: 10px !important; }
            .container { width: 100% !important; border-radius: 12px !important; border: none !important; }
            .content-pad { padding: 30px 20px !important; }
            .ref-code { font-size: 30px !important; letter-spacing: 2px !important; }
            /* This class forces the side-by-side tables to stack on top of each other on mobile */
            .mobile-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 20px !important; box-sizing: border-box !important; }
            .hide-border-mobile { border-bottom: 1px dashed #cbd5e1 !important; padding-bottom: 20px !important; }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 0; background-color: #f8fafc; margin: 0; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc;">
          <tr>
            <td class="main-wrapper" align="center" style="padding: 40px 20px;">
              
              <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); margin: 0 auto; text-align: left;">
                
                <tr>
                  <td style="background-color: #0f172a; padding: 40px 30px; text-align: center; border-bottom: 4px solid #2563eb;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
                    <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 12px 0 0 0; font-weight: bold;">Secure Parking Reservation</p>
                  </td>
                </tr>

                <tr>
                  <td class="content-pad" style="padding: 40px 30px;">
                    
                    <div style="text-align: center; margin-bottom: 40px;">
                      <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">✓ Status: Confirmed</span>
                      <h2 class="ref-code" style="margin: 24px 0 8px 0; font-size: 42px; color: #0f172a; font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: 4px; font-weight: 900; white-space: nowrap;">${bookingRef}</h2>
                      <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">Please present this reference upon arrival</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px;">
                      
                      <div style="margin-bottom: 25px;">
                        <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Meeting Location</p>
                        <p style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a;">${airport}</p>
                        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 800; color: #2563eb;">${terminal}</p>
                      </div>

                      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />

                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td class="mobile-stack hide-border-mobile" width="50%" valign="top" style="padding-bottom: 25px; padding-right: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Vehicle Registration</p>
                            <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a; font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: 2px;">${registration}</p>
                          </td>
                          <td class="mobile-stack" width="50%" valign="top" style="padding-bottom: 25px; padding-left: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Contact Number</p>
                            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a; word-break: break-all;">${customerPhone}</p>
                          </td>
                        </tr>
                        <tr>
                          <td class="mobile-stack hide-border-mobile" width="50%" valign="top" style="padding-right: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Make & Color</p>
                            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${makeAndColor}</p>
                          </td>
                          <td class="mobile-stack" width="50%" valign="top" style="padding-left: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Service & Flight</p>
                            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${flightNumber} <br> ${parkingType}</p>
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
                    
                    <div style="margin-top: 30px; background-color: #0f172a; border: 1px solid #1e293b; padding: 24px; border-radius: 16px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="20" valign="top" style="padding-top: 2px;">
                            <div style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981;"></div>
                          </td>
                          <td>
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Aero Concierge System</p>
                            <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.6;">
                              Your digital concierge, <strong>Aero</strong>, has securely verified your details with <strong>${parkingType}</strong>. 
                              <br><br>
                              <span style="color: #60a5fa; font-weight: 600;">Dispatch Instruction:</span><br>
                              ${arrivalTip}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="margin-top: 40px; text-align: center;">
                      <a href="https://aeroparkdirect.co.uk/manage" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 16px; font-weight: 900; font-size: 13px; display: inline-block; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">Manage Your Trip</a>
                    </div>

                  </td>
                </tr>
                
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 30px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800;">© ${new Date().getFullYear()} AeroPark Direct.</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">Need help? Contact our 24/7 Concierge: <br><a href="mailto:info@aeroparkdirect.co.uk" style="color: #2563eb; text-decoration: none; font-weight: 700; line-height: 2;">info@aeroparkdirect.co.uk</a></p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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