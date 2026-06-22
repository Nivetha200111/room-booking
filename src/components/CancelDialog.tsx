import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send, Clock, ShieldAlert } from 'lucide-react'
import type { Booking } from '../types'
import { getRoom } from '../rooms'
import { fmtTime } from '../lib/bookings'

export function CancelDialog({
  booking,
  isOwner,
  isAdmin = false,
  seriesCount = 0,
  onClose,
  onCancelOwn,
  onRequestRelease,
  onReleaseNow,
}: {
  booking: Booking
  isOwner: boolean
  isAdmin?: boolean
  seriesCount?: number
  onClose: () => void
  onCancelOwn: (scope: 'one' | 'series') => void
  onRequestRelease: (reason: string) => void
  onReleaseNow: (reason: string) => void
}) {
  const room = getRoom(booking.roomId)
  const now = new Date()
  const ended = new Date(booking.end) <= now
  const inProgress = new Date(booking.start) <= now && !ended
  const [reason, setReason] = useState('')
  const [scope, setScope] = useState<'one' | 'series'>('one')
  const isSeries = isOwner && !inProgress && seriesCount > 1

  // Only admins can override someone else's booking directly (the owner is notified).
  const adminOverride = isAdmin && !isOwner && !ended

  const canConfirm = isOwner || adminOverride || !ended

  const confirm = () => {
    if (isOwner) return onCancelOwn(scope)
    if (ended) return
    if (adminOverride) return onReleaseNow(reason.trim() || 'Cancelled by an administrator')
    onRequestRelease(reason)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-phantom/80 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-card border border-line-strong bg-panel shadow-ks-lg"
        >
          {/* header */}
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-polar">
                {isOwner ? (inProgress ? 'Release room early?' : 'Cancel your booking?') : `${room?.name} is booked`}
              </h2>
              <p className="text-[13px] text-phantom-40">
                {booking.agenda} · {booking.organizer} · {fmtTime(booking.start)}–{fmtTime(booking.end)}
              </p>
              {booking.attendeeNames?.length > 0 && (
                <p className="mt-1 text-[13px] text-phantom-20">
                  <span className="text-phantom-40">Attendees:</span> {booking.attendeeNames.join(', ')}
                </p>
              )}
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-phantom-40 transition hover:bg-phantom-90 hover:text-polar">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 px-5 py-4">
            {isOwner ? (
              inProgress ? (
                <p className="text-sm text-phantom-20">
                  Meeting finished early? Release {room?.name} now so someone else can book the remaining time.
                </p>
              ) : isSeries ? (
                <>
                  <p className="text-sm text-phantom-20">This booking is part of a recurring series.</p>
                  <div className="space-y-2">
                    {(['one', 'series'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setScope(opt)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ease-ks ${
                          scope === opt ? 'border-keen/50 bg-keen/10 text-polar' : 'border-line bg-phantom-90 text-phantom-20 hover:border-line-strong'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            scope === opt ? 'border-keen' : 'border-phantom-40'
                          }`}
                        >
                          {scope === opt && <span className="h-2 w-2 rounded-full bg-keen" />}
                        </span>
                        {opt === 'one' ? 'Just this booking' : `The whole series (${seriesCount} bookings)`}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-phantom-20">
                  This frees the {room?.name} room for the rest of the slot. This can't be undone.
                </p>
              )
            ) : ended ? (
              <p className="flex items-start gap-2 rounded-lg border border-line bg-phantom-90 px-3 py-2.5 text-sm text-phantom-20">
                <Clock size={15} className="mt-0.5 shrink-0 text-phantom-40" />
                This meeting has already ended — there's nothing to release.
              </p>
            ) : adminOverride ? (
              <>
                <p className="flex items-start gap-2 rounded-lg border border-codeblue/30 bg-codeblue/10 px-3 py-2.5 text-sm text-phantom-20">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0 text-codeblue" />
                  As an admin, you can release {booking.organizer}'s booking immediately. They'll be notified.
                </p>
                <label className="block pt-1">
                  <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">Reason (optional)</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Add a note for the owner…"
                    className="w-full resize-none rounded-lg border border-line bg-phantom-90 px-3 py-2 text-sm text-polar placeholder-phantom-60 outline-none transition focus:border-codeblue focus:ring-2 focus:ring-codeblue/40"
                  />
                </label>
              </>
            ) : (
              <>
                <div className="flex w-full items-start gap-3 rounded-lg border border-keen/50 bg-keen/10 px-3 py-2.5 text-left">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-keen/15 text-keen">
                    <Send size={15} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-polar">Request Release</span>
                    <span className="block text-[13px] text-phantom-40">
                      Ask {booking.organizer} to free the room. They approve or decline.
                    </span>
                  </span>
                </div>

                <label className="block pt-1">
                  <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">Message (optional)</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Add a short note for the owner…"
                    className="w-full resize-none rounded-lg border border-line bg-phantom-90 px-3 py-2 text-sm text-polar placeholder-phantom-60 outline-none transition focus:border-codeblue focus:ring-2 focus:ring-codeblue/40"
                  />
                </label>
              </>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-phantom-20 transition hover:bg-phantom-90 hover:text-polar">
              {ended && !isOwner ? 'Close' : 'Keep booking'}
            </button>
            {!(ended && !isOwner) && (
              <button
                onClick={confirm}
                disabled={!canConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ease-ks disabled:cursor-not-allowed disabled:opacity-40 ${
                  isOwner || adminOverride
                    ? 'bg-danger text-white enabled:hover:bg-danger/85'
                    : 'bg-keen text-phantom enabled:hover:bg-keen-dark'
                }`}
              >
                {isOwner
                  ? inProgress
                    ? 'Release Room Early'
                    : isSeries && scope === 'series'
                    ? `Cancel ${seriesCount} Bookings`
                    : 'Cancel Booking'
                  : adminOverride
                    ? 'Release Now'
                    : 'Send Request'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
