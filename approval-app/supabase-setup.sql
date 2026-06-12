-- Approval Desk: Supabase setup.
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.

create table public.requests (
  id text primary key,
  name text not null,
  email text,
  title text not null,
  details text,
  priority text not null default 'medium',
  category text not null default 'other',
  status text not null default 'pending',
  "submittedAt" timestamptz not null default now(),
  "decidedAt" timestamptz,
  "decisionComment" text
);

-- Row Level Security with no policies: the table is only reachable with the
-- service role key (which the server uses), never from a browser.
alter table public.requests enable row level security;
