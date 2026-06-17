import { useCallback, useEffect, useRef, useState } from 'react'
import type { Booking, Inbox, User } from '../types'
import { createBooking, deleteBooking, fetchState } from '../lib/db'
import { POLL_MS, IDLE_MS } from '../lib/config'

/**
 * Combined board hook: bookings + the user's inbox in one polled request.
 * A single interval (not two) refreshes both, and only while the tab is
 * visible AND the user has been active recently — this keeps serverless
 * invocations and DB load low enough to stay on free tiers.
 */
export function useBoard(user: User | null) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [inbox, setInbox] = useState<Inbox>({ requests: [], notices: [] })
  const [loading, setLoading] = useState(true)
  const lastActivity = useRef(Date.now())

  const reload = useCallback(() => {
    fetchState(user?.employeeId ?? null)
      .then((s) => {
        setBookings(s.bookings)
        setInbox(s.inbox)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.employeeId])

  useEffect(() => {
    reload()

    const tick = () => {
      const idle = Date.now() - lastActivity.current > IDLE_MS
      if (!document.hidden && !idle) reload()
    }
    const timer = setInterval(tick, POLL_MS)

    // bump activity; if we were idle, refresh immediately on return
    const bump = () => {
      const wasIdle = Date.now() - lastActivity.current > IDLE_MS
      lastActivity.current = Date.now()
      if (wasIdle) reload()
    }
    const onVisible = () => {
      if (!document.hidden) {
        lastActivity.current = Date.now()
        reload()
      }
    }

    window.addEventListener('mousemove', bump, { passive: true })
    window.addEventListener('keydown', bump)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const add = useCallback(async (draft: Omit<Booking, 'id' | 'createdAt'>) => {
    const b = await createBooking(draft)
    setBookings((prev) => (prev.some((x) => x.id === b.id) ? prev : [...prev, b]))
    return b
  }, [])

  const remove = useCallback(async (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id))
    await deleteBooking(id)
  }, [])

  return { bookings, inbox, add, remove, reload, loading }
}

/** ticking clock so "now" indicators stay live */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
