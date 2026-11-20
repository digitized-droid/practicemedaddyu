-- EUnify Web Push: run once in Supabase SQL Editor.
create table if not exists public.eunify_push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.eunify_notification_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null, title text not null, body text not null, scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  sent_at timestamptz, created_at timestamptz not null default now(), unique(user_id, dedupe_key)
);
create index if not exists eunify_notification_jobs_due_idx on public.eunify_notification_jobs(status, scheduled_at);
create index if not exists eunify_push_subscriptions_user_idx on public.eunify_push_subscriptions(user_id);
alter table public.eunify_push_subscriptions enable row level security;
alter table public.eunify_notification_jobs enable row level security;
drop policy if exists "Users manage their own push subscriptions" on public.eunify_push_subscriptions;
create policy "Users manage their own push subscriptions" on public.eunify_push_subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage their own notification jobs" on public.eunify_notification_jobs;
create policy "Users manage their own notification jobs" on public.eunify_notification_jobs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.eunify_push_subscriptions to authenticated;
grant select, insert, update, delete on public.eunify_notification_jobs to authenticated;
