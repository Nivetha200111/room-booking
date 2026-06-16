import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const MAX_EMPLOYEE_NO = Number(process.env.MAX_EMPLOYEE_NO ?? 71)
const ADMIN_IDS = (process.env.ADMIN_IDS ?? '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean)
const pad = (n: number) => `KSIN${String(n).padStart(4, '0')}`

function validateId(raw: string): { id?: string; error?: string } {
  const id = (raw ?? '').trim().toUpperCase()
  if (!/^KSIN\d{4}$/.test(id)) {
    return { error: `Employee ID must look like ${pad(MAX_EMPLOYEE_NO)} (KSIN followed by 4 digits).` }
  }
  const n = Number(id.slice(4))
  if (n < 1 || n > MAX_EMPLOYEE_NO) {
    return { error: `Employee ID must be between ${pad(1)} and ${pad(MAX_EMPLOYEE_NO)}.` }
  }
  return { id }
}

let schemaReady = false
async function ensureSchema() {
  if (schemaReady) return
  await sql`alter table employees add column if not exists role text not null default 'employee'`
  schemaReady = true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    await ensureSchema()
    const { employeeId, name } = req.body ?? {}

    const v = validateId(employeeId)
    if (v.error) return res.status(400).json({ error: v.error })
    const id = v.id!
    const cleanName = String(name ?? '').trim()
    if (cleanName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' })

    const role = ADMIN_IDS.includes(id) ? 'admin' : 'employee'

    const existing = (await sql`
      select employee_id, name, role from employees where employee_id = ${id}
    `) as { employee_id: string; name: string; role: string }[]

    if (existing.length) {
      // register-once: the ID is bound to the name set on first sign-in
      if (existing[0].name.trim().toLowerCase() !== cleanName.toLowerCase()) {
        return res.status(409).json({ error: 'This Employee ID is already registered to a different name.' })
      }
      await sql`update employees set role = ${role} where employee_id = ${id}`
      return res.status(200).json({ employeeId: id, name: existing[0].name, role })
    }

    await sql`insert into employees (employee_id, name, role) values (${id}, ${cleanName}, ${role})`
    return res.status(201).json({ employeeId: id, name: cleanName, role })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
