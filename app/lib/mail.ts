import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY!);

// 🟢 DIRECT DATABASE CONNECTION: Ensures the email always finds the right instructions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatEmailDate = (dateStr: string) => {
  if (!dateStr) return "TBC";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); 
};

/**
 * Sends a highly polished, mobile-responsive booking confirmation or update.
 */
export const sendBookingReceipt = async (booking: any, passedCompany: any, isAmendment: boolean = false) => {
  try {
    let company = passedCompany;

    // 🟢 FAILSAFE: If the company object is missing, fetch it directly from Supabase
    if (!company) {
      console.log("⚠️ Mailer fixing missing company data...");
      try {
        if (booking.company_id && booking.company_id !== "null") {
          const { data } = await supabase.from('companies').select('*').eq('id', booking.company_id).maybeSingle();
          if (data) company = data;
        }
        if (!company) {
          // Final fallback for test bookings
          const { data } = await supabase.from('companies').select('*').ilike('name', '%Airport Parking Bay%').maybeSingle();
          if (data) company = data;
        }
      } catch (e) { console.error("Self-repair failed:", e); }
    }

    const isLuton = booking.airport?.toLowerCase().includes("luton");
    
    // Select instructions based on airport
    const arrivalInstructions = isLuton 
      ? (company?.on_arrival_ltn || company?.luton_arrival || company?.on_arrival || 'Please call the driver 20 minutes before arrival.') 
      : (company?.on_arrival_lhr || company?.heathrow_arrival || company?.on_arrival || 'Please call the driver 20 minutes before arrival.');
    
    const returnInstructions = isLuton 
      ? (company?.on_return_ltn || company?.luton_return || company?.on_return || 'Call dispatch after collecting your luggage.') 
      : (company?.on_return_lhr || company?.heathrow_return || company?.on_return || 'Call dispatch after collecting your luggage.');

    const mapsQuery = encodeURIComponent(`${company?.name || 'Airport'} ${company?.address || company?.physical_address || ''} ${company?.postcode || ''}`);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    
    // 🟢 MAPPING FIX: Safely extracts both unique dispatch fields from your database schema
    const phone1 = company?.dispatch_phone_1 || company?.dispatch_phone || company?.phone_number || '07397705005';
    const phone2 = company?.dispatch_phone_2 || '';
    
    const phone1Link = phone1.replace(/\s+/g, '');
    const phone2Link = phone2.replace(/\s+/g, '');
    
    const dropDate = formatEmailDate(booking.dropoff_date || booking.dropDate);
    const pickDate = formatEmailDate(booking.pickup_date || booking.pickDate);

    const statusText = isAmendment ? "Updated" : "Confirmed";
    const statusColor = isAmendment ? "#3b82f6" : "#059669"; 
    const statusBg = isAmendment ? "#eff6ff" : "#ecfdf5";

    const { data, error } = await resend.emails.send({
      from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
      to: [booking.email?.trim().toLowerCase() || booking.customerEmail?.trim().toLowerCase()],
      bcc: ['aeroparkdirect.co.uk+c6f8c1b490@invite.trustpilot.com'],
      subject: `✈️ Booking ${statusText}: ${booking.booking_ref} [${booking.license_plate || booking.licensePlate}]`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, system-ui, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background-color: #0f172a; padding: 40px 30px; text-align: center; border-bottom: 4px solid #2563eb;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -1px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase;">✓ ${statusText}</span>
                      <h2 style="margin: 20px 0; font-size: 42px; color: #0f172a; font-family: monospace; letter-spacing: 4px; font-weight: 900;">${booking.booking_ref}</h2>
                    </div>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; margin-bottom: 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Airport & Terminal</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">${booking.airport} • ${booking.terminal || 'Main'}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Registration</p>
                            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a;">${booking.license_plate || booking.licensePlate}</p>
                          </td>
                          <td width="50%">
                            <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 900;">Service Provider</p>
                            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #334155;">${company?.name || 'AeroPark Direct'}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="background-color: #0f172a; border-radius: 20px; padding: 24px; color: #ffffff;">
                      <h3 style="font-size: 14px; font-weight: 900; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #334155; padding-bottom: 15px;">Aero Concierge System</h3>
                      
                      <div style="background-color: #1e293b; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 900; color: #3b82f6; text-transform: uppercase;">Inbound • ${dropDate} @ ${booking.dropoff_time || 'TBC'}</p>
                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #f8fafc; line-height: 1.5;">${arrivalInstructions}</p>
                        <a href="tel:${phone1Link}" data-track="false" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; font-size: 12px; margin-right: 5px;">📞 ${phone1}</a>
                        ${phone2 ? `<a href="tel:${phone2Link}" data-track="false" style="display: inline-block; background-color: #334155; color: #ffffff; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; font-size: 12px;">📞 ${phone2}</a>` : ''}
                      </div>

                      <div style="background-color: #1e293b; border-left: 4px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 900; color: #10b981; text-transform: uppercase;">Return • ${pickDate} @ ${booking.pickup_time || 'TBC'}</p>
                        <p style="margin: 0 0 10px 0; font-size: 13px; color: #f8fafc; line-height: 1.5;">${returnInstructions}</p>
                        <a href="tel:${phone1Link}" data-track="false" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; font-size: 12px; margin-right: 5px;">📞 ${phone1}</a>
                        ${phone2 ? `<a href="tel:${phone2Link}" data-track="false" style="display: inline-block; background-color: #334155; color: #ffffff; text-decoration: none; padding: 8px 15px; border-radius: 6px; font-weight: 800; font-size: 12px;">📞 ${phone2}</a>` : ''}
                      </div>

                      <a href="${mapsLink}" style="background-color: #334155; color: #ffffff; text-decoration: none; padding: 15px 0; border-radius: 12px; font-weight: 900; font-size: 12px; display: block; text-align: center; text-transform: uppercase; letter-spacing: 1px;">📍 View Airport Directions</a>
                      
                      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #334155; text-align: center;">
                        <a href="https://www.aeroparkdirect.co.uk/manage" style="display: inline-block; color: #3b82f6; text-decoration: underline; font-weight: 800; font-size: 14px;">Manage Your Trip Online →</a>
                      </div>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 15px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">Need assistance or have a question?</p>
                      <p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b;">Reply to this email or contact us at <a href="mailto:info@aeroparkdirect.co.uk" style="color: #2563eb; font-weight: 700; text-decoration: none;">info@aeroparkdirect.co.uk</a></p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 30px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 800;">© ${new Date().getFullYear()} AeroPark Direct Ltd.</p>
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

    if (error) return { success: false, error };
    return { success: true, data };
  } catch (error) {
    console.error("System Email Error:", error);
    return { success: false, error };
  }
};

/**
 * Sends an internal alert to the admin and an update to the customer.
 */
export const sendAmendmentAlerts = async (booking: any, company: any) => {
  try {
    await resend.emails.send({
      from: 'AeroPark System <info@aeroparkdirect.co.uk>', 
      to: ['info@aeroparkdirect.co.uk'], 
      subject: `🚨 BOOKING AMENDED: ${booking.booking_ref}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #eab308; margin-bottom: 10px;">⚠️ Action Required: Booking Amended</h2>
          <p>Customer <strong>${booking.full_name}</strong> just changed their dates.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 20px;">
            <p><strong>Ref:</strong> ${booking.booking_ref}</p>
            <p><strong>Vehicle:</strong> ${booking.license_plate}</p>
            <p style="color: #2563eb;"><strong>New Drop-off:</strong> ${new Date(booking.dropoff_date).toLocaleDateString()} @ ${booking.dropoff_time}</p>
            <p style="color: #2563eb;"><strong>New Return:</strong> ${new Date(booking.pickup_date).toLocaleDateString()} @ ${booking.pickup_time}</p>
          </div>
        </div>
      `
    });

    await sendBookingReceipt(booking, company, true);
  } catch (error) {
    console.error("Failed to send amendment alerts:", error);
  }
};

/**
 * Sends an automated review request.
 */
export const sendReviewRequest = async (customerEmail: string, customerName: string, bookingRef: string) => {
  try {
    await resend.emails.send({
      from: "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to: customerEmail,
      subject: `Welcome back! How was your experience? (${bookingRef})`,
      html: `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: auto; padding: 30px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
          <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900;">AEROPARK<span style="color: #3b82f6;">DIRECT</span></h1>
          <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 20px; margin-top: 20px;">
            <h2 style="color: #0f172a; margin-top: 0;">Welcome Home, ${customerName.split(' ')[0]}! ✈️</h2>
            <p style="color: #475569; line-height: 1.6;">We hope you had a fantastic trip. Would you mind taking 60 seconds to review our service?</p>
            <div style="margin: 30px 0;">
              <a href="https://uk.trustpilot.com/evaluate/aeroparkdirect.co.uk" 
                 style="background-color: #059669; color: white; padding: 18px 32px; text-decoration: none; border-radius: 16px; font-weight: 900; text-transform: uppercase; display: inline-block;">
                Leave a 5-Star Review
              </a>
            </div>
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