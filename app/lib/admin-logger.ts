import "server-only";
// ============================================================================
// lib/admin-logger.ts — Admin Audit Ledger (server-only)
//
// Records human admin actions to public.admin_audit_logs. Designed to be called
// from Server Actions OR Route Handlers (anywhere with request cookies).
//
// Security model:
//  • The actor (user_id/email) is resolved from the validated SESSION COOKIE on
//    the server — never trusted from the client payload, so it can't be spoofed.
//  • The row is inserted with the SERVICE ROLE key, which bypasses RLS. Combined
//    with an RLS policy that grants NO insert/update/delete to clients, the
//    ledger is append-only and tamper-proof from the browser.
//  • Audit logging must NEVER throw into the business action it records — every
//    path is caught and downgraded to a logger.error.
// ============================================================================

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import type { AuditMetadata } from "./domain";

// Tamper-proof writer (bypasses RLS). Never exposed to the browser.
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Resolve the authenticated admin from the request's session cookie. */
async function resolveActor(): Promise<{ id: string; email: string | null } | null> {
  try {
    const cookieStore = await cookies(); // async in Next 15/16
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => { /* read-only context — no cookie mutation needed */ },
        },
      }
    );
    // getUser() validates the JWT with Supabase (doesn't just decode it).
    const { data: { user } } = await supa.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch (err) {
    logger.error("admin-logger: failed to resolve actor", { err: errMsg(err) });
    return null;
  }
}

export interface LogAdminActionInput {
  /** Namespaced verb, e.g. "promo.badge.update", "pricing.surcharge.update". */
  actionType: string;
  /** The kind of record affected, e.g. "company" | "promotion" | "setting". */
  entityType?: string;
  /** The affected row id (text — supports non-uuid ids). */
  entityId?: string | null;
  /** Structured context, typically { label, before, after }. */
  metadata?: AuditMetadata;
}

/**
 * Insert one audit-ledger row. Safe to `await` inside a server action; resolves
 * to void and never throws. Skips silently (with a warning) if there is no
 * authenticated admin in context.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    if (!input?.actionType) {
      logger.warn("admin-logger: missing actionType — skipping");
      return;
    }

    const actor = await resolveActor();
    if (!actor) {
      logger.warn("admin-logger: no authenticated actor — skipping audit insert", {
        actionType: input.actionType,
      });
      return;
    }

    const { error } = await serviceClient.from("admin_audit_logs").insert({
      user_id:     actor.id,
      user_email:  actor.email,
      action_type: input.actionType,
      entity_type: input.entityType ?? null,
      entity_id:   input.entityId != null ? String(input.entityId) : null,
      metadata:    input.metadata ?? {},
    });

    if (error) {
      logger.error("admin-logger: failed to write audit log", {
        err: error.message, actionType: input.actionType,
      });
    } else {
      logger.info("admin action recorded", {
        actionType: input.actionType, entityId: input.entityId, by: actor.email,
      });
    }
  } catch (err) {
    // Audit logging must never break the action it records.
    logger.error("admin-logger: unexpected error", { err: errMsg(err) });
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
