# KeenStack Room Booking

A meeting-room booking app for KeenStack Software Pvt Ltd — built to replace the endless
"Hi Team, we're using the Paris room…" pings in Microsoft Teams.

## Features

- **Sign in with Employee ID + name** — no passwords, no email. Your ID identifies your
  bookings to the team.
- **Live room board** — every conference room (Paris, New York, Washington DC, London,
  San Diego, Singapore) with real-time *Available / In use* status. The **CEO & Founder
  room is locked** (restricted area, per policy).
- **One-tap booking** — agenda, purpose, attendees, start/end, and quick duration chips.
  The organizer is the signed-in user automatically.
- **Policy-aware validation**, from the company policy:
  - Agenda required · max booking duration **one week** · whole-day warning.
  - Double-booking blocked, with **free-room suggestions** preferring the same floor then
    the other floor.
  - Capacity warnings when attendees exceed a room's seats.
- **Today timeline** with a live "now" line + an **Upcoming** list; cancel inline.
- **Shared board** when connected to Neon Postgres (via Vercel `/api` serverless
  functions) — the whole team sees one board, polled every ~4s. Falls back to local-only
  (`localStorage`) with zero setup.
- **KeenStack brand UI** (dark mode) — Phantom-navy surfaces, Keen Green accents,
  Sora + Open Sans, per the KeenStack Brand Guidelines v1. No gradients, no emoji.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Runs in **local mode** out of the box (no backend). To share across the team, connect
Neon — see [DEPLOY.md](DEPLOY.md).

## Deploy

Neon Postgres (database) + Vercel (hosting + `/api`). Full step-by-step in
**[DEPLOY.md](DEPLOY.md)**. Database schema: [`db/schema.sql`](db/schema.sql).

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Neon Postgres · Vercel
functions · lucide-react · Sora + Open Sans (KeenStack brand fonts)

## Project map

| Path | What |
| --- | --- |
| `src/rooms.ts` | Room list, floors, capacities |
| `src/lib/db.ts` | Data layer — `/api` (Neon) or localStorage fallback |
| `src/lib/config.ts` | Backend selector (`VITE_USE_API`) |
| `src/lib/bookings.ts` | Policy validation (duration, overlap, floor suggestions) |
| `api/` | Vercel serverless functions (`bookings`, `employees`) over Neon |
| `db/schema.sql` | Postgres schema |
| `src/auth/` | Employee-ID sign-in (`AuthContext`) |
| `src/components/` | Login, RoomCard, BookingModal, Timeline, PolicyDrawer |

> Reminder from the policy: water only inside meeting rooms.
