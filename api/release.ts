import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

type Row = {
  id: string
  booking_id: string
  room_id: string
  agenda: string
  start_ts: string | Date
  end_ts: string | Date
  owner_id: string
  owner_name: string
  actor_id: string
  actor_name: string
  reason: string
  kind: string
  status: string
  created_at: string | Date
  resolved_at: string | Date | null
}

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null)

const toAction = (r: Row) => ({
  id: r.id,
  bookingId: r.booking_id,
  roomId: r.room_id,
  agenda: r.agenda,
  start: iso(r.start_ts),
  end: iso(r.end_ts),
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  actorId: r.actor_id,
  actorName: r.actor_name,
  reason: r.reason,
  kind: r.kind,
  status: r.status,
  createdAt: iso(r.created_at),
  resolvedAt: iso(r.resolved_at),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // ---- create a request or an immediate release ----
    if (req.method === 'POST') {
      const { bookingId, kind, reason, actor } = req.body ?? {}
      if (!bookingId || (kind !== 'request' && kind !== 'release')) {
        return res.status(400).json({ error: 'bookingId and a valid kind are required.' })
      }
      if (!actor?.employeeId || !actor?.name) {
        return res.status(400).json({ error: 'actor is required.' })
      }
      if (kind === 'release' && !String(reason ?? '').trim()) {
        return res.status(400).json({ error: 'A reason is required to release a booking.' })
      }
      if (kind === 'release') {
        const employee = (await sql`
          select role from employees where employee_id = ${String(actor.employeeId).trim().toUpperCase()}
        `) as Array<{ role: string }>
        if (employee[0]?.role !== 'admin') {
          return res.status(403).json({ error: 'Only administrators can release a booking immediately.' })
        }
      }

      const booked = (await sql`
        select id, room_id, employee_id, organizer, agenda, start_ts, end_ts
        from bookings where id = ${bookingId}
      `) as Array<{
        id: string
        room_id: string
        employee_id: string
        organizer: string
        agenda: string
        start_ts: string | Date
        end_ts: string | Date
      }>

      if (!booked.length) return res.status(404).json({ error: 'Booking no longer exists.' })
      const b = booked[0]
      if (new Date(b.end_ts) <= new Date()) {
        return res.status(409).json({ error: 'This meeting has already ended.' })
      }

      const status = kind === 'release' ? 'done' : 'pending'
      const resolvedAt = kind === 'release' ? new Date().toISOString() : null

      const rows = (await sql`
        insert into release_actions
          (booking_id, room_id, agenda, start_ts, end_ts, owner_id, owner_name,
           actor_id, actor_name, reason, kind, status, resolved_at)
        values
          (${b.id}, ${b.room_id}, ${b.agenda}, ${b.start_ts}, ${b.end_ts},
           ${b.employee_id}, ${b.organizer}, ${actor.employeeId}, ${actor.name},
           ${String(reason ?? '').trim()}, ${kind}, ${status}, ${resolvedAt})
        returning *
      `) as Row[]

      if (kind === 'release') {
        await sql`delete from bookings where id = ${b.id}`
      }
      return res.status(201).json(toAction(rows[0]))
    }

    // ---- inbox for an owner ----
    if (req.method === 'GET') {
      const employeeId = req.query.employeeId
      if (!employeeId || typeof employeeId !== 'string') {
        return res.status(400).json({ error: 'employeeId is required.' })
      }
      const requests = (await sql`
        select * from release_actions
        where owner_id = ${employeeId} and kind = 'request' and status = 'pending'
        order by created_at desc
      `) as Row[]
      const notices = (await sql`
        select * from release_actions
        where owner_id = ${employeeId} and kind = 'release' and status = 'done'
        order by created_at desc limit 30
      `) as Row[]
      return res.status(200).json({ requests: requests.map(toAction), notices: notices.map(toAction) })
    }

    // ---- owner approves / declines a pending request ----
    if (req.method === 'PATCH') {
      const { actionId, decision } = req.body ?? {}
      if (!actionId || (decision !== 'approve' && decision !== 'decline')) {
        return res.status(400).json({ error: 'actionId and a valid decision are required.' })
      }
      const found = (await sql`select * from release_actions where id = ${actionId}`) as Row[]
      if (!found.length) return res.status(404).json({ error: 'Request not found.' })
      const action = found[0]

      if (decision === 'approve') {
        await sql`delete from bookings where id = ${action.booking_id}`
      }
      const status = decision === 'approve' ? 'approved' : 'declined'
      const rows = (await sql`
        update release_actions
        set status = ${status}, resolved_at = now()
        where id = ${actionId}
        returning *
      `) as Row[]
      return res.status(200).json(toAction(rows[0]))
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
