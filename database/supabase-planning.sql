-- Run once in Supabase → SQL Editor (Project Settings → Database).
-- Then add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Netlify / .env (server only).

create table if not exists public.planning_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planning_state enable row level security;

comment on table public.planning_state is 'Job planner JSON; Nitro uses service_role only';
