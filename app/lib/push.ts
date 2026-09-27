import "server-only";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

// ─────────────────────────────────────────────────────────────────────────────
// Web push to admin devices (the AP Admin app). Used for "new booking" alerts.
//
// Needs three env vars (Vercel → Settings → Environment Variables):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  public key — the browser subscribes with it
//   VAPID_PRIVATE_KEY             private key — signs every push; never public
//   VAPID_SUBJECT                 optional, defaults to mailto:info@aeroparkdirect.co.uk
// If the keys are missing, sending is a logged no-op: a booking never fails
// because of a notification.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@aeroparkdirect.co.uk", pub, priv);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return configure();
}

export interface PushMessage {
  title: string;
  body: string;
  /** Admin page to open when the notification is tapped. */
  url?: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
}

type Row = { id: string; endpoint: string; p256dh: string; auth: string };

/** Send to every subscribed admin device (or only one user's). Never throws. */
export async function sendAdminPush(message: PushMessage, opts: { userId?: string } = {}): Promise<{ sent: number; failed: number }> {
  if (!configure()) {
    logger.info("[push] Skipped — VAPID keys not configured.");
    return { sent: 0, failed: 0 };
  }
  try {
    let q = supabaseAdmin.from("admin_push_subscriptions").select("id, endpoint, p256dh, auth");
    if (opts.userId) q = q.eq("user_id", opts.userId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []) as Row[];

    const payload = JSON.stringify({ url: "/admin", ...message });
    let sent = 0;
    let failed = 0;
    const gone: string[] = [];
    const used: string[] = [];

    await Promise.all(rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          payload,
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        sent++;
        used.push(r.id);
      } catch (e: unknown) {
        failed++;
        const status = (e as { statusCode?: number })?.statusCode;
        // 404/410: the device unsubscribed or the app was removed — forget it.
        if (status === 404 || status === 410) gone.push(r.id);
        else logger.error("[push] send failed:", status || (e as Error)?.message);
      }
    }));

    if (gone.length) await supabaseAdmin.from("admin_push_subscriptions").delete().in("id", gone);
    if (used.length) await supabaseAdmin.from("admin_push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
    return { sent, failed };
  } catch (e: unknown) {
    logger.error("[push] sendAdminPush failed:", (e as Error)?.message || e);
    return { sent: 0, failed: 0 };
  }
}

/** Short date like "Sat 10 Oct" from YYYY-MM-DD, without timezone shifts. */
function shortDate(d: string | null | undefined): string {
  const [y, m, day] = String(d || "").split("T")[0].split("-").map(Number);
  if (!y || !m || !day) return "";
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * "New booking" alert. Deliberately no customer name, email or phone: a
 * notification shows on a lock screen. Reference, airport, service, drop-off
 * and amount are enough to know what came in and open it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function notifyNewBooking(b: any): Promise<{ sent: number; failed: number }> {
  const price = Number(b?.total_price) ? `£${Number(b.total_price).toFixed(2)}` : "";
  const airport = String(b?.airport || "").replace(/\s*\(.*\)\s*/, "");
  const drop = [shortDate(b?.dropoff_date), String(b?.dropoff_time || "").slice(0, 5)].filter(Boolean).join(" ");
  const body = [
    [airport, b?.service_type].filter(Boolean).join(" · "),
    drop && `Drop-off ${drop}`,
    b?.booking_ref,
  ].filter(Boolean).join("\n");
  return sendAdminPush({
    title: `New booking${price ? ` · ${price}` : ""}`,
    body,
    url: "/admin",
    tag: `booking-${b?.booking_ref || Date.now()}`,
  });
}
