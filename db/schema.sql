-- KeenStack Room Booking — Neon Postgres schema
-- Run this once in the Neon dashboard → SQL Editor (or `psql $DATABASE_URL -f db/schema.sql`).

-- Employees (lightweight identity — no passwords).
create table if not exists employees (
  employee_id text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Bookings.
create table if not exists bookings (
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

create index if not exists bookings_room_start_idx on bookings (room_id, start_ts);
