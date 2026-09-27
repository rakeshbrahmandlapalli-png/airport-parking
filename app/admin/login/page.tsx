"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Logo from "@/components/site/Logo";

const inputCls = "w-full h-12 rounded-lg border border-fg/15 bg-canvas px-3.5 text-base text-fg placeholder:text-fg-4 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  // proxy.ts sends people here with ?redirect=/admin/… — go back there after
  // signing in. Only admin paths, so the parameter can't be used to bounce
  // someone to another site.
  const redirect = params.get("redirect") || "";
  const next = redirect.startsWith("/admin") && !redirect.startsWith("/admin/login") ? redirect : "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (authError) {
        setError("That email and password don't match an admin account.");
        setLoading(false);
      } else {
        router.push(next);
      }
    } catch {
      setError("We couldn't reach the sign-in service. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="mt-6 space-y-4">
      <div>
        <label htmlFor="admin-email" className="block text-sm font-medium text-fg-2 mb-1.5">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          required
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="block text-sm font-medium text-fg-2 mb-1.5">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          required
        />
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Signing in…</> : "Sign in"}
      </button>
    </form>
  );
}

export default function AdminLogin() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-10 font-sans text-fg">
      <div className="w-full max-w-sm">
        <Logo tone="dark" className="h-7 w-auto admin-light:hidden" priority />
        <Logo tone="light" className="h-7 w-auto hidden admin-light:block" />
        <div className="mt-6 rounded-xl border border-fg/10 bg-panel p-6">
          <h1 className="text-xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-fg-3">For AeroPark Direct staff.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to the website
        </Link>
      </div>
    </main>
  );
}
