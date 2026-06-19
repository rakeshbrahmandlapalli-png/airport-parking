"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/app/lib/supabase";

interface Promo {
  code: string;
  discount_percent: number;
  is_active: boolean;
  expiry_date: string | null;
}

interface Slide {
  text: string;
  code: string;
}

const getMessage = (pct: number, code: string) => {
  if (code === "AERO15")   return "Returning Traveler? Get 15% off your 3rd booking!";
  if (code === "LAUNCH10") return "Launch Offer: Save 10% on your airport parking today!";
  if (code === "AERO5")    return "First time? Save 5% on your first booking!";
  if (code === "AERO1")    return "Exclusive member rate — 1% extra off every trip!";
  return `Save ${pct}% on your next booking!`;
};

const FALLBACK_SLIDES: Slide[] = [
  { text: "Launch Offer: Save 10% on your airport parking today!", code: "LAUNCH10" },
  { text: "Returning Traveller? Get 15% off your 3rd booking!",    code: "AERO15"  },
];

const SLIDE_DURATION = 5000; // ms per slide

export default function PromoBanner() {
  const [mounted,   setMounted]   = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [slides,    setSlides]    = useState<Slide[]>(FALLBACK_SLIDES);
  const [current,   setCurrent]   = useState(0);
  const [fading,    setFading]    = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null); // 🟢 per-code, not boolean

  // 🟢 Use refs to avoid stale closures in interval callbacks
  const animatingRef = useRef(false);
  const currentRef   = useRef(0);
  const slidesRef    = useRef<Slide[]>(FALLBACK_SLIDES);

  // Keep refs in sync
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // ── Load live promos from DB ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    // 🟢 FIXED: Dismiss expires after 24h — not forever
    const dismissedAt = sessionStorage.getItem("apd_promo_closed_at");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) return;
    setIsVisible(true);

    supabase
      .from("promotions")
      .select("code, discount_percent, is_active, expiry_date")
      .eq("is_active", true)
      .then(({ data }) => {
        if (!data?.length) return;
        const now  = new Date();
        const live = data.filter(
          (p: Promo) => !p.expiry_date || new Date(p.expiry_date) > now
        );
        if (!live.length) return;
        const mapped = live.map((p: Promo) => ({
          text:  getMessage(p.discount_percent, p.code),
          code:  p.code,
        }));
        setSlides(mapped);
        slidesRef.current = mapped;
        setCurrent(0);
      });
  }, []);

  // ── 🟢 FIXED: goTo uses refs — no stale closure ──────────────────────────
  const goTo = useCallback((next: number) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setFading(true);

    setTimeout(() => {
      setCurrent(next);
      currentRef.current = next;
      setCopiedCode(null); // 🟢 reset copy state when slide changes
      setFading(false);
      animatingRef.current = false;
    }, 250);
  }, []); // no deps needed — uses refs

  // ── Auto-advance timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      const next = (currentRef.current + 1) % slidesRef.current.length;
      goTo(next);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, [slides.length, goTo]); // 🟢 no `current` dep → interval never resets mid-cycle

  // ── Copy code to clipboard ────────────────────────────────────────────────
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard blocked — graceful silent fail
    }
  };

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("apd_promo_closed_at", String(Date.now())); // expires after 24h
  };

  if (!mounted || !isVisible || !slides.length) return null;

  const slide = slides[current];

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative shadow-md overflow-hidden">

      {/* ── Main content row ── */}
      <div className="flex items-center justify-center gap-2 px-10 py-2.5 min-h-[42px]">

        {/* Slide with fade */}
        <div
          className="flex items-center gap-2 justify-center transition-opacity duration-500"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <span className="text-xs md:text-sm font-medium tracking-wide text-center leading-tight">
            {slide.text}
          </span>

          {/* 🟢 Per-slide copy badge */}
          <button
            type="button"
            onClick={() => copyCode(slide.code)}
            title="Click to copy promo code"
            className="inline-flex items-center gap-1.5 bg-white text-blue-700 px-2.5 py-0.5 rounded font-black tracking-wider uppercase text-[10px] md:text-xs ml-1 shadow-sm hover:bg-blue-50 active:scale-95 transition-all shrink-0 select-none"
          >
            {copiedCode === slide.code ? (
              <><span>✓</span> Copied!</>
            ) : (
              <>Code: {slide.code}</>
            )}
          </button>
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 ml-4 shrink-0">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-4 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dismiss × */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors duration-200 text-white/80 hover:text-white"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>

      {/* 🟢 Progress bar — uses named Tailwind animation from tailwind.config.js */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
          <div
            key={`progress-${current}`}  // key change restarts the CSS animation
            className="h-full bg-white/50 animate-progress"
          />
        </div>
      )}
    </div>
  );
}