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
- **Shared & realtime** when connected to Supabase — the whole team sees one board.
  Falls back to local-only (`localStorage`) with zero setup.
- **KeenStack brand UI** (dark mode) — Phantom-navy surfaces, Keen Green accents,
  Sora + Open Sans, per the KeenStack Brand Guidelines v1. No gradients, no emoji.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Runs in **local mode** out of the box (no backend). To share across the team, connect
Supabase — see [DEPLOY.md](DEPLOY.md).

## Deploy

Supabase (database) + Vercel (hosting). Full step-by-step in **[DEPLOY.md](DEPLOY.md)**.
Database schema: [`supabase/schema.sql`](supabase/schema.sql).

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Supabase · lucide-react
· Sora + Open Sans (KeenStack brand fonts)

## Project map

| Path | What |
| --- | --- |
| `src/rooms.ts` | Room list, floors, capacities, accents |
| `src/lib/db.ts` | Data layer — Supabase or localStorage fallback + realtime |
| `src/lib/bookings.ts` | Policy validation (duration, overlap, floor suggestions) |
| `src/auth/` | Employee-ID sign-in (`AuthContext`) |
| `src/components/` | Login, RoomCard, BookingModal, Timeline, PolicyDrawer |

> Reminder from the policy: water only inside meeting rooms.
