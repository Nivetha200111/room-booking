import type { Booking, User } from '../types'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Data layer. Uses Supabase when configured (shared, realtime), otherwise
 * falls back to localStorage so the app still runs locally with no backend.
 */

const BOOKINGS_KEY = 'keenstack.bookings.v2'

// ---------- shared helpers ----------

type Row = {
  id: string
  room_id: string
  employee_id: string
  organizer: string
  agenda: string
  purpose: string
  attendees: number
  start_ts: string
  end_ts: string
  created_at: string
}

const fromRow = (r: Row): Booking => ({
  id: r.id,
  roomId: r.room_id,
  employeeId: r.employee_id,
  organizer: r.organizer,
  agenda: r.agenda,
  purpose: r.purpose as Booking['purpose'],
  attendees: r.attendees,
  start: r.start_ts,
  end: r.end_ts,
  createdAt: r.created_at,
})

const toRow = (b: Booking): Row => ({
  id: b.id,
  room_id: b.roomId,
  employee_id: b.employeeId,
  organizer: b.organizer,
  agenda: b.agenda,
  purpose: b.purpose,
  attendees: b.attendees,
  start_ts: b.start,
  end_ts: b.end,
  created_at: b.createdAt,
})

// ---------- auth (lightweight, no passwords) ----------

export async function signIn(employeeId: string, name: string): Promise<User> {
  const id = employeeId.trim()
  const cleanName = name.trim()
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('employees')
      .upsert({ employee_id: id, name: cleanName }, { onConflict: 'employee_id' })
  }
  return { employeeId: id, name: cleanName }
}

// ---------- bookings ----------

export async function fetchBookings(): Promise<Booking[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('bookings').select('*').order('start_ts')
    if (error) throw error
    return (data as Row[]).map(fromRow)
  }
  return readLocal()
}

export async function createBooking(
  draft: Omit<Booking, 'id' | 'createdAt'>,
): Promise<Booking> {
  const booking: Booking = {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('bookings').insert(toRow(booking)).select().single()
    if (error) throw error
    return fromRow(data as Row)
  }
  const all = readLocal()
  writeLocal([...all, booking])
  return booking
}

export async function deleteBooking(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) throw error
    return
  }
  writeLocal(readLocal().filter((b) => b.id !== id))
}

/** subscribe to changes; returns an unsubscribe fn */
export function subscribe(onChange: () => void): () => void {
  if (isSupabaseConfigured && supabase) {
    const client = supabase
    const channel = client
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
      .subscribe()
    return () => {
      client.removeChannel(channel)
    }
  }
  // local: react to changes from other tabs
  const handler = (e: StorageEvent) => {
    if (e.key === BOOKINGS_KEY) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

// ---------- local fallback ----------

function readLocal(): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Booking[]
  } catch {
    return []
  }
}

function writeLocal(bookings: Booking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
}
