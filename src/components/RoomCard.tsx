import { motion } from 'framer-motion'
import { Users, Lock, Tv, Cable, Projector, Phone, PenLine, Trash2 } from 'lucide-react'
import type { Booking, Room } from '../types'
import { activeBooking, nextBooking, fmtTime } from '../lib/bookings'

const amenityIcon: Record<string, JSX.Element> = {
  TV: <Tv size={13} />,
  HDMI: <Cable size={13} />,
  Projector: <Projector size={13} />,
  'Conference phone': <Phone size={13} />,
  Whiteboard: <PenLine size={13} />,
}

export function RoomCard({
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
  onCancel: (booking: Booking) => void
}) {
  const active = activeBooking(room.id, bookings, now)
  const next = nextBooking(room.id, bookings, now)
  const status = room.restricted ? 'restricted' : active ? 'busy' : 'free'

  const statusMeta = {
    free: { label: 'Available', color: '#20c9a0' },
    busy: { label: 'In Use', color: '#e8a838' },
    restricted: { label: 'Restricted', color: '#8c98b0' },
  }[status]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
      className="panel panel-hover flex flex-col rounded-card p-5"
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-[19px] font-semibold leading-tight text-polar">{room.name}</h3>
          <p className="mt-0.5 text-[13px] text-phantom-40">Floor {room.floor}</p>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: statusMeta.color }}>
          <span className="relative flex h-1.5 w-1.5">
            {status === 'busy' && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: statusMeta.color }}
              />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusMeta.color }} />
          </span>
          {statusMeta.label}
        </div>
      </div>

      {/* body */}
      <div className="mt-4 min-h-[48px] text-sm">
        {room.restricted ? (
          <p className="flex items-start gap-1.5 text-phantom-40">
            <Lock size={13} className="mt-0.5 shrink-0" />
            {room.restrictedNote}
          </p>
        ) : active ? (
          <div className="flex items-start gap-2 rounded-lg border border-line bg-phantom-90 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-polar">{active.agenda}</p>
              <p className="text-[13px] text-phantom-40">
                {active.organizer} · until {fmtTime(active.end)}
              </p>
            </div>
            <button
              onClick={() => onCancel(active)}
              title="Cancel or release"
              className="shrink-0 rounded-md p-1 text-phantom-60 transition hover:bg-phantom-80 hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : next ? (
          <p className="text-phantom-20">
            Free now
            <span className="text-phantom-40"> · next {fmtTime(next.start)}, {next.organizer}</span>
          </p>
        ) : (
          <p className="text-phantom-20">Free all day.</p>
        )}
      </div>

      {/* footer */}
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <div className="flex items-center gap-3 text-[13px] text-phantom-40">
          <span className="flex items-center gap-1">
            <Users size={13} /> {room.restricted ? '—' : room.capacity}
          </span>
          <span className="flex items-center gap-1.5">
            {room.amenities.map((a) => (
              <span key={a} title={a} className="text-phantom-60">
                {amenityIcon[a] ?? a}
              </span>
            ))}
          </span>
        </div>

        <button
          disabled={room.restricted}
          onClick={() => onBook(room)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition-colors ease-ks ${
            room.restricted
              ? 'cursor-not-allowed text-phantom-60'
              : 'bg-keen text-phantom hover:bg-keen-dark'
          }`}
        >
          {room.restricted ? 'Locked' : 'Book'}
        </button>
      </div>
    </motion.div>
  )
}
