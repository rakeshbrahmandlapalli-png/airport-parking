import { NextResponse } from "next/server";
import { logAdminAction } from "@/app/lib/admin-logger";
import { logger } from "@/app/lib/logger";

// Bridge endpoint so the existing CLIENT-side admin pages can record audit
// entries without migrating every mutation to a Server Action. The browser
// sends its session cookie automatically (same-origin), and logAdminAction
// resolves the actor from that cookie SERVER-SIDE — the client never supplies
// (and cannot spoof) the user identity.
//
// Usage from an admin page, AFTER a successful mutation:
//   await fetch("/api/admin/audit", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       actionType: "promo.badge.update",
//       entityType: "promotion",
//       entityId: promo.id,
//       metadata: { label: "Promo Badge text", before: oldText, after: newText },
//     }),
//   });
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const actionType = typeof b.actionType === "string" ? b.actionType.trim() : "";
  if (!actionType) {
    return NextResponse.json({ error: "actionType is required." }, { status: 400 });
  }

  try {
    await logAdminAction({
      actionType,
      entityType: typeof b.entityType === "string" ? b.entityType : undefined,
      entityId: b.entityId != null ? String(b.entityId) : undefined,
      metadata: (b.metadata && typeof b.metadata === "object")
        ? (b.metadata as Record<string, unknown>)
        : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // logAdminAction already swallows its own errors, but guard the route too.
    logger.error("audit route: unexpected error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false }, { status: 200 }); // never block the UI on audit failure
  }
}
