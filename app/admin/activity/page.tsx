"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";

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
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-fg-3">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg antialiased flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight">Activity log</h1>
          <p className="mt-1 text-sm text-fg-3">Every change made in admin, newest first.</p>
          <div className="mt-6">
            <AdminActivityFeed limit={100} />
          </div>
        </div>
      </main>
      <AdminMobileNav />
    </div>
  );
}
