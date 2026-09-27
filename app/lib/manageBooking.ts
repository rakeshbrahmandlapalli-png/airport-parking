import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Customer self-service (manage, cancel, update flight): finding a booking and
// deciding what the customer may see.
//
// Proof of ownership is the booking reference AND the lead passenger's name.
// The name used to be matched with ilike("%name%"), which let "%%" (or "**",
// PostgREST's alias for %) match any name, so a reference alone was enough.
// Now the booking is fetched by reference and the name is compared here, as
// whole words: "Smith" or "John Smith" match "John Smith"; "%%" and "ohn" do not.
// ─────────────────────────────────────────────────────────────────────────────

/** The window promised to customers: free cancellation up to 24h before drop-off. */
export const FREE_WINDOW_HOURS = 24;

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // accents: "José" matches "Jose"
    .replace(/['’]/g, "")               // "O'Brien" and "OBrien" are the same name
    .replace(/[^a-z\- ]+/g, " ")
    .split(/[\s\-]+/)
    .filter(Boolean);
}

/** Every word the customer typed must be a whole word of the name on the booking. */
export function nameMatches(storedName: string, enteredName: string): boolean {
  const entered = nameWords(enteredName);
  if (entered.length === 0 || !entered.some((w) => w.length >= 2)) return false;
  const stored = new Set(nameWords(storedName));
  return entered.every((w) => stored.has(w));
}

/** Newest booking with this reference whose lead-passenger name matches, or null. */
export async function findOwnedBooking(
  supabase: SupabaseClient,
  ref: string,
  fullName: string,
  columns = "*",
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(columns.includes("full_name") || columns === "*" ? columns : `${columns}, full_name`)
    .eq("booking_ref", ref)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data || []) as any[]).find((b) => nameMatches(String(b.full_name || ""), fullName)) || null;
}

/** Drop-off as a real moment. The date is a plain YYYY-MM-DD and is read as
 *  local, or a midnight booking shifts a day and the window is computed
 *  against the wrong date. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dropoffMoment(booking: any): Date | null {
  const raw = String(booking?.dropoff_date || "").split("T")[0];
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = String(booking?.dropoff_time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isInsideFreeWindow(booking: any): boolean {
  const drop = dropoffMoment(booking);
  const hoursLeft = drop ? (drop.getTime() - Date.now()) / 3_600_000 : null;
  return hoursLeft !== null && hoursLeft < FREE_WINDOW_HOURS;
}

// What the customer's browser may see. Never the whole row: bookings carry
// commission, click ids and Stripe ids; companies carry API tokens, email and
// commission rates.
const BOOKING_FIELDS = [
  "booking_ref", "full_name", "airport", "terminal", "service_type",
  "dropoff_date", "dropoff_time", "pickup_date", "pickup_time",
  "flight_number", "license_plate", "car_make", "car_color",
  "total_price", "status",
] as const;

const COMPANY_FIELDS = [
  "name", "phone_number", "phone_number_2",
  "on_arrival", "on_arrival_ltn", "on_arrival_lhr",
  "on_return", "on_return_ltn", "on_return_lhr",
] as const;

function pick<T extends Record<string, unknown>>(row: T | null, fields: readonly string[]) {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in row) out[f] = row[f];
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publicBooking = (row: any) => pick(row, BOOKING_FIELDS);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const publicCompany = (row: any) => pick(row, COMPANY_FIELDS);
