"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";

export interface LivePromo {
  code: string;
  percent: number;      // 0.15 for 15%
  message: string | null;
}

/**
 * The promo the site is currently advertising, or null.
 *
 * One hook so the results page, the checkout warning and the promo bar can
 * never disagree about which code is live — a results page promising 15% off a
 * code checkout then rejects is worse than showing no offer at all.
 *
 * Same rules as the banner: active, and not past its expiry date. If several
 * are active it takes the largest, because that is the one a customer would
 * feel cheated to have missed.
 */
export function useLivePromo(): LivePromo | null {
  const [promo, setPromo] = useState<LivePromo | null>(null);

  useEffect(() => {
    let live = true;

    supabase
      .from("promotions")
      // `*` not a column list: `message` may not exist on an older database,
      // and naming it there would turn that into a 400 that hides every offer.
      .select("*")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (!live || error || !data?.length) return;

        const now = new Date();
        const usable = data
          .filter((p) => !p.expiry_date || new Date(p.expiry_date) > now)
          .map((p) => ({
            code: String(p.code || "").trim(),
            percent: Number(p.discount_percent) / 100,
            message: (p.message ?? null) as string | null,
          }))
          // A nonsense percentage must never reach a price. Anything at or below
          // zero, or above 100%, is a data-entry slip, not an offer.
          .filter((p) => p.code && p.percent > 0 && p.percent <= 1)
          .sort((a, b) => b.percent - a.percent);

        if (usable.length) setPromo(usable[0]);
      });

    return () => { live = false; };
  }, []);

  return promo;
}
