// ============================================================================
// lib/logger.ts — System-level logger (developer / app-health)
//
// Goals:
//  • Pretty, readable output in development (info/warn/error/debug).
//  • STRICTLY SILENT in production console — except sanitized error strings, so
//    we never leak PII or Stripe payloads into Vercel/host server logs.
//  • Pluggable transports (Sentry/Datadog/etc.) without touching call sites.
//
// Universal module: safe to import from both server and client code (uses only
// console + process.env.NODE_ENV). It does NOT import server-only APIs.
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Implement this to forward logs to Sentry, Datadog, Logtail, etc. */
export interface LogTransport {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}

const isProd = process.env.NODE_ENV === "production";
const isServer = typeof window === "undefined";

// ── Redaction ────────────────────────────────────────────────────────────────
// Two tiers: secrets are ALWAYS removed (every env); PII is removed in
// production only (kept in dev so debugging is actually useful).
const SECRET_KEYS = /pass|secret|token|authorization|auth|cookie|session|card|cvc|cvv|pan|iban|sortcode|account[_-]?number|client[_-]?secret|api[_-]?key|stripe|payment[_-]?intent|setup[_-]?intent|webhook/i;
const PII_KEYS    = /email|phone|mobile|postcode|address|license|registration|plate|full[_-]?name|first[_-]?name|last[_-]?name|dob|passport/i;

function redactObject(input: unknown, redactPII: boolean, depth = 0): unknown {
  if (input == null || depth > 5) return input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((v) => redactObject(v, redactPII, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SECRET_KEYS.test(k) || (redactPII && PII_KEYS.test(k))) out[k] = "[redacted]";
    else out[k] = redactObject(v, redactPII, depth + 1);
  }
  return out;
}

/** Scrub obvious secrets/PII out of a free-text message (production only). */
function redactString(msg: string): string {
  return String(msg)
    .replace(/\b(sk|pk|rk|whsec)_(live|test)_[A-Za-z0-9]+/g, "$1_***")
    .replace(/\b(pi|cs|ch|seti|cus|acct|in|sub|price|prod)_[A-Za-z0-9]{6,}/g, "$1_***")
    .replace(/\b\d{12,19}\b/g, "****-redacted")             // card-like number runs
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "***@***");        // emails
}

// ── Transports ───────────────────────────────────────────────────────────────
const transports: LogTransport[] = [];

/**
 * Register an external sink. Example (wire up later in instrumentation):
 *
 *   import * as Sentry from "@sentry/nextjs";
 *   logger.registerTransport({
 *     log(level, message, meta) {
 *       if (level === "error") Sentry.captureException(new Error(message), { extra: meta });
 *       else Sentry.addBreadcrumb({ level, message, data: meta });
 *     },
 *   });
 */
export function registerTransport(t: LogTransport): void {
  transports.push(t);
}

function emitToTransports(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  for (const t of transports) {
    try { t.log(level, message, meta); } catch { /* a broken transport must never break the app */ }
  }
}

// ── Pretty console (dev) ──────────────────────────────────────────────────────
const ANSI: Record<LogLevel | "reset" | "dim", string> = {
  debug: "\x1b[90m", info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m",
  reset: "\x1b[0m", dim: "\x1b[2m",
};

function consoleFn(level: LogLevel): (...args: unknown[]) => void {
  if (level === "debug") return console.debug;
  if (level === "info") return console.info;
  if (level === "warn") return console.warn;
  return console.error;
}

// ── Core ──────────────────────────────────────────────────────────────────────
function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (isProd) {
    // Console stays quiet except for a single sanitized error line.
    if (level === "error") {
      // eslint-disable-next-line no-console
      console.error(`[error] ${redactString(message)}`);
    }
    // Observability backends still get every level, with PII + secrets stripped.
    emitToTransports(level, redactString(message), meta ? (redactObject(meta, true) as Record<string, unknown>) : undefined);
    return;
  }

  // Development: pretty + full context (secrets still stripped; PII kept).
  const safeMeta = meta ? (redactObject(meta, false) as Record<string, unknown>) : undefined;
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const label = isServer
    ? `${ANSI[level]}${level.toUpperCase().padEnd(5)}${ANSI.reset}`
    : level.toUpperCase().padEnd(5);
  const line = isServer
    ? `${ANSI.dim}${ts}${ANSI.reset} ${label} ▸ ${message}`
    : `${ts} ${label} ▸ ${message}`;

  const fn = consoleFn(level);
  if (safeMeta && Object.keys(safeMeta).length > 0) fn(line, safeMeta);
  else fn(line);

  emitToTransports(level, message, safeMeta);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info:  (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  registerTransport,
};

export type Logger = typeof logger;
