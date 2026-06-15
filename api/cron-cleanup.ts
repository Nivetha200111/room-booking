import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Rolling deletion of old data. Runs nightly via Vercel Cron (see vercel.json).
 * Removes finished bookings and release-action log rows older than the
 * retention window, keeping the tables small and every poll lean.
 *
 * Retention is configurable via RETENTION_DAYS (default 30).
 * If CRON_SECRET is set, the request must carry `Authorization: Bearer <secret>`
 * (Vercel Cron sends this automatically when the env var is present).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const retentionDays = Number(process.env.RETENTION_DAYS ?? 30)

  try {
    const bookings = (await sql`
      delete from bookings
      where end_ts < now() - make_interval(days => ${retentionDays})
      returning id
    `) as unknown[]

    const releases = (await sql`
      delete from release_actions
      where created_at < now() - make_interval(days => ${retentionDays})
      returning id
    `) as unknown[]

    return res.status(200).json({
      ok: true,
      retentionDays,
      deleted: { bookings: bookings.length, release_actions: releases.length },
    })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
