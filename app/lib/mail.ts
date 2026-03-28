import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendBookingReceipt = async (
  customerEmail: string, 
  flightNumber: string, 
  parkingType: string
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Airport VIP Parking <onboarding@resend.dev>', // We use this testing address for now
      to: [customerEmail],
      subject: '✈️ Your Parking Booking is Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Booking Confirmed!</h2>
          <p>Thank you for booking with Airport VIP Parking.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p><strong>Flight Number:</strong> ${flightNumber}</p>
            <p><strong>Parking Type:</strong> ${parkingType}</p>
          </div>
          <p style="margin-top: 20px;">Safe travels!</p>
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