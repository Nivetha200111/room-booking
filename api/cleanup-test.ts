import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * One-off cleanup of smoke-test data. Strictly scoped to the `ZZ-TEST-` prefix,
 * so it can only ever remove test rows — never a real booking, employee, or
 * release action. Safe to hit repeatedly (idempotent).
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const bookings = (await sql`
      delete from bookings where employee_id like 'ZZ-TEST-%' returning id
    `) as unknown[]
    const releases = (await sql`
      delete from release_actions
      where actor_id like 'ZZ-TEST-%' or owner_id like 'ZZ-TEST-%' returning id
    `) as unknown[]
    const employees = (await sql`
      delete from employees where employee_id like 'ZZ-TEST-%' returning employee_id
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
