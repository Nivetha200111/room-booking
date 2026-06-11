-- KeenStack Room Booking — Supabase schema
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.

-- Employees (lightweight identity — no passwords).
create table if not exists public.employees (
  employee_id text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Bookings.
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null,
  employee_id text not null,
  organizer   text not null,
  agenda      text not null,
  purpose     text not null,
  attendees   integer not null default 1,
  start_ts    timestamptz not null,
  end_ts      timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists bookings_room_start_idx on public.bookings (room_id, start_ts);

-- Realtime: broadcast row changes so every client's board stays live.
alter publication supabase_realtime add table public.bookings;

-- Row Level Security.
-- This app uses a lightweight ID-based identity (no Supabase Auth), so the
-- browser talks to the API with the anon key. We allow anon read/write to
-- these two tables only. This is appropriate for an internal, trusted-network
-- tool. If you later add real auth, tighten these policies.
alter table public.employees enable row level security;
alter table public.bookings  enable row level security;

drop policy if exists "anon all employees" on public.employees;
create policy "anon all employees" on public.employees
  for all to anon using (true) with check (true);

drop policy if exists "anon all bookings" on public.bookings;
create policy "anon all bookings" on public.bookings
  for all to anon using (true) with check (true);
