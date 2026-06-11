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

-- Release actions — audit log + inbox for "request release" / "release now".
-- Booking fields are snapshotted so the record survives the booking being deleted.
create table if not exists release_actions (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null,
  room_id     text not null,
  agenda      text not null,
  start_ts    timestamptz not null,
  end_ts      timestamptz not null,
  owner_id    text not null,
  owner_name  text not null,
  actor_id    text not null,
  actor_name  text not null,
  reason      text not null default '',
  kind        text not null,            -- 'request' | 'release'
  status      text not null,            -- 'pending' | 'approved' | 'declined' | 'done'
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists release_actions_owner_status_idx on release_actions (owner_id, status);
