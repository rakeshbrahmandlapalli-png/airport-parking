-- ============================================================================
-- admin_push_subscriptions — devices where an admin turned on new-booking
-- notifications (Admin menu → Notifications). Applied 2026-09-27.
--
-- Written and read only by the server with the service role (app/lib/push.ts,
-- app/api/admin/push/*). RLS is on with NO policies, so the public/anon key and
-- signed-in users cannot read or write it.
-- ============================================================================

create table if not exists public.admin_push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users (id) on delete cascade,
  user_email   text,
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.admin_push_subscriptions enable row level security;
