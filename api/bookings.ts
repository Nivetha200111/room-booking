import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

type Row = {
  id: string
  room_id: string
  employee_id: string
  organizer: string
  agenda: string
  purpose: string
  attendees: number
  start_ts: string | Date
  end_ts: string | Date
  created_at: string | Date
}

const iso = (v: string | Date) => new Date(v).toISOString()

const toBooking = (r: Row) => ({
  id: r.id,
  roomId: r.room_id,
  employeeId: r.employee_id,
  organizer: r.organizer,
  agenda: r.agenda,
  purpose: r.purpose,
  attendees: Number(r.attendees),
  start: iso(r.start_ts),
  end: iso(r.end_ts),
  createdAt: iso(r.created_at),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = (await sql`
        select id, room_id, employee_id, organizer, agenda, purpose, attendees, start_ts, end_ts, created_at
        from bookings order by start_ts
      `) as Row[]
      return res.status(200).json(rows.map(toBooking))
    }

    if (req.method === 'POST') {
      const b = req.body ?? {}
      if (!b.roomId || !b.agenda || !b.start || !b.end || !b.employeeId) {
        return res.status(400).json({ error: 'Missing required booking fields.' })
      }
      const rows = (await sql`
        insert into bookings (room_id, employee_id, organizer, agenda, purpose, attendees, start_ts, end_ts)
        values (${b.roomId}, ${b.employeeId}, ${b.organizer ?? ''}, ${b.agenda}, ${b.purpose ?? ''},
                ${Number(b.attendees) || 1}, ${b.start}, ${b.end})
        returning id, room_id, employee_id, organizer, agenda, purpose, attendees, start_ts, end_ts, created_at
      `) as Row[]
      return res.status(201).json(toBooking(rows[0]))
    }

    if (req.method === 'DELETE') {
      const id = req.query.id
      if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id.' })
      await sql`delete from bookings where id = ${id}`
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
