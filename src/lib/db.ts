import type { Booking, User } from '../types'
import { useApi, POLL_MS } from './config'

/**
 * Data layer. Uses the /api serverless functions (Neon Postgres) when
 * VITE_USE_API is enabled, otherwise falls back to localStorage so the app
 * still runs locally with no backend.
 */

const BOOKINGS_KEY = 'keenstack.bookings.v2'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---------- auth (lightweight, no passwords) ----------

export async function signIn(employeeId: string, name: string): Promise<User> {
  const user: User = { employeeId: employeeId.trim(), name: name.trim() }
  if (useApi) {
    await api('employees', { method: 'POST', body: JSON.stringify(user) })
  }
  return user
}

// ---------- bookings ----------

export async function fetchBookings(): Promise<Booking[]> {
  if (useApi) return api<Booking[]>('bookings')
  return readLocal()
}

export async function createBooking(draft: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
  if (useApi) {
    return api<Booking>('bookings', { method: 'POST', body: JSON.stringify(draft) })
  }
  const booking: Booking = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  writeLocal([...readLocal(), booking])
  return booking
}

export async function deleteBooking(id: string): Promise<void> {
  if (useApi) {
    await api(`bookings?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    return
  }
  writeLocal(readLocal().filter((b) => b.id !== id))
}

/** subscribe to changes; returns an unsubscribe fn */
export function subscribe(onChange: () => void): () => void {
  if (useApi) {
    // Neon has no realtime — poll for other users' changes while the tab is visible.
    const tick = () => {
      if (!document.hidden) onChange()
    }
    const t = setInterval(tick, POLL_MS)
    return () => clearInterval(t)
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
