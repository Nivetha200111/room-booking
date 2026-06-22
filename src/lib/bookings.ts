import type { Booking, Occurrence, RepeatMode } from '../types'
import { ROOMS, getRoom } from '../rooms'

export const MAX_OCCURRENCES = 60

export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)
}

/**
 * Expand a base start/end into a list of dated occurrences following a repeat
 * pattern, up to and including the `until` date. Each occurrence keeps the same
 * time of day and duration. Capped at MAX_OCCURRENCES.
 */
export function generateOccurrences(
  startISO: string,
  endISO: string,
  mode: RepeatMode,
  untilISO: string,
): Occurrence[] {
  if (mode === 'none') return startISO && endISO ? [{ start: startISO, end: endISO }] : []
  const start = new Date(startISO)
  const end = new Date(endISO)
  const until = untilISO ? new Date(untilISO) : new Date(NaN)
  if (isNaN(+start) || isNaN(+end) || isNaN(+until) || end <= start) return []
  until.setHours(23, 59, 59, 999)
  const durMs = +end - +start
  const out: Occurrence[] = []
  const cur = new Date(start)
  let guard = 0
  while (cur <= until && out.length < MAX_OCCURRENCES && guard < 400) {
    guard += 1
    const dow = cur.getDay() // 0 Sun .. 6 Sat
    const include = mode === 'weekdays' ? dow >= 1 && dow <= 5 : true
    if (include) {
      const s = new Date(cur)
      out.push({ start: s.toISOString(), end: new Date(+s + durMs).toISOString() })
    }
    cur.setDate(cur.getDate() + (mode === 'weekly' ? 7 : 1))
  }
  return out
}

/** the booking currently in progress for a room, if any */
export function activeBooking(roomId: string, bookings: Booking[], at = new Date()): Booking | undefined {
  return bookings.find((b) => b.roomId === roomId && new Date(b.start) <= at && at < new Date(b.end))
}

/** the next upcoming booking for a room */
export function nextBooking(roomId: string, bookings: Booking[], at = new Date()): Booking | undefined {
  return bookings
    .filter((b) => b.roomId === roomId && new Date(b.start) > at)
    .sort((x, y) => +new Date(x.start) - +new Date(y.start))[0]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function validateBooking(
  draft: { roomId: string; agenda: string; attendees: number; start: string; end: string },
  bookings: Booking[],
  ignoreId?: string,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const room = getRoom(draft.roomId)
  if (!room) errors.push('Pick a room.')
  if (room?.restricted) errors.push(`${room.name} is a restricted area and cannot be booked.`)

  if (!draft.agenda.trim()) errors.push('Add a meeting agenda (required by policy).')

  const start = new Date(draft.start)
  const end = new Date(draft.end)
  if (!draft.start || !draft.end || isNaN(+start) || isNaN(+end)) {
    errors.push('Set a valid start and end time.')
  } else {
    if (end <= start) errors.push('End time must be after the start time.')
    if (end < new Date()) warnings.push('This booking is entirely in the past.')
    if (room && !errors.length) {
      const clash = bookings.find((b) => b.roomId === room.id && b.id !== ignoreId && overlaps(draft, b))
      if (clash) {
        errors.push(
          `${room.name} is booked ${fmtTime(clash.start)}–${fmtTime(clash.end)}. ${suggestAlternative(room.floor, draft, bookings)}`,
        )
      }
    }
  }

  if (room && draft.attendees > room.capacity) {
    warnings.push(`${room.name} seats ${room.capacity}; you listed ${draft.attendees} attendees.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/** Policy: if no room on a floor, suggest the other floor. */
function suggestAlternative(
  floor: 1 | 2,
  draft: { start: string; end: string },
  bookings: Booking[],
): string {
  const free = ROOMS.filter(
    (r) => !r.restricted && !bookings.some((b) => b.roomId === r.id && overlaps(draft, b)),
  )
  const sameFloor = free.filter((r) => r.floor === floor)
  const otherFloor = free.filter((r) => r.floor !== floor)
  const pick = sameFloor.length ? sameFloor : otherFloor
  if (!pick.length) return 'No rooms are free in that slot.'
  const where = sameFloor.length ? '' : ` (floor ${otherFloor[0].floor})`
  return `Try ${pick.slice(0, 3).map((r) => r.name).join(', ')}${where}.`
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
