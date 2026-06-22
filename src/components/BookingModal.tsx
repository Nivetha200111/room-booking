import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, AlertTriangle, Info, Repeat } from 'lucide-react'
import type { Booking, Occurrence, Purpose, RepeatMode, Room } from '../types'
import { PURPOSES } from '../rooms'
import { validateBooking, generateOccurrences, overlaps, MAX_OCCURRENCES } from '../lib/bookings'
import { useAuth } from '../auth/AuthContext'

export interface SeriesDraft extends Omit<Booking, 'id' | 'createdAt' | 'start' | 'end' | 'seriesId'> {
  occurrences: Occurrence[]
}

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  weekdays: 'Every weekday (Mon–Fri)',
  daily: 'Every day',
  weekly: 'Weekly',
}
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const toDateInput = (d: Date) => {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function roundedNow(addMin = 0) {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + addMin)
  return d
}
function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export function BookingModal({
  room,
  bookings,
  initialStart,
  onClose,
  onConfirm,
  onConfirmSeries,
}: {
  room: Room
  bookings: Booking[]
  initialStart?: Date
  onClose: () => void
  onConfirm: (b: Omit<Booking, 'id' | 'createdAt'>) => void
  onConfirmSeries: (s: SeriesDraft) => void
}) {
  const { user } = useAuth()
  const [agenda, setAgenda] = useState('')
  const [purpose, setPurpose] = useState<Purpose>('Project meeting')
  const [attendees, setAttendees] = useState(2)
  const [attendeeNames, setAttendeeNames] = useState<string[]>([])
  const [nameInput, setNameInput] = useState('')

  const attendeeCount = attendeeNames.length > 0 ? attendeeNames.length : attendees

  const addNames = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) return
    setAttendeeNames((prev) => {
      const next = [...prev]
      for (const p of parts) if (!next.some((n) => n.toLowerCase() === p.toLowerCase())) next.push(p)
      return next
    })
    setNameInput('')
  }
  const removeName = (i: number) => setAttendeeNames((prev) => prev.filter((_, idx) => idx !== i))
  const [start, setStart] = useState(() => toLocalInput(initialStart ?? roundedNow()))
  const [end, setEnd] = useState(() =>
    toLocalInput(initialStart ? new Date(initialStart.getTime() + 30 * 60000) : roundedNow(30)),
  )
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [until, setUntil] = useState(() => {
    const d = new Date(initialStart ?? new Date())
    d.setDate(d.getDate() + 6)
    return toDateInput(d)
  })

  const draft = useMemo(
    () => ({
      roomId: room.id,
      agenda,
      attendees: attendeeCount,
      start: start ? new Date(start).toISOString() : '',
      end: end ? new Date(end).toISOString() : '',
    }),
    [room.id, agenda, attendeeCount, start, end],
  )

  const result = useMemo(() => validateBooking(draft, bookings), [draft, bookings])

  // recurring occurrences + how many clash with existing bookings
  const occurrences = useMemo<Occurrence[]>(
    () => generateOccurrences(draft.start, draft.end, repeat, until),
    [draft.start, draft.end, repeat, until],
  )
  const conflicts = useMemo(
    () => occurrences.filter((o) => bookings.some((b) => b.roomId === room.id && overlaps(o, b))).length,
    [occurrences, bookings, room.id],
  )
  const bookable = occurrences.length - conflicts

  const quick = (mins: number) => {
    const s = new Date(start)
    setEnd(toLocalInput(new Date(s.getTime() + mins * 60000)))
  }

  // jump the booking to a given day, keeping the current duration. Today uses
  // the current time; future days default to 9:00 AM.
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const dayOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
  const setDay = (base: Date) => {
    const dur = new Date(end).getTime() - new Date(start).getTime() || 30 * 60000
    const s = new Date(base)
    if (sameDay(base, new Date())) {
      const n = roundedNow()
      s.setHours(n.getHours(), n.getMinutes(), 0, 0)
    } else {
      s.setHours(9, 0, 0, 0)
    }
    setStart(toLocalInput(s))
    setEnd(toLocalInput(new Date(s.getTime() + dur)))
  }

  const canSubmit = result.ok && !!user && (repeat === 'none' || bookable > 0)

  const submit = () => {
    if (!canSubmit || !user) return
    // include any half-typed name still in the input
    const pending = nameInput.trim()
    const finalNames = pending && !attendeeNames.some((n) => n.toLowerCase() === pending.toLowerCase())
      ? [...attendeeNames, pending]
      : attendeeNames
    const common = {
      roomId: room.id,
      agenda,
      purpose,
      attendees: finalNames.length > 0 ? finalNames.length : attendees,
      attendeeNames: finalNames,
      organizer: user.name,
      employeeId: user.employeeId,
    }
    if (repeat === 'none') {
      onConfirm({ ...common, start: draft.start, end: draft.end })
    } else {
      onConfirmSeries({ ...common, occurrences })
    }
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
          className="w-full max-w-lg overflow-hidden rounded-card border border-line-strong bg-panel shadow-ks-lg"
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-polar">{room.name}</h2>
              <p className="text-[13px] text-phantom-40">Floor {room.floor} · seats {room.capacity}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-phantom-40 transition hover:bg-phantom-90 hover:text-polar">
              <X size={18} />
            </button>
          </div>

          {/* form */}
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
            <Field label="Agenda">
              <input
                autoFocus
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What's the meeting about?"
                className={input}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Purpose">
                <select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} className={input}>
                  {PURPOSES.map((p) => (
                    <option key={p} value={p} className="bg-panel">
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Attendees">
                <input
                  type="number"
                  min={1}
                  value={attendeeCount}
                  disabled={attendeeNames.length > 0}
                  onChange={(e) => setAttendees(Number(e.target.value))}
                  className={`${input} disabled:opacity-60`}
                />
              </Field>
            </div>

            <Field label="Attendee Names">
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-phantom-90 px-2 py-1.5 focus-within:border-codeblue focus-within:ring-2 focus-within:ring-codeblue/40">
                {attendeeNames.map((n, i) => (
                  <span key={n} className="flex items-center gap-1 rounded bg-phantom-80 px-2 py-0.5 text-[13px] text-polar">
                    {n}
                    <button onClick={() => removeName(i)} className="text-phantom-40 transition hover:text-danger">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addNames(nameInput)
                    } else if (e.key === 'Backspace' && !nameInput && attendeeNames.length) {
                      removeName(attendeeNames.length - 1)
                    }
                  }}
                  onBlur={() => addNames(nameInput)}
                  placeholder={attendeeNames.length ? 'Add another' : 'Add a name and press Enter'}
                  className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-polar placeholder-phantom-60 outline-none"
                />
              </div>
            </Field>

            <Field label="Date">
              <div className="flex flex-wrap gap-1.5">
                {dayOptions.map((d, i) => {
                  const selected = sameDay(new Date(start), d)
                  return (
                    <button
                      key={i}
                      onClick={() => setDay(d)}
                      className={`rounded-lg px-2.5 py-1 text-[13px] font-semibold transition ease-ks ${
                        selected
                          ? 'bg-keen text-phantom'
                          : 'border border-line text-phantom-20 hover:border-line-strong hover:text-polar'
                      }`}
                    >
                      {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
              </Field>
              <Field label="End">
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[15, 30, 45, 60, 90, 120, 240].map((m) => (
                <button
                  key={m}
                  onClick={() => quick(m)}
                  className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-semibold text-phantom-20 transition ease-ks hover:border-line-strong hover:text-polar"
                >
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </button>
              ))}
            </div>

            {/* recurring */}
            <Field label="Repeat">
              <div className="grid grid-cols-2 gap-3">
                <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatMode)} className={input}>
                  {(Object.keys(REPEAT_LABELS) as RepeatMode[]).map((m) => (
                    <option key={m} value={m} className="bg-panel">
                      {REPEAT_LABELS[m]}
                    </option>
                  ))}
                </select>
                {repeat !== 'none' && (
                  <label className="flex items-center gap-2">
                    <span className="text-[13px] text-phantom-40">Until</span>
                    <input
                      type="date"
                      value={until}
                      min={toDateInput(new Date(start))}
                      onChange={(e) => setUntil(e.target.value)}
                      className={input}
                    />
                  </label>
                )}
              </div>
            </Field>

            {repeat !== 'none' && (
              <p className="flex items-start gap-2 rounded-lg border border-keen/30 bg-keen/10 px-3 py-2 text-[13px] text-phantom-20">
                <Repeat size={14} className="mt-0.5 shrink-0 text-keen" />
                {occurrences.length === 0 ? (
                  <span>No dates in this range. Pick an end date on or after the start.</span>
                ) : (
                  <span>
                    Creates <b className="text-polar">{bookable}</b> booking{bookable === 1 ? '' : 's'}
                    {conflicts > 0 && <span className="text-warning"> ({conflicts} clash, skipped)</span>}
                    {' · '}
                    {fmtDay(occurrences[0].start)}
                    {occurrences.length > 1 && <> to {fmtDay(occurrences[occurrences.length - 1].start)}</>}
                    {occurrences.length >= MAX_OCCURRENCES && ' (max reached)'}
                  </span>
                )}
              </p>
            )}

            {result.errors.map((e) => (
              <p key={e} className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
            {result.ok &&
              result.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
                  <Info size={14} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))}
          </div>

          {/* footer */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <p className="text-[12px] text-phantom-40">
              Booking as <span className="text-phantom-20">{user?.name}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-phantom-20 transition hover:bg-phantom-90 hover:text-polar">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="rounded-lg bg-keen px-4 py-2 text-sm font-bold text-phantom transition-colors ease-ks enabled:hover:bg-keen-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {repeat === 'none' ? 'Confirm Booking' : `Book ${bookable} slot${bookable === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const input =
  'w-full rounded-lg border border-line bg-phantom-90 px-3 py-2 text-sm text-polar placeholder-phantom-60 outline-none transition focus:border-codeblue focus:ring-2 focus:ring-codeblue/40'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">{label}</span>
      {children}
    </label>
  )
}
