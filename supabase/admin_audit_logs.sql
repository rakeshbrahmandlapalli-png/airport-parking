-- ============================================================================
-- admin_audit_logs — permanent ledger of human admin actions.
-- Run once in the Supabase SQL editor.
--
-- Design:
--   • Append-only & tamper-proof from the browser: RLS grants authenticated
--     staff SELECT only. Writes happen exclusively via the service role (the
--     server-side lib/admin-logger.ts), which bypasses RLS.
--   • metadata JSONB carries { label, before, after, ... } for rich diffs.
-- ============================================================================

create table if not exists public.admin_audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users (id) on delete set null,
  user_email  text,                              -- denormalised so the feed still
                                                 -- shows "who" if the user is deleted
  action_type text        not null,              -- e.g. 'promo.badge.update'
  entity_type text,                              -- e.g. 'company' | 'promotion' | 'setting'
  entity_id   text,                              -- affected row id (text: supports non-uuid)
  metadata    jsonb       not null default '{}'::jsonb,  -- { label, before, after, ... }
  created_at  timestamptz not null default now()
);

-- Hot paths: newest-first feed, per-entity history, per-user history.
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_entity_idx     on public.admin_audit_logs (entity_type, entity_id);
create index if not exists admin_audit_logs_user_idx       on public.admin_audit_logs (user_id);
create index if not exists admin_audit_logs_action_idx     on public.admin_audit_logs (action_type);

alter table public.admin_audit_logs enable row level security;

-- READ: any authenticated staff member (the /admin area is already gated to
-- logged-in users by proxy.ts).
drop policy if exists "audit_logs_select_authenticated" on public.admin_audit_logs;
create policy "audit_logs_select_authenticated"
  on public.admin_audit_logs
  for select
  to authenticated
  using (true);

-- WRITE: deliberately NO insert/update/delete policy for anon or authenticated.
-- That denies all client writes; only the service-role server helper can append,
-- which makes the ledger append-only and tamper-proof from the browser.
