import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. SAFETY NET: Prevent cryptic crashes during deployment
if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 Missing Supabase Environment Variables! Check your .env.local file or Vercel dashboard.");
  throw new Error("Missing Supabase environment variables.");
}

// 2. ENHANCED CLIENT: Auto-refresh tokens so the Admin stays logged in
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});