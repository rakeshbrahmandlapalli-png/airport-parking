/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: state lives per serverless instance, so this is a best-effort guard
 * against runaway cost / abuse — not a distributed quota. For hard global
 * limits, back this with Upstash Redis. For our purposes (stopping a single
 * client hammering the AI endpoints) per-instance limiting is sufficient and
 * has zero external dependencies.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Periodically evict expired buckets so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

/**
 * @param key      Unique caller identity (usually an IP + route name).
 * @param limit    Max requests allowed per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit = 12, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSec: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const ok = existing.count <= limit;
  return {
    ok,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Best-effort client IP extraction from a Request's headers. */
export function getClientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}
