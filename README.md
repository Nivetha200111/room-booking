# KeenStack Room Booking

A meeting-room booking app for **KeenStack Software Pvt Ltd** — one shared place to see
room availability and reserve a slot, instead of coordinating over messages in Teams.

**Live:** https://room-booking-chi-six.vercel.app/

Sign in with your **Employee ID + name** (no passwords, no email setup) and start booking.

---

## Features

- **Live room board** — every conference room (Paris, New York, Washington DC, London,
  San Diego, Singapore) with real-time *Available / In use* status. The **CEO & Founder
  room is locked** as a restricted area, per policy.
- **Today timeline + Week calendar** — a per-day timeline with a live "now" line, and a
  7-day grid (click an empty cell to book that room/day, click a booking to manage it).
- **Booking form** — agenda, purpose, start/end with quick-duration chips, and an
  **Attendee Names** field (type names, comma/Enter to add chips). The attendee count
  auto-derives from the names.
- **Policy-aware validation** (from the Conference Meeting Room Policy):
  - Agenda required · max booking duration **one week** · whole-day warning.
  - **No double-booking** — enforced at the API *and* by a Postgres exclusion constraint.
  - Free-room suggestions preferring the same floor, then the other floor.
  - Capacity warnings when attendees exceed a room's seats.
- **Request Release / Release Now** — if a room you need is booked:
  - *Request Release* — politely ask the owner, who approves or declines.
  - *Release Now* — urgent override (reason required); cancels immediately, logs it, and
    notifies the owner. Both are blocked on already-ended bookings.
- **Notifications bell** — pending release requests (Approve / Decline) and "your booking
  was released by X" notices, with an unseen indicator.
- **Shared & centralised** — all data lives in one Neon Postgres database; everyone sees
  the same board. Other people's changes appear automatically (~20s poll, paused when the
  tab is idle/hidden to keep usage minimal).
- **Self-maintaining** — a nightly job deletes bookings/logs older than 30 days, so the
  data never piles up.
- **KeenStack brand** (dark) — Phantom navy, Keen Green, Sora + Open Sans.

---

## Architecture

```
Everyone's browsers ─┬─► Vercel  (static React app, served globally)
                     │
                     └─► Vercel  /api serverless functions ──► Neon Postgres
                          (DATABASE_URL lives server-side,        (one shared DB:
                           never exposed to the browser)           bookings, employees,
                                                                   release_actions)
```

The browser never talks to the database directly — it calls the `/api` functions, which
hold the connection string. When `VITE_USE_API` is not set, the app falls back to
`localStorage` so it runs locally with no backend.

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173  (local-only mode, no backend)
```

To run against the real database locally, use Vercel's dev runtime (serves the `/api`
functions too):

```bash
cp .env.example .env.local      # set DATABASE_URL + VITE_USE_API=true
npm i -g vercel
vercel dev
```

Build for production:

```bash
npm run build        # tsc + vite build → dist/
```

---

## Deploy

Neon Postgres (database) + Vercel (hosting + `/api`). Full step-by-step in
**[DEPLOY.md](DEPLOY.md)**.

**Environment variables**

| Name | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Vercel (server) | Neon pooled connection string. Never sent to the browser. |
| `VITE_USE_API` | Vercel (build) | `true` to use the shared backend; unset = local-only. |
| `CRON_SECRET` | Vercel (server, optional) | Authenticates the nightly cleanup cron. |
| `RETENTION_DAYS` | Vercel (server, optional) | Days of history to keep (default `30`). |
| `ADMIN_IDS` | Vercel (server, optional) | Comma-separated employee IDs granted the admin role (e.g. `KSIN0001,KSIN0005`). |
| `MAX_EMPLOYEE_NO` | Vercel (server, optional) | Highest valid employee number (default `71`). Raise it as new staff join. |

**Accounts & roles**

- Sign-in IDs must match `KSIN####` and fall within `1..MAX_EMPLOYEE_NO` (currently `KSIN0001`
  to `KSIN0071`). Each ID can be **registered once** — the name is bound on first sign-in, so
  nobody can claim another person's ID.
- **Admins** (listed in `ADMIN_IDS`) get an "Admin" badge and can cancel any booking directly
  (the owner is still notified). Everyone else is a regular employee.

**Database schema:** [`db/schema.sql`](db/schema.sql) — run once in the Neon SQL editor.
It creates the tables, the no-overlap exclusion constraint, and the `attendee_names`
column. (The API also self-heals the `attendee_names` column on first use, so a deploy
never breaks while waiting on the migration.)

---

## API

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/state?employeeId=` | GET | Combined board state — bookings **+** the user's inbox (one request). |
| `/api/bookings` | GET / POST / DELETE | List / create (overlap-guarded) / delete a booking. |
| `/api/employees` | POST | Upsert an employee on sign-in. |
| `/api/release` | POST / GET / PATCH | Create a request/release · fetch inbox · approve/decline. |
| `/api/cron-cleanup` | GET | Nightly rolling deletion of data older than `RETENTION_DAYS`. |

---

## Project structure

| Path | What |
| --- | --- |
| `src/rooms.ts` | Room list, floors, capacities |
| `src/types.ts` | Shared types (`Booking`, `ReleaseAction`, `Inbox`, …) |
| `src/lib/config.ts` | Backend selector + poll/idle timings |
| `src/lib/db.ts` | Data layer — `/api` or `localStorage` fallback |
| `src/lib/bookings.ts` | Policy validation (duration, overlap, floor suggestions) |
| `src/hooks/useBookings.ts` | `useBoard` (combined polled state) + `useNow` |
| `src/auth/` | Employee-ID sign-in (`AuthContext`) |
| `src/components/` | Login, RoomCard, BookingModal, CancelDialog, Notifications, Timeline, WeekView, PolicyDrawer |
| `api/` | Vercel serverless functions (bookings, employees, release, state, cron-cleanup) |
| `db/schema.sql` | Postgres schema |

---

## Tech

React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Neon Postgres ·
Vercel serverless functions · lucide-react · Sora + Open Sans (KeenStack brand fonts)

> Reminder from the policy: water only inside meeting rooms.
