"use client";
import { useState, useEffect } from "react";

interface TimerProps {
  hours?: number;
  slotsClaimed?: number;
  totalSlots?: number;
  onTimerEnd?: () => void;
  badge?: string;
  title?: string;
  subtitle?: string;
  benefitTitle?: string;
  benefitValue?: string;
  benefitNote?: string;
}

export default function LaunchTimer({
  hours = 72,
  slotsClaimed = 6,
  totalSlots = 15,
  onTimerEnd,
  badge = "Live Launch Event",
  title = "Founding Member Launch",
  subtitle = "Secure your spot · 5% lifetime discount",
  benefitTitle = "Founding Members Get",
  benefitValue = "5% Lifetime Discount",
  benefitNote = "Plus priority access to new features",
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const validHours = Math.max(1, Math.min(8760, hours));
  const validTotal = Math.max(1, totalSlots);
  const validClaimed = Math.max(0, Math.min(validTotal, slotsClaimed));
  const slotsLeft = validTotal - validClaimed;
  const isCritical = slotsLeft <= 3;
  const slotPct = Math.round((validClaimed / validTotal) * 100);

  const d = timeLeft ? Math.floor(timeLeft / 86400000) : 0;
  const h = timeLeft ? Math.floor((timeLeft % 86400000) / 3600000) : 0;
  const m = timeLeft ? Math.floor((timeLeft % 3600000) / 60000) : 0;
  const s = timeLeft ? Math.floor((timeLeft % 60000) / 1000) : 0;
  const timePct = timeLeft ? Math.round((timeLeft / (validHours * 3600000)) * 100) : 100;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const KEY = `ap_lct_v1_${validHours}`;
    let end: number | null = null;
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        end = parseInt(s, 10);
        if (isNaN(end) || end <= Date.now()) { localStorage.removeItem(KEY); end = null; }
      }
      if (!end) { end = Date.now() + validHours * 3600000; localStorage.setItem(KEY, String(end)); }
    } catch { end = Date.now() + validHours * 3600000; }
    const endTime = end;
    setTimeLeft(Math.max(0, endTime - Date.now()));
    const interval = setInterval(() => {
      const rem = Math.max(0, endTime - Date.now());
      setTimeLeft(rem);
      if (rem === 0) onTimerEnd?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, validHours, onTimerEnd]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (!mounted || timeLeft === null) {
    return (
      <div style={S.card}>
        <span style={{ fontSize: 11, color: "#2a3a5c" }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={S.card}>
      {/* Top glow */}
      <div style={S.topGlow} />

      {/* Badge */}
      <div style={S.badge}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        {badge}
      </div>

      <p style={S.title}>{title}</p>
      <p style={S.sub}>{subtitle}</p>

      {/* Timer digits */}
      <div style={S.timerRow}>
        {[
          { v: d, l: "Days" },
          { v: h, l: "Hours" },
          { v: m, l: "Mins" },
          { v: s, l: "Secs" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={S.colon}>:</span>}
            <div style={S.unit}>
              <span style={S.num}>{pad(item.v)}</span>
              <span style={S.lbl}>{item.l}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Time bar */}
      <div style={S.barLabel}>
        <span>Time remaining</span>
        <span style={{ color: "#3b82f6", fontWeight: 700 }}>{timePct}%</span>
      </div>
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, width: `${timePct}%`, background: "linear-gradient(90deg, #1d4ed8, #3b82f6)" }} />
      </div>

      <div style={S.divider} />

      {/* Benefit */}
      <div style={S.benefit}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
        </svg>
        <div>
          <p style={S.benefitTitle}>{benefitTitle}</p>
          <p style={S.benefitVal}>{benefitValue}</p>
          <p style={S.benefitNote}>{benefitNote}</p>
        </div>
      </div>

      {/* Availability */}
      <div style={S.availRow}>
        <span style={{ color: isCritical ? "#f59e0b" : "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
          {isCritical ? `⚠ Only ${slotsLeft} left` : "Availability"}
        </span>
        <span style={{ color: "#475569", fontSize: 11, fontWeight: 600 }}>{validClaimed} / {validTotal} slots</span>
      </div>
      <div style={S.barTrack}>
        <div style={{
          ...S.barFill,
          width: `${slotPct}%`,
          background: isCritical ? "#f59e0b" : "#4ade80",
          boxShadow: isCritical ? "0 0 8px rgba(245,158,11,0.4)" : "0 0 8px rgba(74,222,128,0.3)",
        }} />
      </div>
      <div style={{ textAlign: "right" as const, fontSize: 10, color: isCritical ? "#f59e0b" : "#334155", marginTop: 3, fontWeight: 600 }}>
        {slotPct}% filled{isCritical ? ` · Only ${slotsLeft} spots left!` : ""}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: "linear-gradient(160deg, #0d1526 0%, #0a1020 100%)",
    border: "1px solid #1a2844",
    borderRadius: 20,
    padding: "18px 20px 16px",
    maxWidth: 420,
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  topGlow: {
    position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
    background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const,
    color: "#60a5fa",
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.18)",
    borderRadius: 100, padding: "3px 10px", marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 2px", letterSpacing: "-0.01em" },
  sub: { fontSize: 11, color: "#334155", margin: "0 0 14px", fontWeight: 500 },
  timerRow: { display: "flex", alignItems: "center", gap: 4, marginBottom: 10 },
  unit: { textAlign: "center" as const },
  num: {
    fontFamily: "'Courier New', monospace",
    fontSize: 26, fontWeight: 800, color: "#f1f5f9",
    background: "#080f1c",
    border: "1px solid #1a2844",
    borderRadius: 8, padding: "7px 10px",
    display: "block", lineHeight: 1, minWidth: 48,
    letterSpacing: "0.05em",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
  },
  lbl: { fontSize: 9, color: "#1e2d45", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginTop: 4, display: "block", fontWeight: 700 },
  colon: { fontSize: 20, fontWeight: 800, color: "#1e3a6e", paddingBottom: 14 },
  barLabel: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", fontWeight: 600, marginBottom: 4 },
  barTrack: { height: 3, background: "#0d1a2e", borderRadius: 2, overflow: "hidden", marginBottom: 12 },
  barFill: { height: "100%", borderRadius: 2, transition: "width 0.6s ease" },
  divider: { borderTop: "1px solid #0d1a2e", margin: "10px 0" },
  benefit: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: "#080f1c", border: "1px solid #0d1a2e",
    borderRadius: 10, padding: "8px 10px", marginBottom: 10,
  },
  benefitTitle: { fontSize: 10, fontWeight: 700, color: "#94a3b8", margin: "0 0 1px", letterSpacing: "0.04em" },
  benefitVal: { fontSize: 13, fontWeight: 800, color: "#4ade80", margin: "0 0 1px", letterSpacing: "-0.01em" },
  benefitNote: { fontSize: 10, color: "#1e2d45", margin: 0, fontWeight: 500 },
  availRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
};
