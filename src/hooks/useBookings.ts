import { useCallback, useEffect, useState } from 'react'
import type { Booking, Inbox, User } from '../types'
import { createBooking, deleteBooking, fetchBookings, fetchInbox, subscribe } from '../lib/db'

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    fetchBookings()
      .then(setBookings)
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
    const unsub = subscribe(reload)
    return unsub
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

  return { bookings, add, remove, reload, loading, error }
}

/** Owner inbox — pending release requests + release notices. Polls via subscribe(). */
export function useInbox(user: User | null) {
  const [inbox, setInbox] = useState<Inbox>({ requests: [], notices: [] })

  const reload = useCallback(() => {
    if (!user) {
      setInbox({ requests: [], notices: [] })
      return
    }
    fetchInbox(user.employeeId)
      .then(setInbox)
      .catch(() => {})
  }, [user?.employeeId])

  useEffect(() => {
    reload()
    const unsub = subscribe(reload)
    return unsub
  }, [reload])

  return { inbox, reload }
}

/** ticking clock so "now" indicators stay live */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
