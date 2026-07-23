import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const DEFAULT_MAX = Number(process.env.MAX_EMPLOYEE_NO ?? 72)
const ADMIN_IDS = (process.env.ADMIN_IDS ?? '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean)
const pad = (n: number) => `KSIN${String(n).padStart(4, '0')}`

let settingsReady = false
async function ensureSettings() {
  if (settingsReady) return
  await sql`create table if not exists settings (key text primary key, value text not null)`
  // Seed the max_employee_no if it doesn't exist yet
  const existing = await sql`select value from settings where key = 'max_employee_no'`
  if (!existing.length) {
    await sql`insert into settings (key, value) values ('max_employee_no', ${String(DEFAULT_MAX)})`
  }
  settingsReady = true
}

async function getMaxEmployeeNo(): Promise<number> {
  await ensureSettings()
  const rows = await sql`select value from settings where key = 'max_employee_no'`
  return rows.length ? Number(rows[0].value) : DEFAULT_MAX
}

function validateId(raw: string, maxEmployeeNo: number): { id?: string; error?: string } {
  const id = (raw ?? '').trim().toUpperCase()
  if (!/^KSIN\d{4}$/.test(id)) {
    return { error: `Employee ID must look like ${pad(maxEmployeeNo)} (KSIN followed by 4 digits).` }
  }
  const n = Number(id.slice(4))
  if (n < 1 || n > maxEmployeeNo) {
    return { error: `Employee ID must be between ${pad(1)} and ${pad(maxEmployeeNo)}.` }
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
  try {
    await ensureSchema()
    const maxEmployeeNo = await getMaxEmployeeNo()

    // Admin-only: list all employees + current max.
    if (req.method === 'GET') {
      const adminId = String(req.query.adminId ?? '').trim().toUpperCase()
      if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Admins only.' })
      const rows = (await sql`
        select employee_id, name, role, created_at from employees order by employee_id
      `) as { employee_id: string; name: string; role: string; created_at: string | Date }[]
      return res.status(200).json({
        maxEmployeeNo,
        employees: rows.map((r) => ({
          employeeId: r.employee_id,
          name: r.name,
          role: r.role,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        })),
      })
    }

    // Admin-only: update the max employee number.
    if (req.method === 'PATCH') {
      const adminId = String(req.body?.adminId ?? '').trim().toUpperCase()
      if (!ADMIN_IDS.includes(adminId)) return res.status(403).json({ error: 'Admins only.' })
      const newMax = Number(req.body?.maxEmployeeNo)
      if (!Number.isInteger(newMax) || newMax < 1 || newMax > 9999) {
        return res.status(400).json({ error: 'Max employee number must be an integer between 1 and 9999.' })
      }
      // Don't allow reducing below current highest registered employee number
      const highest = (await sql`
        select max(cast(substring(employee_id from 5) as integer)) as max_no from employees
      `) as { max_no: number | null }[]
      const currentHighest = highest[0]?.max_no ?? 0
      if (newMax < currentHighest) {
        return res.status(400).json({
          error: `Cannot reduce below ${pad(currentHighest)} — that employee is already registered.`,
        })
      }
      await ensureSettings()
      await sql`update settings set value = ${String(newMax)} where key = 'max_employee_no'`
      return res.status(200).json({ maxEmployeeNo: newMax })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, PATCH')
      return res.status(405).json({ error: 'Method not allowed.' })
    }

    const { employeeId, name } = req.body ?? {}

    const v = validateId(employeeId, maxEmployeeNo)
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
