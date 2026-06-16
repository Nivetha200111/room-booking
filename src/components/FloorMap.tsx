import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { Booking, Floor, Room } from '../types'
import { activeBooking, nextBooking, fmtTime } from '../lib/bookings'

const STATUS = {
  free: { floor: 'rgba(32,201,160,0.06)', wall: 'rgba(32,201,160,0.42)', label: '#20c9a0', glow: '0 0 26px -10px rgba(32,201,160,0.55)' },
  busy: { floor: 'rgba(232,168,56,0.11)', wall: 'rgba(232,168,56,0.55)', label: '#e8a838', glow: '0 0 30px -8px rgba(232,168,56,0.6)' },
  restricted: { floor: 'rgba(8,16,34,0.55)', wall: 'rgba(236,242,247,0.12)', label: '#8c98b0', glow: 'none' },
}

const TABLE = '#27324d'
const CHAIR = '#5b6a8a'

function Chairs({ n }: { n: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="h-2 w-3 rounded-sm" style={{ background: CHAIR }} />
      ))}
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
  onBook: (room: Room) => void
  onCancel: (b: Booking) => void
}) {
  const active = activeBooking(room.id, bookings, now)
  const next = nextBooking(room.id, bookings, now)
  const status = room.restricted ? 'restricted' : active ? 'busy' : 'free'
  const s = STATUS[status]
  const seats = Math.min(room.capacity, 12)
  const top = Math.ceil(seats / 2)
  const bottom = seats - top

  const handle = () => {
    if (room.restricted) return
    if (active) onCancel(active)
    else onBook(room)
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      onClick={handle}
      disabled={room.restricted}
      style={{ background: s.floor, borderColor: s.wall, boxShadow: s.glow }}
      className={`relative flex min-h-[168px] flex-col rounded-lg border-2 p-3 text-left transition ${
        room.restricted ? 'cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.99]'
      }`}
    >
      {/* header */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <h4 className="font-display text-[15px] font-semibold leading-tight text-polar">{room.name}</h4>
          <p className="text-[11px] text-phantom-40">Floor {room.floor}</p>
        </div>
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ color: s.label, background: `${s.label}24` }}
        >
          {status !== 'restricted' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: s.label }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: s.label }} />
            </span>
          )}
          {status === 'busy' ? 'In Use' : status === 'free' ? 'Open' : 'Locked'}
        </span>
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
      <div className="relative z-10 min-h-[16px] text-[11px]">
        {room.restricted ? (
          <span className="text-phantom-40">Restricted area</span>
        ) : active ? (
          <span className="truncate" style={{ color: s.label }}>
            {active.agenda} · until {fmtTime(active.end)}
          </span>
        ) : next ? (
          <span className="text-phantom-40">Free · next {fmtTime(next.start)}</span>
        ) : (
          <span className="text-phantom-40">Free · tap to book</span>
        )}
      </div>

      {/* door (swing arc + opening in the wall) */}
      {!room.restricted && (
        <>
          <span className="absolute -bottom-[2px] left-6 h-[3px] w-7" style={{ background: 'var(--bg)' }} />
          <svg className="absolute bottom-0 left-6 h-5 w-7" viewBox="0 0 28 20" fill="none" style={{ color: s.wall }}>
            <path d="M0 20 A28 20 0 0 1 28 0" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
          </svg>
        </>
      )}
    </motion.button>
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
  onBook: (room: Room) => void
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
