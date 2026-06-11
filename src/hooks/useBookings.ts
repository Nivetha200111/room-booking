import { useCallback, useEffect, useState } from 'react'
import type { Booking } from '../types'
import { createBooking, deleteBooking, fetchBookings, subscribe } from '../lib/db'

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

  return { bookings, add, remove, loading, error }
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
