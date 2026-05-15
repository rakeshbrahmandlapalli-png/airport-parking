import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const formatEmailDate = (dateStr: string) => {
  if (!dateStr) return "TBC";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); 
};

/**
 * Sends a highly polished, mobile-responsive booking confirmation or update.
 * Pulls dynamic arrival/return instructions from the partner company profile.
 */
export const sendBookingReceipt = async (booking: any, company: any, isAmendment: boolean = false) => {
  try {
    // 1. Determine Airport Context
    const isLuton = booking.airport?.toLowerCase().includes("luton");
    
    // 2. Select dynamic instructions from the Database (With safety fallbacks)
    const arrivalInstructions = isLuton 
      ? (company?.on_arrival_ltn || company?.on_arrival || 'Please call the driver 20 minutes before arrival to confirm your exact arrival time.') 
      : (company?.on_arrival_lhr || company?.on_arrival || 'Please call the driver 20 minutes before arrival to confirm your exact arrival time.');
    
    const returnInstructions = isLuton 
      ? (company?.on_return_ltn || company?.on_return || 'Instructions for vehicle collection will be provided at the terminal or via phone.') 
      : (company?.on_return_lhr || company?.on_return || 'Instructions for vehicle collection will be provided at the terminal or via phone.');

    // 3. Setup Navigation & Dates
    // 🟢 FIXED: Using the official Google Maps Search API (works universally on all devices)
    const mapsQuery = encodeURIComponent(`${company?.name || 'Airport'} ${company?.address || ''} ${company?.postcode || ''}`);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    
    // DUAL PHONE NUMBER LOGIC
    const phone1 = company?.phone_number || '07700 900 123';
    const phone2 = company?.phone_number_2 || '';
    
    // Clean spaces for the actual click links
    const phone1Link = phone1.replace(/\s+/g, '');
    const phone2Link = phone2.replace(/\s+/g, '');
    
    const dropDate = formatEmailDate(booking.dropoff_date || booking.dropDate);
    const pickDate = formatEmailDate(booking.pickup_date || booking.pickDate);

    // 4. Dynamic Text based on whether it's a new booking or an update
    const statusText = isAmendment ? "Updated" : "Confirmed";
    const statusColor = isAmendment ? "#3b82f6" : "#059669"; 
    const statusBg = isAmendment ? "#eff6ff" : "#ecfdf5";

    const { data, error } = await resend.emails.send({
      from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
      to: [booking.email?.trim().toLowerCase() || booking.customerEmail?.trim().toLowerCase()],
      // 🟢 TRUSTPILOT AUTOMATED REVIEW BCC:
      bcc: ['aeroparkdirect.co.uk+c6f8c1b490@invite.trustpilot.com'],
      subject: `✈️ Booking ${statusText}: ${booking.booking_ref} [${booking.license_plate || booking.licensePlate}]`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* MOBILE RESPONSIVE OVERRIDES */
          @media only screen and (max-width: 600px) {
            .main-wrapper { padding: 10px !important; }
            .container { width: 100% !important; border-radius: 12px !important; border: none !important; }
            .content-pad { padding: 25px 20px !important; }
            .ref-code { font-size: 36px !important; letter-spacing: 2px !important; }
            .mobile-stack { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 20px !important; box-sizing: border-box !important; }
            .hide-border-mobile { border-bottom: 1px dashed #cbd5e1 !important; padding-bottom: 20px !important; }
            .btn-phone { display: block !important; width: 100% !important; margin-right: 0 !important; margin-bottom: 10px !important; text-align: center !important; box-sizing: border-box !important; }
          }
        </style>
      </head>
      <body style="font-family: -apple-system, system-ui, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc;">
          <tr>
            <td class="main-wrapper" align="center" style="padding: 40px 20px;">
              
              <table class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); margin: 0 auto; text-align: left;">
                
                <tr>
                  <td style="background-color: #0f172a; padding: 40px 30px; text-align: center; border-bottom: 4px solid #2563eb;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -1px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
                    <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 12px 0 0 0; font-weight: bold;">Secure Parking Reservation</p>
                  </td>
                </tr>

                <tr>
                  <td class="content-pad" style="padding: 40px 30px;">
                    
                    <div style="text-align: center; margin-bottom: 40px;">
                      <span style="background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">✓ Status: ${statusText}</span>
                      <h2 class="ref-code" style="margin: 24px 0 8px 0; font-size: 42px; color: #0f172a; font-family: ui-monospace, monospace; letter-spacing: 4px; font-weight: 900;">${booking.booking_ref}</h2>
                      <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">Please present this reference upon arrival</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 30px;">
                      
                      <div style="margin-bottom: 25px;">
                        <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Meeting Location</p>
                        <p style="margin: 6px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a;">${booking.airport}</p>
                        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 800; color: #2563eb;">${booking.terminal || 'Main Terminal'}</p>
                      </div>

                      <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />

                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td class="mobile-stack hide-border-mobile" width="50%" valign="top" style="padding-bottom: 25px; padding-right: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Registration</p>
                            <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a; font-family: ui-monospace, monospace; letter-spacing: 2px;">${booking.license_plate || booking.licensePlate}</p>
                          </td>
                          <td class="mobile-stack" width="50%" valign="top" style="padding-bottom: 25px; padding-left: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Contact Number</p>
                            <p style="margin: 6px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a;">${booking.phone_number || booking.customerPhone || 'N/A'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td class="mobile-stack hide-border-mobile" width="50%" valign="top" style="padding-right: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Service Provider</p>
                            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${company?.name || 'AeroPark Direct'}</p>
                          </td>
                          <td class="mobile-stack" width="50%" valign="top" style="padding-left: 10px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900;">Service & Flight</p>
                            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${booking.flight_number || booking.flightNumber || 'TBC'}<br>${booking.service_type || booking.parkingType || 'Premium Meet & Greet'}</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background-color: #0f172a; border-radius: 20px; padding: 24px; margin-top: 30px; border: 1px solid #1e293b;">
                      <h3 style="color: #ffffff; font-size: 14px; font-weight: 900; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 15px;">Aero Concierge System</h3>

                      <div style="background-color: #1e293b; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">Inbound • ${dropDate} @ ${booking.dropoff_time || 'TBC'}</p>
                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #f8fafc; line-height: 1.6;">${arrivalInstructions}</p>
                        
                        <div style="border-top: 1px solid #334155; padding-top: 16px;">
                          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Dispatch Numbers</p>
                          <a href="tel:${phone1Link}" class="btn-phone" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 900; font-size: 14px; margin-right: 8px; margin-bottom: 8px;">📞 ${phone1}</a>
                          ${phone2 ? `<a href="tel:${phone2Link}" class="btn-phone" style="display: inline-block; background-color: #334155; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 900; font-size: 14px; border: 1px solid #475569; margin-bottom: 8px;">📞 ${phone2}</a>` : ''}
                        </div>
                      </div>

                      <div style="background-color: #1e293b; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 1px;">Return • ${pickDate} @ ${booking.pickup_time || 'TBC'}</p>
                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #f8fafc; line-height: 1.6;">${returnInstructions}</p>

                        <div style="border-top: 1px solid #334155; padding-top: 16px;">
                          <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Dispatch Numbers</p>
                          <a href="tel:${phone1Link}" class="btn-phone" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 900; font-size: 14px; margin-right: 8px; margin-bottom: 8px;">📞 ${phone1}</a>
                          ${phone2 ? `<a href="tel:${phone2Link}" class="btn-phone" style="display: inline-block; background-color: #334155; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 900; font-size: 14px; border: 1px solid #475569; margin-bottom: 8px;">📞 ${phone2}</a>` : ''}
                        </div>
                      </div>

                      <a href="${mapsLink}" style="background-color: #334155; color: #ffffff; text-decoration: none; padding: 16px 0; border-radius: 12px; font-weight: 900; font-size: 12px; display: block; text-align: center; text-transform: uppercase; letter-spacing: 1px;">📍 View Airport Directions</a>
                    </div>

                    <div style="margin-top: 30px; text-align: center;">
                      <a href="https://www.aeroparkdirect.co.uk/manage" style="font-size: 13px; color: #64748b; text-decoration: underline; font-weight: 700;">Manage Your Trip Online</a>
                    </div>

                  </td>
                </tr>
                
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 30px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 800;">© ${new Date().getFullYear()} AeroPark Direct.</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500;">Need help? <a href="mailto:info@aeroparkdirect.co.uk" style="color: #2563eb; text-decoration: none; font-weight: 700;">info@aeroparkdirect.co.uk</a></p>
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
      console.error("Resend Error Details:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("System Email Error:", error);
    return { success: false, error };
  }
};

/**
 * Sends an internal alert to you, and an updated voucher to the customer.
 */
export const sendAmendmentAlerts = async (booking: any, company: any) => {
  try {
    // 1. Alert the Admin (You) to notify the provider
    await resend.emails.send({
      from: 'AeroPark System <info@aeroparkdirect.co.uk>', 
      to: ['info@aeroparkdirect.co.uk'], 
      subject: `🚨 BOOKING AMENDED: ${booking.booking_ref}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #eab308; margin-bottom: 10px;">⚠️ Action Required: Booking Amended</h2>
          <p>Customer <strong>${booking.full_name}</strong> just changed their dates. Please update the service provider.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 20px;">
            <p><strong>Ref:</strong> ${booking.booking_ref}</p>
            <p><strong>Vehicle:</strong> ${booking.license_plate || booking.licensePlate}</p>
            <p style="color: #2563eb;"><strong>New Drop-off:</strong> ${new Date(booking.dropoff_date).toLocaleDateString()} @ ${booking.dropoff_time}</p>
            <p style="color: #2563eb;"><strong>New Return:</strong> ${new Date(booking.pickup_date).toLocaleDateString()} @ ${booking.pickup_time}</p>
            <p><strong>Provider:</strong> ${company?.name || 'Aero Direct'}</p>
          </div>
        </div>
      `
    });

    // 2. Send the customer their updated voucher (Passes 'true' for isAmendment flag)
    await sendBookingReceipt(booking, company, true);
    
  } catch (error) {
    console.error("Failed to send amendment alerts:", error);
  }
};

/**
 * 🟢 Automated 5-Star Review Request Email
 * Call this from the dashboard when a booking is marked as 'Completed'
 */
export const sendReviewRequest = async (customerEmail: string, customerName: string, bookingRef: string) => {
  try {
    await resend.emails.send({
      from: "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to: customerEmail,
      subject: `Welcome back! How was your parking experience? (${bookingRef})`,
      html: `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
          </div>

          <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); text-align: center;">
            <h2 style="color: #0f172a; margin-top: 0;">Welcome Home, ${customerName.split(' ')[0]}! ✈️</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 15px;">We hope you had a fantastic trip and a smooth journey back.</p>
            <p style="color: #475569; line-height: 1.6; font-size: 15px;">At <strong>AeroPark Direct</strong>, we are a growing business, and your feedback means the world to us. Would you mind taking 60 seconds to tell us how we did?</p>
            
            <div style="margin: 40px 0;">
              <a href="https://uk.trustpilot.com/evaluate/aeroparkdirect.co.uk" 
                 style="background-color: #059669; color: white; padding: 18px 32px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3);">
                Leave a 5-Star Review
              </a>
            </div>

            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you had any issues at all, please reply directly to this email. Our management team reads every reply and wants to ensure you are 100% satisfied.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Ref: ${bookingRef} | AeroPark Direct Ltd</p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Review Email Error:", error);
    return { success: false, error };
  }
};