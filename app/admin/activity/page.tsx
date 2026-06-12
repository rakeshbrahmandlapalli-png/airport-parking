"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { ArrowLeft, Plane } from "lucide-react";

export default function AdminActivityPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/admin/login");
      else setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060A14] text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
        Loading ledger…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#060A14] text-white antialiased">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#060A14]/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Ops Center
          </Link>
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-tighter">
            <Plane className="h-4 w-4 rotate-45 text-blue-500" /> Activity Ledger
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <AdminActivityFeed limit={100} />
      </div>
    </main>
  );
}
