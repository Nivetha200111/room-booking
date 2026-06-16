import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send, Zap, AlertTriangle, Clock, ShieldAlert } from 'lucide-react'
import type { Booking } from '../types'
import { getRoom } from '../rooms'
import { fmtTime } from '../lib/bookings'

type Choice = 'request' | 'release'

export function CancelDialog({
  booking,
  isOwner,
  isAdmin = false,
  onClose,
  onCancelOwn,
  onRequestRelease,
  onReleaseNow,
}: {
  booking: Booking
  isOwner: boolean
  isAdmin?: boolean
  onClose: () => void
  onCancelOwn: () => void
  onRequestRelease: (reason: string) => void
  onReleaseNow: (reason: string) => void
}) {
  const room = getRoom(booking.roomId)
  const ended = new Date(booking.end) <= new Date()
  const [choice, setChoice] = useState<Choice>('request')
  const [reason, setReason] = useState('')

  // admin can override anyone's booking directly (the owner is still notified)
  const adminOverride = isAdmin && !isOwner && !ended

  const reasonOk = choice === 'request' || reason.trim().length > 0
  const canConfirm = isOwner || adminOverride || (!ended && reasonOk)

  const confirm = () => {
    if (isOwner) return onCancelOwn()
    if (ended) return
    if (adminOverride) return onReleaseNow(reason.trim() || 'Cancelled by an administrator')
    if (choice === 'request') onRequestRelease(reason)
    else if (reason.trim()) onReleaseNow(reason)
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
                {isOwner ? 'Cancel your booking?' : `${room?.name} is booked`}
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
              <p className="text-sm text-phantom-20">
                This frees the {room?.name} room for the rest of the slot. This can't be undone.
              </p>
            ) : ended ? (
              <p className="flex items-start gap-2 rounded-lg border border-line bg-phantom-90 px-3 py-2.5 text-sm text-phantom-20">
                <Clock size={15} className="mt-0.5 shrink-0 text-phantom-40" />
                This meeting has already ended — there's nothing to release.
              </p>
            ) : adminOverride ? (
              <>
                <p className="flex items-start gap-2 rounded-lg border border-codeblue/30 bg-codeblue/10 px-3 py-2.5 text-sm text-phantom-20">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0 text-codeblue" />
                  As an admin you can cancel {booking.organizer}'s booking directly. They'll be notified.
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
                <OptionCard
                  active={choice === 'request'}
                  onClick={() => setChoice('request')}
                  icon={<Send size={15} />}
                  title="Request Release"
                  desc={`Ask ${booking.organizer} to free the room. They approve or decline.`}
                />
                <OptionCard
                  active={choice === 'release'}
                  onClick={() => setChoice('release')}
                  icon={<Zap size={15} />}
                  title="Release Now"
                  desc={`Cancel ${booking.organizer}'s booking immediately. They'll be notified.`}
                  danger
                />

                <label className="block pt-1">
                  <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">
                    {choice === 'release' ? 'Reason (required)' : 'Message (optional)'}
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder={
                      choice === 'release'
                        ? 'Why do you need this room right now?'
                        : 'Add a short note for the owner…'
                    }
                    className="w-full resize-none rounded-lg border border-line bg-phantom-90 px-3 py-2 text-sm text-polar placeholder-phantom-60 outline-none transition focus:border-codeblue focus:ring-2 focus:ring-codeblue/40"
                  />
                </label>

                {choice === 'release' && (
                  <p className="flex items-start gap-2 text-[12px] text-warning">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    This overrides someone else's booking and is logged.
                  </p>
                )}
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
                  isOwner || adminOverride || choice === 'release'
                    ? 'bg-danger text-white enabled:hover:bg-danger/85'
                    : 'bg-keen text-phantom enabled:hover:bg-keen-dark'
                }`}
              >
                {isOwner
                  ? 'Cancel Booking'
                  : adminOverride
                    ? 'Cancel as Admin'
                    : choice === 'release'
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

function OptionCard({
  active,
  onClick,
  icon,
  title,
  desc,
  danger,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ease-ks ${
        active
          ? danger
            ? 'border-danger/50 bg-danger/10'
            : 'border-keen/50 bg-keen/10'
          : 'border-line bg-phantom-90 hover:border-line-strong'
      }`}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          danger ? 'bg-danger/15 text-danger' : 'bg-keen/15 text-keen'
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-polar">{title}</span>
        <span className="block text-[13px] text-phantom-40">{desc}</span>
      </span>
    </button>
  )
}
