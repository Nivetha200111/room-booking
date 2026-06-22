import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, LogOut, Cloud, CloudOff, ShieldCheck } from 'lucide-react'
import type { Booking, Room } from './types'
import { ROOMS } from './rooms'
import { activeBooking } from './lib/bookings'
import { useApi } from './lib/config'
import { requestRelease, releaseNow, resolveRequest } from './lib/db'
import { useBoard, useNow } from './hooks/useBookings'
import { useAuth } from './auth/AuthContext'
import { Login } from './components/Login'
import { FloorMap } from './components/FloorMap'
import { BookingModal } from './components/BookingModal'
import { CancelDialog } from './components/CancelDialog'
import { AdminPanel } from './components/AdminPanel'
import { Notifications } from './components/Notifications'
import { Timeline, UpcomingList } from './components/Timeline'
import { WeekView } from './components/WeekView'
import { PolicyDrawer } from './components/PolicyDrawer'

type FloorFilter = 'all' | 1 | 2
type ScheduleView = 'today' | 'week'

export default function App() {
  const { user } = useAuth()
  if (!user) return <Login />
  return <Board />
}

function Board() {
  const { user, signOut } = useAuth()
  const { bookings, inbox, add, remove, reload } = useBoard(user)
  const now = useNow()
  const [booking, setBooking] = useState<{ room: Room; start?: Date } | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [floor, setFloor] = useState<FloorFilter>('all')
  const [scheduleView, setScheduleView] = useState<ScheduleView>('today')
  const [toast, setToast] = useState<string | null>(null)

  const bookable = ROOMS.filter((r) => !r.restricted)
  const freeCount = bookable.filter((r) => !activeBooking(r.id, bookings, now)).length
  const rooms = useMemo(() => ROOMS.filter((r) => floor === 'all' || r.floor === floor), [floor])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const onConfirm = async (b: Omit<Booking, 'id' | 'createdAt'>) => {
    try {
      await add(b)
      setBooking(null)
      flash(`Booked ${ROOMS.find((r) => r.id === b.roomId)?.name}`)
    } catch {
      // someone grabbed the slot first — refresh so the modal shows the clash
      reload()
      flash('That slot was just taken — please pick another time or room.')
    }
  }

  const cancelOwn = async (b: Booking) => {
    await remove(b.id)
    setCancelTarget(null)
    flash('Booking cancelled')
  }

  const doRequestRelease = async (b: Booking, reason: string) => {
    await requestRelease(b, user!, reason)
    setCancelTarget(null)
    flash(`Release requested from ${b.organizer}`)
  }

  const doReleaseNow = async (b: Booking, reason: string) => {
    await releaseNow(b, user!, reason)
    setCancelTarget(null)
    reload()
    flash(`${ROOMS.find((r) => r.id === b.roomId)?.name} released`)
  }

  const onResolve = async (actionId: string, decision: 'approve' | 'decline') => {
    await resolveRequest(actionId, decision, user!)
    reload()
    flash(decision === 'approve' ? 'Request approved — room freed' : 'Request declined')
  }

  const initials = user!.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-phantom/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <img src="/brand/logo-primary.png" alt="KeenStack" className="h-10 w-auto sm:h-12" />

          <div className="flex items-center gap-2">
            <span
              title={useApi ? 'Shared — Neon Postgres' : 'Local only — connect Neon to share across the team'}
              className="hidden items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-phantom-20 sm:flex"
            >
              {useApi ? <Cloud size={12} className="text-keen" /> : <CloudOff size={12} />}
              {useApi ? 'Shared' : 'Local'}
            </span>
            <Notifications inbox={inbox} onResolve={onResolve} />
            {user!.role === 'admin' && (
              <button
                onClick={() => setAdminOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-codeblue/40 bg-codeblue/10 px-2.5 py-1.5 text-[13px] font-semibold text-codeblue transition ease-ks hover:bg-codeblue/20"
              >
                <ShieldCheck size={14} /> Admin
              </button>
            )}
            <button
              onClick={() => setPolicyOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-semibold text-phantom-20 transition ease-ks hover:border-line-strong hover:text-polar"
            >
              <BookOpen size={14} /> Policy
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-keen text-[10px] font-bold text-phantom">
                {initials}
              </span>
              <span className="hidden text-[13px] text-phantom-20 sm:block">{user!.name}</span>
              {user!.role === 'admin' && (
                <span className="flex items-center gap-1 rounded bg-codeblue/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-codeblue">
                  <ShieldCheck size={11} /> Admin
                </span>
              )}
              <button onClick={signOut} title="Sign out" className="text-phantom-40 transition hover:text-danger">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* heading row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-light tracking-tight text-polar">Rooms</h1>
            <p className="mt-1 text-sm text-phantom-40">
              <span className="font-semibold text-keen">{freeCount}</span> of {bookable.length} available right now
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-line p-0.5">
            {([
              ['all', 'All'],
              [1, 'Floor 1'],
              [2, 'Floor 2'],
            ] as [FloorFilter, string][]).map(([val, label]) => (
              <button
                key={String(val)}
                onClick={() => setFloor(val)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ease-ks ${
                  floor === val ? 'bg-keen text-phantom' : 'text-phantom-20 hover:text-polar'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* floor map */}
        <div className="mt-6">
          <FloorMap
            rooms={rooms}
            bookings={bookings}
            now={now}
            onBook={(room) => setBooking({ room })}
            onCancel={setCancelTarget}
          />
        </div>

        {/* schedule */}
        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-polar">Schedule</h2>
          <div className="flex items-center gap-1 rounded-xl border border-line p-0.5">
            {([
              ['today', 'Today'],
              ['week', 'Week'],
            ] as [ScheduleView, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setScheduleView(val)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ease-ks ${
                  scheduleView === val ? 'bg-keen text-phantom' : 'text-phantom-20 hover:text-polar'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scheduleView === 'today' ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Timeline bookings={bookings} now={now} onCancel={setCancelTarget} />
            </div>
            <UpcomingList bookings={bookings} now={now} onCancel={setCancelTarget} />
          </div>
        ) : (
          <WeekView
            bookings={bookings}
            now={now}
            onCancel={setCancelTarget}
            onBookSlot={(room, start) => setBooking({ room, start })}
          />
        )}
      </main>

      {booking && (
        <BookingModal
          room={booking.room}
          bookings={bookings}
          initialStart={booking.start}
          onClose={() => setBooking(null)}
          onConfirm={onConfirm}
        />
      )}
      {cancelTarget && (
        <CancelDialog
          booking={cancelTarget}
          isOwner={cancelTarget.employeeId === user!.employeeId}
          isAdmin={user!.role === 'admin'}
          onClose={() => setCancelTarget(null)}
          onCancelOwn={() => cancelOwn(cancelTarget)}
          onRequestRelease={(reason) => doRequestRelease(cancelTarget, reason)}
          onReleaseNow={(reason) => doReleaseNow(cancelTarget, reason)}
        />
      )}
      <PolicyDrawer open={policyOpen} onClose={() => setPolicyOpen(false)} />
      {adminOpen && user!.role === 'admin' && (
        <AdminPanel bookings={bookings} user={user!} onClose={() => setAdminOpen(false)} />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-line-strong bg-panel px-4 py-2.5 text-sm font-semibold text-polar shadow-ks-lg"
          >
            <Check size={15} className="text-keen" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
