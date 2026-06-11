# Deploying KeenStack Room Booking

The app runs in two modes:

- **Local mode** (no setup): bookings live in the browser's `localStorage`. Each person
  sees only their own data. Good for trying it out.
- **Shared mode** (Supabase): one live board for the whole team, updated in realtime.

You'll do this once. It needs a Supabase account and a Vercel account — both free.
I can't create those accounts or enter your credentials for you, so the account steps are
yours; everything else is already built.

---

## 1. Create the Supabase database (~5 min)

1. Go to <https://supabase.com> → sign in → **New project**. Pick a name and a strong
   database password (Supabase stores it; you won't need it for the app).
2. When the project finishes provisioning, open **SQL Editor → New query**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the `employees` and `bookings` tables, enables realtime, and sets access
   policies.
4. Open **Project Settings → API** and copy two values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`

> Note on access: this app uses a lightweight employee-ID identity (no passwords), so the
> browser uses the public `anon` key and the policies allow read/write to these two tables.
> That's appropriate for an internal tool on a trusted network. If you later want real
> per-user auth, tighten the policies in `schema.sql`.

### Try it locally with the real DB (optional)

```bash
cp .env.example .env.local      # then paste your two values into .env.local
npm run dev
```

The header badge will switch from **Local** to **Shared**.

---

## 2. Deploy to Vercel (~3 min)

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
   Vercel auto-detects Vite (config is in [`vercel.json`](vercel.json)) — no changes needed.
3. Before deploying, expand **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon key |

4. Click **Deploy**. Done — share the URL with the team.

> If you change env vars later, redeploy (Vercel → Deployments → Redeploy) so the new
> values are baked into the build. Vite inlines `VITE_*` vars at build time.

---

## Updating later

Push to your default branch → Vercel rebuilds and redeploys automatically.
