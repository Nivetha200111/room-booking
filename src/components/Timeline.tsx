import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { Booking } from '../types'
import { ROOMS, getRoom } from '../rooms'
import { fmtTime } from '../lib/bookings'

const DAY_START = 8 // 8 AM
const DAY_END = 20 // 8 PM
const HOURS = DAY_END - DAY_START

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export function Timeline({
  bookings,
  now,
  onCancel,
}: {
  bookings: Booking[]
  now: Date
  onCancel: (booking: Booking) => void
}) {
  const rooms = ROOMS.filter((r) => !r.restricted)
  const todays = bookings.filter((b) => isSameDay(new Date(b.start), now))

  const pos = (iso: string) => {
    const d = new Date(iso)
    return ((d.getHours() + d.getMinutes() / 60 - DAY_START) / HOURS) * 100
  }
  const nowPct = ((now.getHours() + now.getMinutes() / 60 - DAY_START) / HOURS) * 100
  const showNow = nowPct >= 0 && nowPct <= 100

  return (
    <div className="panel rounded-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-polar">Today</h2>
        <p className="text-[13px] text-phantom-40">
          {todays.length} booking{todays.length === 1 ? '' : 's'} · {DAY_START}:00–{DAY_END}:00
        </p>
      </div>

      {/* hour ruler */}
      <div className="relative ml-28 mb-1.5 h-3">
        {Array.from({ length: HOURS + 1 }).map((_, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[10px] tabular-nums text-phantom-60"
            style={{ left: `${(i / HOURS) * 100}%` }}
          >
            {DAY_START + i}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {rooms.map((room) => {
          const rows = todays.filter((b) => b.roomId === room.id)
          return (
            <div key={room.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[13px] text-phantom-20">{room.name}</span>
              <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-phantom-90">
                {Array.from({ length: HOURS }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute top-0 h-full w-px bg-line"
                    style={{ left: `${(i / HOURS) * 100}%` }}
                  />
                ))}
                {showNow && (
                  <span className="absolute top-0 z-10 h-full w-px bg-warning" style={{ left: `${nowPct}%` }} />
                )}
                {rows.map((b) => {
                  const left = Math.max(0, pos(b.start))
                  const width = Math.max(2, Math.min(100, pos(b.end)) - left)
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      title={`${b.agenda} · ${b.organizer} · ${fmtTime(b.start)}–${fmtTime(b.end)}`}
                      className="group absolute top-1 flex h-6 items-center gap-1 rounded bg-keen px-1.5 text-[10px] font-semibold text-phantom"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className="truncate">{b.agenda}</span>
                      <button
                        onClick={() => onCancel(b)}
                        className="ml-auto hidden shrink-0 rounded p-0.5 hover:bg-phantom/20 group-hover:block"
                        title="Cancel or release"
                      >
                        <Trash2 size={10} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function UpcomingList({
  bookings,
  now,
  onCancel,
}: {
  bookings: Booking[]
  now: Date
  onCancel: (booking: Booking) => void
}) {
  const upcoming = bookings
    .filter((b) => new Date(b.end) >= now)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, 8)

  return (
    <div className="panel rounded-card p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-polar">Upcoming</h2>
      {!upcoming.length ? (
        <p className="py-6 text-center text-sm text-phantom-40">No upcoming bookings.</p>
      ) : (
        <div className="space-y-1">
          {upcoming.map((b) => {
            const room = getRoom(b.roomId)!
            const live = new Date(b.start) <= now && now < new Date(b.end)
            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-phantom-90"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-polar">
                    {b.agenda}
                    {live && (
                      <span className="rounded bg-keen/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-keen">
                        Live
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[13px] text-phantom-40">
                    {room.name} · {b.organizer} · {fmtTime(b.start)}–{fmtTime(b.end)}
                  </p>
                </div>
                <button
                  onClick={() => onCancel(b)}
                  className="rounded-md p-1.5 text-phantom-60 opacity-0 transition hover:bg-phantom-80 hover:text-danger group-hover:opacity-100"
                  title="Cancel or release"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
