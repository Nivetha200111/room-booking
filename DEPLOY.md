# Deploying KeenStack Room Booking

The app runs in two modes:

- **Local mode** (no setup): bookings live in the browser's `localStorage`. Each person
  sees only their own data. Good for trying it out.
- **Shared mode** (Neon Postgres): one board for the whole team. The browser calls the
  `/api` serverless functions on Vercel, which talk to your Neon database. Other people's
  bookings appear automatically (polled every ~4 seconds).

You'll do this once. It needs a Neon account and a Vercel account — both free. I can't
create those accounts or enter your credentials, so the account steps are yours;
everything else is already built.

---

## 1. Create the Neon database (~3 min)

1. Go to <https://neon.tech> → sign in → **New Project**. Pick a name and region.
2. After it provisions, open the **SQL Editor** and run the contents of
   [`db/schema.sql`](db/schema.sql) (creates the `employees` and `bookings` tables).
3. Copy your **connection string** — Neon dashboard → **Connection Details** → use the
   **Pooled** connection string. It looks like:
   `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

This connection string is **server-side only** — it's used by the `/api` functions and is
never shipped to the browser.

### Try it locally (optional)

The `/api` functions need Vercel's local runtime:

```bash
cp .env.example .env.local        # paste your DATABASE_URL, keep VITE_USE_API=true
npm i -g vercel
vercel dev                        # serves the app AND the /api functions
```

(Plain `npm run dev` runs the UI only — it stays in local-only mode because there's no
`/api` server.)

---

## 2. Deploy to Vercel (~3 min)

1. Push this repo to GitHub (already done if you used the assistant).
2. Go to <https://vercel.com/new> → **Import** the `room-booking` repo. Vercel auto-detects
   Vite and the `/api` functions — no build changes needed.
3. Expand **Environment Variables** and add:

   | Name | Value | Notes |
   | --- | --- | --- |
   | `DATABASE_URL` | your Neon pooled connection string | server-side, used by `/api` |
   | `VITE_USE_API` | `true` | tells the frontend to use the shared backend |

4. Click **Deploy**. You'll get a live URL in ~1 minute, and the header badge will read
   **Shared**.

> If you skip the env vars it still deploys — just in local-only mode (badge reads
> **Local**). Add them and redeploy to switch to the shared board.

---

## How it fits together

```
Everyone's browsers ─┬─► Vercel (static React site)
                     │
                     └─► Vercel /api functions ──► Neon Postgres (one shared DB)
                          (DATABASE_URL lives here, never in the browser)
```

## Updating later

Push to `main` → Vercel rebuilds and redeploys automatically. Env-var changes need a
redeploy (Vercel inlines `VITE_*` values at build time).
