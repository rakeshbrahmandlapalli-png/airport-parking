"use client";

// Client-side helper for recording admin actions from the (client-rendered)
// admin pages. Posts to the /api/admin/audit bridge, which resolves the actor
// from the session cookie server-side and writes via the service role.
//
// Fire-and-forget by design: a failed audit write must NEVER block or break the
// admin action it accompanies. Always `await` is optional — call and move on.

export interface RecordAdminActionInput {
  /** Namespaced verb, e.g. "promo.update", "pricing.surcharge.update". */
  actionType: string;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAdminAction(input: RecordAdminActionInput): Promise<void> {
  try {
    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      keepalive: true, // still delivers if the page navigates immediately after
    });
  } catch {
    /* non-fatal — never surface audit failures to the admin UI */
  }
}
