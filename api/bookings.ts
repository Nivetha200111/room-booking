import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const LOCKED_ROOM_IDS = new Set(['phoenix'])

type Row = {
  id: string
  room_id: string
  employee_id: string
  organizer: string
  agenda: string
  purpose: string
  attendees: number
  attendee_names: unknown
  series_id: string | null
  start_ts: string | Date
  end_ts: string | Date
  created_at: string | Date
}

const iso = (v: string | Date) => new Date(v).toISOString()
const names = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : [])

const toBooking = (r: Row) => ({
  id: r.id,
  roomId: r.room_id,
  employeeId: r.employee_id,
  organizer: r.organizer,
  agenda: r.agenda,
  purpose: r.purpose,
  attendees: Number(r.attendees),
  attendeeNames: names(r.attendee_names),
  seriesId: r.series_id ?? undefined,
  start: iso(r.start_ts),
  end: iso(r.end_ts),
  createdAt: iso(r.created_at),
})

// Lazily ensure new columns exist (cached per warm instance) so a deploy never
// breaks production while waiting on a manual migration.
let schemaReady = false
async function ensureSchema() {
  if (schemaReady) return
  await sql`alter table bookings add column if not exists attendee_names jsonb not null default '[]'::jsonb`
  await sql`alter table bookings add column if not exists series_id text`
  schemaReady = true
}

const isOverlapError = (err: unknown) => {
  const code = (err as { code?: string })?.code
  const msg = err instanceof Error ? err.message : ''
  return code === '23P01' || /bookings_no_overlap|exclusion/i.test(msg)
}

async function insertOne(b: any, start: string, end: string, seriesId: string | null): Promise<Row> {
  const attendeeNames = JSON.stringify(Array.isArray(b.attendeeNames) ? b.attendeeNames : [])
  const rows = (await sql`
    insert into bookings (room_id, employee_id, organizer, agenda, purpose, attendees, attendee_names, series_id, start_ts, end_ts)
    values (${b.roomId}, ${b.employeeId}, ${b.organizer ?? ''}, ${b.agenda}, ${b.purpose ?? ''},
            ${Number(b.attendees) || 1}, ${attendeeNames}::jsonb, ${seriesId}, ${start}, ${end})
    returning id, room_id, employee_id, organizer, agenda, purpose, attendees, attendee_names, series_id, start_ts, end_ts, created_at
  `) as Row[]
  return rows[0]
}

async function clashes(roomId: string, start: string, end: string): Promise<boolean> {
  const rows = (await sql`
    select id from bookings
    where room_id = ${roomId}
      and tstzrange(start_ts, end_ts) && tstzrange(${start}::timestamptz, ${end}::timestamptz)
    limit 1
  `) as { id: string }[]
  return rows.length > 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema()

    if (req.method === 'GET') {
      const rows = (await sql`
        select id, room_id, employee_id, organizer, agenda, purpose, attendees, attendee_names, series_id, start_ts, end_ts, created_at
        from bookings order by start_ts
      `) as Row[]
      return res.status(200).json(rows.map(toBooking))
    }

    if (req.method === 'POST') {
      const b = req.body ?? {}
      if (!b.roomId || !b.agenda || !b.employeeId) {
        return res.status(400).json({ error: 'Missing required booking fields.' })
      }
      if (LOCKED_ROOM_IDS.has(String(b.roomId).toLowerCase())) {
        return res.status(403).json({ error: 'Phoenix is locked and cannot be booked.' })
      }

      // ---- recurring series: create many occurrences in one request ----
      if (Array.isArray(b.occurrences)) {
        const seriesId = String(b.seriesId || crypto.randomUUID())
        const created: ReturnType<typeof toBooking>[] = []
        const skipped: { start: string; end: string }[] = []
        for (const occ of b.occurrences as { start: string; end: string }[]) {
          if (!occ?.start || !occ?.end) continue
          try {
            if (await clashes(b.roomId, occ.start, occ.end)) {
              skipped.push({ start: occ.start, end: occ.end })
              continue
            }
            created.push(toBooking(await insertOne(b, occ.start, occ.end, seriesId)))
          } catch (err) {
            if (isOverlapError(err)) skipped.push({ start: occ.start, end: occ.end })
            else throw err
          }
        }
        return res.status(201).json({ created, skipped, seriesId })
      }

      // ---- single booking ----
      if (!b.start || !b.end) return res.status(400).json({ error: 'Missing required booking fields.' })
      if (await clashes(b.roomId, b.start, b.end)) {
        return res.status(409).json({ error: 'This room is already booked for an overlapping time slot.' })
      }
      try {
        return res.status(201).json(toBooking(await insertOne(b, b.start, b.end, b.seriesId ?? null)))
      } catch (err) {
        if (isOverlapError(err)) {
          return res.status(409).json({ error: 'This room was just booked for an overlapping time slot.' })
        }
        throw err
      }
    }

    if (req.method === 'DELETE') {
      const { id, seriesId } = req.query
      if (typeof seriesId === 'string' && seriesId) {
        await sql`delete from bookings where series_id = ${seriesId}`
        return res.status(204).end()
      }
      if (typeof id === 'string' && id) {
        await sql`delete from bookings where id = ${id}`
        return res.status(204).end()
      }
      return res.status(400).json({ error: 'Missing id or seriesId.' })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' })
  }
}
