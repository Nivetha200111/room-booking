import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * One-off purge of leftover smoke-test rows. Strictly scoped to the `ZZ`
 * prefix (case-insensitive) on employee/actor/owner IDs, names, and agendas.
 * Real data uses `KSIN####` IDs and real names, so this can never match it.
 * Removed again right after running.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const bookings = (await sql`
      delete from bookings
      where employee_id ilike 'ZZ%' or organizer ilike 'ZZ%' or agenda ilike 'ZZ%'
      returning id
    `) as unknown[]
    const releases = (await sql`
      delete from release_actions
      where actor_id ilike 'ZZ%' or owner_id ilike 'ZZ%'
         or actor_name ilike 'ZZ%' or owner_name ilike 'ZZ%' or agenda ilike 'ZZ%'
      returning id
    `) as unknown[]
    const employees = (await sql`
      delete from employees where employee_id ilike 'ZZ%' or name ilike 'ZZ%'
      returning employee_id
    `) as unknown[]

    return res.status(200).json({
      ok: true,
      deleted: {
        bookings: bookings.length,
        release_actions: releases.length,
        employees: employees.length,
      },
    })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
