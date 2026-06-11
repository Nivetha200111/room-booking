import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    const { employeeId, name } = req.body ?? {}
    if (!employeeId || !name) return res.status(400).json({ error: 'employeeId and name are required.' })
    await sql`
      insert into employees (employee_id, name)
      values (${employeeId}, ${name})
      on conflict (employee_id) do update set name = excluded.name
    `
    return res.status(200).json({ employeeId, name })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
