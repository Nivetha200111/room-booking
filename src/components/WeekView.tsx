import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Booking, Room } from '../types'
import { ROOMS } from '../rooms'
import { fmtTime } from '../lib/bookings'

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export function WeekView({
  bookings,
  now,
  onCancel,
  onBookSlot,
}: {
  bookings: Booking[]
  now: Date
  onCancel: (booking: Booking) => void
  onBookSlot: (room: Room, start: Date) => void
}) {
  const [offset, setOffset] = useState(0) // weeks from current
  const rooms = ROOMS.filter((r) => !r.restricted)

  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })

  const rangeLabel = `${days[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  const cols = '7.5rem repeat(7, minmax(5.5rem, 1fr))'

  return (
    <div className="panel rounded-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-polar">{rangeLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset((o) => o - 1)} title="Previous week" className="rounded-md border border-line p-1.5 text-phantom-20 transition hover:border-line-strong hover:text-polar">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setOffset(0)} className="rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-phantom-20 transition hover:border-line-strong hover:text-polar">
            This week
          </button>
          <button onClick={() => setOffset((o) => o + 1)} title="Next week" className="rounded-md border border-line p-1.5 text-phantom-20 transition hover:border-line-strong hover:text-polar">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          {/* header */}
          <div className="grid items-end" style={{ gridTemplateColumns: cols }}>
            <span />
            {days.map((d) => {
              const today = sameDay(d, now)
              return (
                <div key={d.toISOString()} className="px-1 pb-2 text-center">
                  <div className="text-[11px] text-phantom-40">{DAY_LABEL[d.getDay()]}</div>
                  <div
                    className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
                      today ? 'bg-keen text-phantom' : 'text-phantom-20'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* room rows */}
          <div className="space-y-px">
            {rooms.map((room) => (
              <div key={room.id} className="grid" style={{ gridTemplateColumns: cols }}>
                <div className="flex items-center pr-2 text-[13px] text-phantom-20">{room.name}</div>
                {days.map((d) => {
                  const cell = bookings
                    .filter((b) => b.roomId === room.id && sameDay(new Date(b.start), d))
                    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
                  const slot = new Date(d)
                  slot.setHours(9, 0, 0, 0)
                  const isTodayCol = sameDay(d, now)
                  // heatmap: free = faint green, busier = deeper amber glow
                  const heat = cell.length
                  const cellBg =
                    heat === 0
                      ? 'rgba(32, 201, 160, 0.06)'
                      : `rgba(232, 168, 56, ${Math.min(0.32, 0.12 + heat * 0.08)})`
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => onBookSlot(room, slot)}
                      title={`Book ${room.name}`}
                      style={{ backgroundColor: cellBg }}
                      className={`group relative min-h-[3.25rem] space-y-0.5 rounded-md border p-1 text-left align-top transition hover:brightness-125 ${
                        isTodayCol ? 'border-keen/40' : 'border-line'
                      }`}
                    >
                      {cell.map((b) => (
                        <span
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCancel(b)
                          }}
                          title={`${b.agenda} · ${b.organizer} · ${fmtTime(b.start)}–${fmtTime(b.end)}${b.attendeeNames?.length ? `\nAttendees: ${b.attendeeNames.join(', ')}` : ''}`}
                          className="block truncate rounded bg-keen px-1 py-0.5 text-[10px] font-semibold text-phantom shadow-sm"
                        >
                          {fmtTime(b.start)} {b.agenda}
                        </span>
                      ))}
                      {cell.length === 0 && (
                        <Plus
                          size={13}
                          className="absolute inset-0 m-auto text-phantom-60 opacity-0 transition group-hover:opacity-100"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-phantom-40">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(32,201,160,0.25)' }} /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(232,168,56,0.45)' }} /> Booked (brighter = busier)
        </span>
        <span className="text-phantom-60">Click a cell to book · click a booking to manage it.</span>
      </div>
    </div>
  )
}
