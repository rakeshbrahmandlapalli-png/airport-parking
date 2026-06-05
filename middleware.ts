import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side gate for the admin area. Because the Supabase session now lives in
 * cookies (see app/lib/supabase.ts), the edge middleware can verify it and block
 * unauthenticated access to /admin BEFORE any admin code or data loads — real
 * protection, not just a client-side redirect that hides the UI.
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

  const path = req.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";

  if (isAdminArea && !isLoginPage && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // If already authenticated, keep users off the login page.
  if (isLoginPage && user) {
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
