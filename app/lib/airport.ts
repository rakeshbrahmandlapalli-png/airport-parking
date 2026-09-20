// Which airport a booking is for, and whose instructions may be shown for it.
//
// Sending a Luton customer to Heathrow is the worst thing this codebase can do:
// they find out at a terminal, with a flight to catch. It has already happened
// once — a Luton booking was assigned to the Heathrow operator and the customer
// caught it, not the system.
//
// Everything here is deliberately strict. When we cannot prove which airport a
// booking is for, or that an operator serves it, we say less rather than
// guessing. Pure functions, no imports, so both the emails and the text
// messages read the same rules.

export type AirportCode = "LTN" | "LHR";

export const AIRPORT_NAME: Record<AirportCode, string> = {
  LTN: "London Luton Airport",
  LHR: "London Heathrow Airport",
};

/**
 * The airport a booking is for, or null when the field cannot prove it.
 *
 * The old test was `airport.includes("luton")`, with everything else treated as
 * Heathrow — so an empty field, a typo, or the bare code "LTN" all quietly
 * became Heathrow. Codes are matched on word boundaries so "lhr" inside another
 * word cannot trigger them, and a value naming both airports returns null
 * rather than picking one.
 */
export function detectAirport(raw: unknown): AirportCode | null {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return null;
  const luton = /luton/.test(s) || /\bltn\b/.test(s);
  const heathrow = /heathrow/.test(s) || /\blhr\b/.test(s);
  if (luton && heathrow) return null; // ambiguous: never guess
  if (luton) return "LTN";
  if (heathrow) return "LHR";
  return null;
}

/** Does this operator trade at that airport? Unknown company → no. */
export function operatesAt(company: any, code: AirportCode | null): boolean {
  if (!company || !code) return false;
  return code === "LTN" ? !!company.operates_at_luton : !!company.operates_at_heathrow;
}

/** The airports an operator serves, used to judge whether generic text is safe. */
export function airportsOf(company: any): AirportCode[] {
  const out: AirportCode[] = [];
  if (company?.operates_at_luton) out.push("LTN");
  if (company?.operates_at_heathrow) out.push("LHR");
  return out;
}

export type InstructionSource = "specific" | "generic" | "none";

export interface ResolvedInstructions {
  text: string;
  source: InstructionSource;
  /** Set when something was wrong enough to be worth logging. */
  warning?: string;
}

const FALLBACK = {
  arrival: "Your parking is confirmed. We will confirm your drop-off details and the number to call before you travel. If you have not heard from us the day before, please contact us.",
  return: "When you land, please contact us and we will confirm where to collect your car.",
};

/**
 * The arrival or return wording to show for THIS booking at THIS airport.
 *
 * Rules, in order:
 *  1. No airport, or the operator does not serve it → show neither operator's
 *     wording. Guessing here is how a customer ends up at the wrong airport.
 *  2. The airport's own field (on_arrival_lhr / on_arrival_ltn) wins.
 *  3. The generic field is used ONLY when the operator serves exactly one
 *     airport, so that text cannot belong to the other one. An operator working
 *     both airports with only generic text gets the safe fallback instead.
 */
export function instructionsFor(
  company: any,
  code: AirportCode | null,
  kind: "arrival" | "return",
): ResolvedInstructions {
  const safe = { text: FALLBACK[kind], source: "none" as const };

  if (!code) {
    return { ...safe, warning: "booking has no recognisable airport — operator instructions withheld" };
  }
  if (!company) return safe;
  if (!operatesAt(company, code)) {
    return {
      ...safe,
      warning: `operator "${company?.name ?? "unknown"}" does not operate at ${code} but is attached to a ${code} booking — instructions withheld`,
    };
  }

  // `?? ""` matters: String(undefined) is the five-letter word "undefined",
  // which is truthy and would have been posted to a customer as their
  // instructions.
  const specific = String(
    (kind === "arrival"
      ? (code === "LTN" ? company.on_arrival_ltn : company.on_arrival_lhr)
      : (code === "LTN" ? company.on_return_ltn : company.on_return_lhr)) ?? "",
    ).trim();
  if (specific) return { text: specific, source: "specific" };

  const generic = String((kind === "arrival" ? company.on_arrival : company.on_return) ?? "").trim();
  const serves = airportsOf(company);
  if (generic && serves.length === 1 && serves[0] === code) {
    return { text: generic, source: "generic" };
  }
  if (generic) {
    return {
      ...safe,
      warning: `operator "${company?.name ?? "unknown"}" has only generic ${kind} text but serves ${serves.join(" and ")} — cannot prove it is for ${code}`,
    };
  }
  return { ...safe, warning: `operator "${company?.name ?? "unknown"}" has no ${kind} instructions for ${code}` };
}

/**
 * The terminal key to read from terminal_data. Only defaults where the default
 * is safe: Luton has one terminal, Heathrow has five, so a Heathrow booking
 * with no terminal gets no terminal rather than being sent to Terminal 2.
 */
export function terminalKeyFor(bookingTerminal: unknown, code: AirportCode | null): string {
  const t = String(bookingTerminal ?? "").trim();
  if (t) return t;
  return code === "LTN" ? "Main Terminal" : "";
}
