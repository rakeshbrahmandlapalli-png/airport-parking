"use client";

interface StepperProps {
  currentStep: 1 | 2 | 3;
  clickableSteps?: boolean;
  onStepClick?: (step: number) => void;
  /** "dark" (default) keeps the existing checkout look; "light" is used on
   *  the results page test. */
  theme?: "dark" | "light";
}

const STEPS = [
  { id: 1, label: "Select" },
  { id: 2, label: "Details" },
  { id: 3, label: "Payment" },
] as const;

// A slim, text-led progress rail — not a bordered card with glowing circles.
// One accent colour, no gradients, no shadows: it should read as a status
// line, not a decoration.
export default function BookingStepper({
  currentStep,
  clickableSteps = false,
  onStepClick,
  theme = "dark",
}: StepperProps) {
  const light = theme === "light";

  return (
    <nav aria-label="Booking progress" className={`w-full max-w-lg mx-auto mb-8 pb-4 border-b ${light ? "border-slate-200" : "border-slate-800"}`}>
      <ol className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          const upcoming = currentStep < step.id;
          const clickable = clickableSteps && !upcoming;

          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => clickable && onStepClick?.(step.id)}
                disabled={!clickable}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black ${
                    done
                      ? "bg-blue-600 text-white"
                      : active
                      ? "border-2 border-blue-500 text-blue-600"
                      : light
                      ? "border border-slate-300 text-slate-400"
                      : "border border-slate-700 text-slate-500"
                  }`}
                >
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    active
                      ? light ? "text-slate-900" : "text-white"
                      : done
                      ? light ? "text-slate-500" : "text-slate-400"
                      : light ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {i < STEPS.length - 1 && (
                <span className={`mx-3 h-px flex-1 ${done ? "bg-blue-600" : light ? "bg-slate-200" : "bg-slate-800"}`} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="sr-only" aria-live="polite">
        Step {currentStep} of 3: {STEPS[currentStep - 1]?.label}
      </div>
    </nav>
  );
}
