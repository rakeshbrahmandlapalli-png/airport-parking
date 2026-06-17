import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side gate for the admin area. The Supabase session lives in cookies
 * (see app/lib/supabase.ts), so the edge middleware can verify it and block
 * unauthenticated or non-admin access to /admin BEFORE any admin code or data
 * loads — real protection, not just a client-side redirect that hides the UI.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with Supabase (not just decodes it).
  const { data: { user } } = await supabase.auth.getUser();

  // Authorisation, not just authentication: a valid session is only an admin if
  // the email is on the AeroPark domain — the same predicate the RLS policies
  // enforce. This blocks any non-admin authenticated user from the dashboard.
  const email = (user?.email ?? "").toLowerCase();
  const isAdmin = !!user && email.endsWith("@aeroparkdirect.co.uk");

  const path = req.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";

  if (isAdminArea && !isLoginPage && !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // If already signed in as an admin, keep them off the login page.
  if (isLoginPage && isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
