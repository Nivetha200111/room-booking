import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, X } from 'lucide-react'
import type { Inbox } from '../types'
import { getRoom } from '../rooms'
import { fmtTime } from '../lib/bookings'

const SEEN_KEY = 'keenstack.inbox.seen.v1'

export function Notifications({
  inbox,
  onResolve,
}: {
  inbox: Inbox
  onResolve: (actionId: string, decision: 'approve' | 'decline') => void
}) {
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<number>(() => Number(localStorage.getItem(SEEN_KEY) ?? 0))
  const ref = useRef<HTMLDivElement>(null)

  const items = [...inbox.requests, ...inbox.notices]
  const unseen = items.filter((a) => +new Date(a.createdAt) > lastSeen).length
  const total = inbox.requests.length + inbox.notices.length

  // mark seen when opening
  useEffect(() => {
    if (open) {
      const now = Date.now()
      setLastSeen(now)
      localStorage.setItem(SEEN_KEY, String(now))
    }
  }, [open])

  // close on outside click / Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative flex items-center rounded-lg border border-line px-2.5 py-1.5 text-phantom-20 transition ease-ks hover:border-line-strong hover:text-polar"
      >
        <Bell size={15} />
        {unseen > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-keen px-1 text-[9px] font-bold text-phantom">
            {unseen}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-card border border-line-strong bg-panel shadow-ks-lg"
          >
            <div className="border-b border-line px-4 py-3">
              <h3 className="font-display text-sm font-semibold text-polar">Notifications</h3>
            </div>

            <div className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {total === 0 && (
                <p className="px-4 py-8 text-center text-sm text-phantom-40">You're all caught up.</p>
              )}

              {inbox.requests.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <p className="text-sm text-polar">
                    <span className="font-semibold">{a.actorName}</span> requests the{' '}
                    <span className="font-semibold">{getRoom(a.roomId)?.name}</span> room
                  </p>
                  <p className="mt-0.5 text-[12px] text-phantom-40">
                    {a.agenda} · {fmtTime(a.start)}–{fmtTime(a.end)}
                  </p>
                  {a.reason && <p className="mt-1 text-[13px] italic text-phantom-20">“{a.reason}”</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onResolve(a.id, 'approve')}
                      className="flex items-center gap-1 rounded-md bg-keen px-2.5 py-1 text-[12px] font-bold text-phantom transition hover:bg-keen-dark"
                    >
                      <Check size={12} /> Approve
                    </button>
                    <button
                      onClick={() => onResolve(a.id, 'decline')}
                      className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-phantom-20 transition hover:border-line-strong hover:text-polar"
                    >
                      <X size={12} /> Decline
                    </button>
                  </div>
                </div>
              ))}

              {inbox.notices.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <p className="text-sm text-polar">
                    Your booking <span className="font-semibold">{a.agenda}</span> was released by{' '}
                    <span className="font-semibold">{a.actorName}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-phantom-40">
                    {getRoom(a.roomId)?.name} · {fmtTime(a.start)}–{fmtTime(a.end)}
                  </p>
                  {a.reason && <p className="mt-1 text-[13px] italic text-phantom-20">“{a.reason}”</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
