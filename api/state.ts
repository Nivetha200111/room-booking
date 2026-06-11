import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const iso = (v: string | Date | null) => (v ? new Date(v).toISOString() : null)

const toBooking = (r: any) => ({
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

const toAction = (r: any) => ({
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

/**
 * Combined board state in one round trip: bookings + the caller's inbox.
 * Replaces two separate polls (bookings + release inbox) with a single request
 * to keep serverless invocations and DB load low.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  try {
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : null

    const bookings = (await sql`
      select id, room_id, employee_id, organizer, agenda, purpose, attendees, start_ts, end_ts, created_at
      from bookings order by start_ts
    `) as any[]

    let inbox = { requests: [] as any[], notices: [] as any[] }
    if (employeeId) {
      const requests = (await sql`
        select * from release_actions
        where owner_id = ${employeeId} and kind = 'request' and status = 'pending'
        order by created_at desc
      `) as any[]
      const notices = (await sql`
        select * from release_actions
        where owner_id = ${employeeId} and kind = 'release' and status = 'done'
        order by created_at desc limit 30
      `) as any[]
      inbox = { requests: requests.map(toAction), notices: notices.map(toAction) }
    }

    return res.status(200).json({ bookings: bookings.map(toBooking), inbox })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
