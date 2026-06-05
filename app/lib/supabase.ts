import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. SAFETY NET
if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 Missing Supabase Environment Variables! Check your Vercel dashboard.");
  throw new Error("Missing Supabase environment variables.");
}

/**
 * 2. COOKIE-BASED BROWSER CLIENT (@supabase/ssr)
 * The admin session is now stored in cookies (not localStorage) so the Next.js
 * middleware can verify it on the server and truly gate /admin — not just hide
 * the UI. Realtime is enabled so the Live Dispatch board updates the moment a
 * customer pays via Stripe.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Optimized for busy booking days
    },
  },
});

/**
 * 3. HELPER: LIVE DISPATCH CHANNEL
 * Call this function in your Admin Dashboard to listen for 
 * new bookings without ever hitting the refresh button.
 */
export const subscribeToNewBookings = (callback: (payload: any) => void) => {
  return supabase
    .channel('live-dispatch')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookings' },
      (payload) => callback(payload)
    )
    .subscribe();
};