import { createServerClient } from "@supabase/ssr";

/**
 * Authorization guard for API route handlers.
 *
 * Validates the Supabase session carried on the request and confirms the user
 * is an AeroPark admin (email on the @aeroparkdirect.co.uk domain — the same
 * predicate the RLS policies use). Returns the user on success, or null for an
 * unauthenticated or non-admin caller.
 *
 * Auth cookies are read directly off the Request so this works in any route
 * handler without depending on the next/headers API. It performs a read-only
 * check and never writes a refreshed session cookie back.
 */
export async function getAdminUser(req: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => parseCookieHeader(req.headers.get("cookie") ?? ""),
        setAll: () => {},
      },
    }
  );

  // getUser() validates the JWT with Supabase rather than trusting the cookie.
  const { data: { user } } = await supabase.auth.getUser();
  const email = (user?.email ?? "").toLowerCase();

  if (!user || !email.endsWith("@aeroparkdirect.co.uk")) return null;
  return user;
}

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return [];
  return header
    .split(";")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return null;
      const name = pair.slice(0, eq).trim();
      const value = decodeURIComponent(pair.slice(eq + 1).trim());
      return name ? { name, value } : null;
    })
    .filter((c): c is { name: string; value: string } => c !== null);
}
