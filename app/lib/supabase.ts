import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. SAFETY NET
if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 Missing Supabase Environment Variables! Check your Vercel dashboard.");
  throw new Error("Missing Supabase environment variables.");
}

/**
 * 2. OPS CENTER OPTIMIZED CLIENT
 * We enable 'realtime' configuration here so your Live Dispatch 
 * board updates the second a customer pays via Stripe.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
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