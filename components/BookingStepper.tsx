"use client";

import { Check, Lock } from "lucide-react";

interface StepperProps {
  currentStep: 1 | 2 | 3;
  clickableSteps?: boolean;
  onStepClick?: (step: number) => void;
}

export default function BookingStepper({
  currentStep,
  clickableSteps = false,
  onStepClick,
}: StepperProps) {
  const steps = [
    { id: 1, label: "Select", sub: "Choose Space" },
    { id: 2, label: "Details", sub: "Your Info" },
    { id: 3, label: "Payment", sub: "Secure Checkout" },
  ];

  const pct = ((currentStep - 1) / 2) * 100;

  return (
    <div className="w-full max-w-lg mx-auto mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Card */}
      <div
        style={{
          background: "linear-gradient(160deg, #0d1526 0%, #0a1020 100%)",
          border: "1px solid #1a2844",
          borderRadius: 20,
          padding: "20px 28px 16px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Top glow line */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)",
        }} />

        {/* Track area */}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>

          {/* Rail background */}
          <div style={{
            position: "absolute", top: 19, left: 20, right: 20, height: 2,
            background: "#1a2844", borderRadius: 2,
          }} />

          {/* Progress fill */}
          <div style={{
            position: "absolute", top: 19, left: 20, height: 2,
            width: `calc(${pct}% * (100% - 40px) / 100)`,
            background: "linear-gradient(90deg, #1d4ed8, #60a5fa)",
            borderRadius: 2,
            boxShadow: "0 0 8px rgba(96,165,250,0.6)",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }} />

          {steps.map((step) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id;
            const upcoming = currentStep < step.id;

            return (
              <div key={step.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
                <button
                  onClick={() => clickableSteps && !upcoming && onStepClick?.(step.id)}
                  disabled={!clickableSteps || upcoming}
                  aria-current={active ? "step" : undefined}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: "none",
                    cursor: clickableSteps && !upcoming ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    transition: "all 0.4s ease",
                    outline: "none",
                    ...(done ? {
                      background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                      boxShadow: "0 0 0 3px rgba(59,130,246,0.15), 0 4px 12px rgba(37,99,235,0.5)",
                    } : active ? {
                      background: "#0a1020",
                      boxShadow: "0 0 0 2px #3b82f6, 0 0 20px rgba(59,130,246,0.3), inset 0 0 12px rgba(59,130,246,0.08)",
                      transform: "scale(1.15)",
                    } : {
                      background: "#0d1526",
                      boxShadow: "0 0 0 1px #1a2844",
                    }),
                  }}
                >
                  {/* Pulse for active */}
                  {active && (
                    <>
                      <span style={{
                        position: "absolute", inset: -6, borderRadius: "50%",
                        border: "1px solid rgba(59,130,246,0.3)",
                        animation: "stepPulse 2s ease-out infinite",
                      }} />
                      <span style={{
                        position: "absolute", inset: -3, borderRadius: "50%",
                        border: "1px solid rgba(59,130,246,0.2)",
                        animation: "stepPulse 2s ease-out infinite 0.4s",
                      }} />
                    </>
                  )}
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{
                      fontSize: 12, fontWeight: 800, lineHeight: 1,
                      color: active ? "#60a5fa" : "#2a3a5c",
                    }}>
                      {step.id}
                    </span>
                  )}
                </button>

                {/* Label block */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: done ? "#2a3a5c" : active ? "#60a5fa" : "#1a2844",
                    transition: "color 0.3s",
                  }}>
                    {step.label}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 500, letterSpacing: "0.06em",
                    color: active ? "rgba(96,165,250,0.45)" : "#131e30",
                    transition: "color 0.3s",
                  }}>
                    {step.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom trust strip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          marginTop: 14, paddingTop: 12,
          borderTop: "1px solid #111d30",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2a3a5c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2a3a5c" }}>
            256-bit SSL Encrypted &nbsp;·&nbsp; Powered by Stripe
          </span>
        </div>
      </div>

      <style>{`
        @keyframes stepPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      <div className="sr-only" aria-live="polite">
        Step {currentStep} of 3: {steps[currentStep - 1]?.label}
      </div>
    </div>
  );
}
