import { Check } from "lucide-react";

/** Aero's avatar: the blue tile with two eyes. Brand asset — keep it. */
export function AeroAvatar({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <span className={`${className} bg-blue-600 rounded-lg inline-flex items-center justify-center gap-[18%] shrink-0`} aria-hidden="true">
      <span className="w-[10%] h-[34%] bg-white rounded-full" />
      <span className="w-[10%] h-[34%] bg-white rounded-full" />
    </span>
  );
}

const POINTS = [
  "Give it your flight number and it works out the airport and terminal.",
  "Understands dates like “next Friday for a week” or “back Sunday night”.",
  "Adds a short tip where it matters, like the ULEZ charge at Heathrow, very early flights or last-minute trips.",
];

// A worked example of what Aero Magic Search does with one sentence. Static —
// it illustrates the tool, the real one is in the search panel above.
const EXAMPLE = {
  query: "BA123 from T5, back Sunday night",
  rows: [
    { label: "Airport", value: "Heathrow, Terminal 5" },
    { label: "Flight", value: "BA123" },
    { label: "Service", value: "Meet & Greet" },
    { label: "Return", value: "Sunday, evening" },
  ],
};

export default function AeroFeature() {
  return (
    <section aria-labelledby="aero-heading" className="py-16 md:py-24 px-4 md:px-6 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto grid gap-10 lg:gap-16 lg:grid-cols-2 items-center">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <AeroAvatar className="w-9 h-9" />
            <span className="text-sm font-semibold text-slate-900">Aero Magic Search</span>
          </div>
          <h2 id="aero-heading" className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Describe your trip. Aero fills in the search.
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed">
            Aero is our search assistant. Type or say your trip in one sentence and it turns it into a
            parking search, then shows you what it understood before you go any further.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-slate-700">
                <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:p-6">
          <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900">
            {EXAMPLE.query}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200">
              <AeroAvatar className="w-6 h-6" />
              <span className="text-sm font-semibold text-slate-900">Aero understood</span>
            </div>
            <dl className="divide-y divide-slate-100">
              {EXAMPLE.rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-slate-500">{r.label}</dt>
                  <dd className="font-medium text-slate-900 text-right">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figcaption className="mt-3 text-xs text-slate-500">Example of a search typed into Aero.</figcaption>
        </figure>
      </div>
    </section>
  );
}
