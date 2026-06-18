import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * One-off removal of a fixed set of employees (and their bookings + release
 * log rows). The target IDs are hardcoded below, so this can only ever delete
 * these specific rows. Removed again right after running.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const bookings = (await sql`
      delete from bookings
      where lower(employee_id) in ('ksin0066', 'ksinmobiletest', 'ksin00test', 'test')
      returning id
    `) as unknown[]
    const releases = (await sql`
      delete from release_actions
      where lower(actor_id) in ('ksin0066', 'ksinmobiletest', 'ksin00test', 'test')
         or lower(owner_id) in ('ksin0066', 'ksinmobiletest', 'ksin00test', 'test')
      returning id
    `) as unknown[]
    const employees = (await sql`
      delete from employees
      where lower(employee_id) in ('ksin0066', 'ksinmobiletest', 'ksin00test', 'test')
      returning employee_id
    `) as { employee_id: string }[]

    return res.status(200).json({
      ok: true,
      deleted: {
        bookings: bookings.length,
        release_actions: releases.length,
        employees: employees.length,
      },
      removedIds: employees.map((e) => e.employee_id),
    })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
