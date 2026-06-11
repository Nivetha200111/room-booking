import type { Booking } from '../types'
import { ROOMS, getRoom } from '../rooms'

export const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 1 week
export const FULL_DAY_MS = 8 * 60 * 60 * 1000 // threshold that counts as "whole day"

export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)
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
    const dur = +end - +start
    if (dur > MAX_DURATION_MS) errors.push('Maximum booking duration is one week.')
    if (end < new Date()) warnings.push('This booking is entirely in the past.')
    if (dur >= FULL_DAY_MS) warnings.push('Whole-day booking — please reserve only the time you genuinely need.')
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
