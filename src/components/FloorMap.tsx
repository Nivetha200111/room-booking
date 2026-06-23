import { motion } from 'framer-motion'
import { CalendarPlus, Lock } from 'lucide-react'
import type { Booking, Floor, Room } from '../types'
import { activeBooking, nextBooking, fmtTime } from '../lib/bookings'

const STATUS = {
  free: { floor: 'rgba(32,201,160,0.06)', wall: 'rgba(32,201,160,0.42)', label: 'rgb(var(--color-keen))', glow: '0 0 26px -10px rgba(32,201,160,0.55)' },
  busy: { floor: 'rgba(232,168,56,0.11)', wall: 'rgba(232,168,56,0.55)', label: 'rgb(var(--color-warning))', glow: '0 0 30px -8px rgba(232,168,56,0.6)' },
  restricted: { floor: 'var(--room-restricted-floor)', wall: 'var(--room-restricted-wall)', label: 'rgb(var(--color-phantom-40))', glow: 'none' },
}

const TABLE = 'var(--room-table)'
const CHAIR = 'var(--room-chair)'
const DEFAULT_SLOT_MS = 30 * 60 * 1000

function nextFreeStart(roomId: string, bookings: Booking[], from: Date) {
  let candidate = new Date(from)
  const future = bookings
    .filter((b) => b.roomId === roomId && new Date(b.end) > candidate)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))

  for (const booking of future) {
    const start = new Date(booking.start)
    const end = new Date(booking.end)
    if (end <= candidate) continue
    if (+candidate + DEFAULT_SLOT_MS <= +start) break
    candidate = end
  }
  return candidate
}

function Chairs({ n }: { n: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="h-2 w-3 rounded-sm" style={{ background: CHAIR }} />
      ))}
    </div>
  )
}

/** A prominent door: open (swung into the room) when free, closed across the
 *  doorway when booked/restricted. Hinged at the bottom-right of the wall. */
function Door({ status }: { status: 'free' | 'busy' | 'restricted' }) {
  const open = status === 'free'
  const color = status === 'free' ? '#20c9a0' : status === 'busy' ? '#e8a838' : '#8c98b0'
  const L = 54
  return (
    <div className="absolute bottom-[-6px] right-5 z-20" style={{ width: L, height: L }}>
      {/* opening cut into the wall */}
      <span className="absolute bottom-0 right-0 h-[6px] rounded-sm" style={{ width: L, background: 'var(--bg)' }} />
      {/* door frame posts (jambs) at each side of the opening */}
      <span className="absolute bottom-0 right-0 h-2.5 w-[5px] rounded-sm" style={{ background: color }} />
      <span className="absolute bottom-0 left-0 h-2.5 w-[5px] rounded-sm" style={{ background: color }} />
      {/* swing arc (shown when open) */}
      <span
        className="absolute bottom-0 right-0 rounded-tl-[100%] border-l-2 border-t-2 border-dashed transition-opacity duration-500"
        style={{ width: L, height: L, borderColor: color, opacity: open ? 0.45 : 0 }}
      />
      {/* door leaf — a thick panel that swings open or sits shut across the doorway */}
      <span
        className="absolute bottom-0 right-0 origin-bottom-right transition-transform duration-[800ms] ease-out"
        style={{
          width: L - 5,
          height: 10,
          background: color,
          borderRadius: 3,
          boxShadow: open ? `0 0 16px -2px ${color}` : '0 2px 5px rgba(0,0,0,0.45)',
          transform: open ? 'rotate(80deg)' : 'rotate(0deg)',
        }}
      >
        {/* panel groove */}
        <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(0,0,0,0.28)' }} />
        {/* handle on the opening edge */}
        <span className="absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-phantom" style={{ opacity: 0.6 }} />
      </span>
    </div>
  )
}

function RoomTile({
  room,
  bookings,
  now,
  onBook,
  onCancel,
}: {
  room: Room
  bookings: Booking[]
  now: Date
  onBook: (room: Room, start?: Date) => void
  onCancel: (b: Booking) => void
}) {
  const active = activeBooking(room.id, bookings, now)
  const next = nextBooking(room.id, bookings, now)
  const status = room.restricted ? 'restricted' : active ? 'busy' : 'free'
  const s = STATUS[status]
  const seats = Math.min(room.capacity, 12)
  const top = Math.ceil(seats / 2)
  const bottom = seats - top
  const futureStart = active ? nextFreeStart(room.id, bookings, new Date(active.end)) : undefined

  const handle = () => {
    if (room.restricted) return
    if (active) onCancel(active)
    else onBook(room)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      style={{ background: s.floor, borderColor: s.wall, boxShadow: s.glow }}
      className={`group relative flex min-h-[168px] min-w-0 flex-col rounded-lg border-2 p-3 text-left transition ${
        room.restricted ? 'cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.99]'
      }`}
    >
      <button
        type="button"
        onClick={handle}
        disabled={room.restricted}
        aria-label={active ? `Manage the current ${room.name} booking` : `Book ${room.name}`}
        className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-codeblue disabled:cursor-not-allowed"
      />

      {/* header */}
      <div className="pointer-events-none relative z-20 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-display text-[15px] font-semibold leading-tight text-polar">{room.name}</h4>
          <p className="text-[11px] text-phantom-40">Floor {room.floor}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: s.label, background: `color-mix(in srgb, ${s.label} 14%, transparent)` }}
          >
            {status !== 'restricted' && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: s.label }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.label }} />
              </span>
            )}
            {status === 'busy' ? 'In Use' : status === 'free' ? 'Open' : 'Locked'}
          </span>
          {active && futureStart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onBook(room, futureStart)
              }}
              title={`Book ${room.name} from ${fmtTime(futureStart.toISOString())} or later`}
              className="pointer-events-auto flex items-center gap-1 rounded-md border border-keen/40 bg-keen/10 px-2 py-1 text-[10px] font-bold text-keen transition hover:bg-keen/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codeblue"
            >
              <CalendarPlus size={11} /> Book later
            </button>
          )}
        </div>
      </div>

      {/* room interior: chairs · table · chairs */}
      <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-1.5 py-2">
        {room.restricted ? (
          <Lock size={22} className="text-phantom-40" />
        ) : (
          <>
            <Chairs n={top} />
            <div
              className="h-7 w-[62%] rounded-md"
              style={{ background: TABLE, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.3)' }}
            />
            <Chairs n={bottom} />
          </>
        )}
      </div>

      {/* status line */}
      <div className="pointer-events-none relative z-20 min-h-[16px] w-full min-w-0 overflow-hidden text-[11px]">
        {room.restricted ? (
          <span className="text-phantom-40">Restricted area</span>
        ) : active ? (
          <span className="block w-full truncate" style={{ color: s.label }}>
            {active.agenda} · until {fmtTime(active.end)}
          </span>
        ) : next ? (
          <span className="text-phantom-40">Free · next {fmtTime(next.start)}</span>
        ) : (
          <span className="text-phantom-40">Free · tap to book</span>
        )}
      </div>

      {/* door — open when free, closed when booked */}
      <Door status={status} />
    </motion.div>
  )
}

export function FloorMap({
  rooms,
  bookings,
  now,
  onBook,
  onCancel,
}: {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  onBook: (room: Room, start?: Date) => void
  onCancel: (b: Booking) => void
}) {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort() as Floor[]

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <div key={floor}>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-phantom-40">
              Floor {floor}
            </h3>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rooms
              .filter((r) => r.floor === floor)
              .map((room) => (
                <RoomTile key={room.id} room={room} bookings={bookings} now={now} onBook={onBook} onCancel={onCancel} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
