import type { Booking, EmployeeRow, Inbox, Occurrence, ReleaseAction, ReleaseKind, Role, User } from '../types'
import { useApi } from './config'
import { validateEmployeeId } from './employee'
import { overlaps } from './bookings'

const EMPLOYEES_KEY = 'keenstack.employees.v1'

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
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ---------- auth (lightweight, no passwords) ----------
// Rules: ID must match KSIN#### within range; each ID can only be registered
// once (the name is bound on first sign-in). Admins are designated by env.

export async function signIn(employeeId: string, name: string): Promise<User> {
  const check = validateEmployeeId(employeeId)
  if (!check.ok) throw new Error(check.error)
  const id = check.id!
  const cleanName = name.trim()
  if (cleanName.length < 2) throw new Error('Please enter your full name.')

  if (useApi) {
    return api<User>('employees', { method: 'POST', body: JSON.stringify({ employeeId: id, name: cleanName }) })
  }

  // local fallback: register-once + role via localStorage
  const role: Role = localAdminIds().includes(id) ? 'admin' : 'employee'
  const emps = readEmployees()
  const existing = emps[id]
  if (existing) {
    if (existing.name.trim().toLowerCase() !== cleanName.toLowerCase()) {
      throw new Error('This Employee ID is already registered to a different name.')
    }
    emps[id] = { name: existing.name, role }
    writeEmployees(emps)
    return { employeeId: id, name: existing.name, role }
  }
  emps[id] = { name: cleanName, role }
  writeEmployees(emps)
  return { employeeId: id, name: cleanName, role }
}

/** Admin-only: list all registered employees. */
export async function fetchEmployees(adminId: string): Promise<EmployeeRow[]> {
  if (useApi) {
    return api<EmployeeRow[]>(`employees?adminId=${encodeURIComponent(adminId)}`)
  }
  const emps = readEmployees()
  return Object.entries(emps)
    .map(([employeeId, v]) => ({ employeeId, name: v.name, role: v.role }))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
}

function localAdminIds(): string[] {
  const env = (import.meta.env.VITE_ADMIN_IDS as string | undefined) ?? ''
  const ls = (typeof localStorage !== 'undefined' && localStorage.getItem('keenstack.admin_ids')) || ''
  return `${env},${ls}`
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function readEmployees(): Record<string, { name: string; role: Role }> {
  try {
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '{}')
  } catch {
    return {}
  }
}
function writeEmployees(emps: Record<string, { name: string; role: Role }>) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(emps))
}

// ---------- bookings ----------

export async function fetchBookings(): Promise<Booking[]> {
  if (useApi) return api<Booking[]>('bookings')
  return readLocal()
}

/** Combined board state (bookings + inbox) in a single request to keep load low. */
export async function fetchState(
  employeeId: string | null,
): Promise<{ bookings: Booking[]; inbox: Inbox }> {
  if (useApi) {
    const q = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ''
    return api<{ bookings: Booking[]; inbox: Inbox }>(`state${q}`)
  }
  const bookings = readLocal()
  const inbox = employeeId ? await fetchInbox(employeeId) : { requests: [], notices: [] }
  return { bookings, inbox }
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

export interface SeriesResult {
  created: Booking[]
  skipped: Occurrence[]
  seriesId: string
}

/** Create a recurring series in one request. Occurrences that clash are skipped. */
export async function createSeries(
  draft: Omit<Booking, 'id' | 'createdAt' | 'start' | 'end' | 'seriesId'>,
  occurrences: Occurrence[],
): Promise<SeriesResult> {
  const seriesId = crypto.randomUUID()
  if (useApi) {
    return api<SeriesResult>('bookings', {
      method: 'POST',
      body: JSON.stringify({ ...draft, seriesId, occurrences }),
    })
  }
  const all = readLocal()
  const created: Booking[] = []
  const skipped: Occurrence[] = []
  for (const occ of occurrences) {
    const clash =
      all.some((b) => b.roomId === draft.roomId && overlaps(occ, b)) ||
      created.some((b) => overlaps(occ, b))
    if (clash) {
      skipped.push(occ)
      continue
    }
    created.push({
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      seriesId,
      start: occ.start,
      end: occ.end,
    })
  }
  writeLocal([...all, ...created])
  return { created, skipped, seriesId }
}

export async function deleteSeries(seriesId: string): Promise<void> {
  if (useApi) {
    await api(`bookings?seriesId=${encodeURIComponent(seriesId)}`, { method: 'DELETE' })
    return
  }
  writeLocal(readLocal().filter((b) => b.seriesId !== seriesId))
}

// ---------- release actions (request release / release now) ----------

async function postRelease(booking: Booking, actor: User, reason: string, kind: ReleaseKind): Promise<void> {
  if (kind === 'release' && actor.role !== 'admin') {
    throw new Error('Only administrators can release another employee’s booking immediately.')
  }
  if (useApi) {
    await api('release', {
      method: 'POST',
      body: JSON.stringify({ bookingId: booking.id, kind, reason, actor }),
    })
    return
  }
  const now = new Date().toISOString()
  const action: ReleaseAction = {
    id: crypto.randomUUID(),
    bookingId: booking.id,
    roomId: booking.roomId,
    agenda: booking.agenda,
    start: booking.start,
    end: booking.end,
    ownerId: booking.employeeId,
    ownerName: booking.organizer,
    actorId: actor.employeeId,
    actorName: actor.name,
    reason: reason.trim(),
    kind,
    status: kind === 'release' ? 'done' : 'pending',
    createdAt: now,
    resolvedAt: kind === 'release' ? now : null,
  }
  writeReleases([action, ...readReleases()])
  if (kind === 'release') writeLocal(readLocal().filter((b) => b.id !== booking.id))
}

export const requestRelease = (booking: Booking, actor: User, reason: string) =>
  postRelease(booking, actor, reason, 'request')

export const releaseNow = (booking: Booking, actor: User, reason: string) =>
  postRelease(booking, actor, reason, 'release')

export async function fetchInbox(employeeId: string): Promise<Inbox> {
  if (useApi) return api<Inbox>(`release?employeeId=${encodeURIComponent(employeeId)}`)
  const all = readReleases()
  return {
    requests: all.filter((a) => a.ownerId === employeeId && a.kind === 'request' && a.status === 'pending'),
    notices: all.filter((a) => a.ownerId === employeeId && a.kind === 'release' && a.status === 'done'),
  }
}

export async function resolveRequest(
  actionId: string,
  decision: 'approve' | 'decline',
  actor: User,
): Promise<void> {
  if (useApi) {
    await api('release', { method: 'PATCH', body: JSON.stringify({ actionId, decision, actor }) })
    return
  }
  const all = readReleases()
  const idx = all.findIndex((a) => a.id === actionId)
  if (idx < 0) return
  const action = all[idx]
  if (decision === 'approve') {
    writeLocal(readLocal().filter((b) => b.id !== action.bookingId))
  }
  all[idx] = {
    ...action,
    status: decision === 'approve' ? 'approved' : 'declined',
    resolvedAt: new Date().toISOString(),
  }
  writeReleases(all)
}

function readReleases(): ReleaseAction[] {
  try {
    const raw = localStorage.getItem(RELEASES_KEY)
    return raw ? (JSON.parse(raw) as ReleaseAction[]) : []
  } catch {
    return []
  }
}

function writeReleases(actions: ReleaseAction[]) {
  localStorage.setItem(RELEASES_KEY, JSON.stringify(actions))
}

// ---------- local fallback ----------

const RELEASES_KEY = 'keenstack.releases.v1'

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
