import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Download, CalendarDays, Users, DoorOpen, ShieldCheck } from 'lucide-react'
import type { Booking, EmployeeRow, User } from '../types'
import { ROOMS, getRoom } from '../rooms'
import { fetchEmployees } from '../lib/db'
import { fmtTime } from '../lib/bookings'
import { toCsv, downloadCsv, today } from '../lib/csv'

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, it) => {
    const k = key(it)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

export function AdminPanel({
  bookings,
  user,
  onClose,
}: {
  bookings: Booking[]
  user: User
  onClose: () => void
}) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])

  useEffect(() => {
    fetchEmployees(user.employeeId)
      .then(setEmployees)
      .catch(() => setEmployees([]))
  }, [user.employeeId])

  const stats = useMemo(() => {
    const bookable = ROOMS.filter((r) => !r.restricted)
    const perRoom = tally(bookings, (b) => b.roomId)
    const perOrganizer = tally(bookings, (b) => b.organizer || '—')
    const perPurpose = tally(bookings, (b) => b.purpose)
    const roomRows = bookable
      .map((r) => ({ name: r.name, count: perRoom[r.id] ?? 0 }))
      .sort((a, b) => b.count - a.count)
    const topBookers = Object.entries(perOrganizer)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
    const purposes = Object.entries(perPurpose)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    return {
      total: bookings.length,
      todayCount: bookings.filter((b) => isToday(b.start)).length,
      attendees: bookings.reduce((s, b) => s + (b.attendees || 0), 0),
      busiest: roomRows[0]?.count ? roomRows[0].name : '—',
      roomRows,
      maxRoom: Math.max(1, ...roomRows.map((r) => r.count)),
      topBookers,
      purposes,
    }
  }, [bookings])

  const exportBookings = () => {
    const rows = bookings.map((b) => ({
      room: getRoom(b.roomId)?.name ?? b.roomId,
      organizer: b.organizer,
      employee_id: b.employeeId,
      agenda: b.agenda,
      purpose: b.purpose,
      attendees: b.attendees,
      attendee_names: b.attendeeNames ?? [],
      start: b.start,
      end: b.end,
    }))
    downloadCsv(`keenstack-bookings-${today()}.csv`, toCsv(rows))
  }
  const exportEmployees = () => {
    const rows = employees.map((e) => ({ employee_id: e.employeeId, name: e.name, role: e.role }))
    downloadCsv(`keenstack-employees-${today()}.csv`, toCsv(rows, ['employee_id', 'name', 'role']))
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-phantom/80 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="my-6 w-full max-w-3xl overflow-hidden rounded-card border border-line-strong bg-panel shadow-ks-lg"
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-polar">
                <ShieldCheck size={18} className="text-codeblue" /> Admin · Reports
              </h2>
              <p className="text-[13px] text-phantom-40">Usage overview and data export</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportBookings}
                className="flex items-center gap-1.5 rounded-lg bg-keen px-3 py-1.5 text-[13px] font-bold text-phantom transition hover:bg-keen-dark"
              >
                <Download size={14} /> Bookings CSV
              </button>
              <button
                onClick={exportEmployees}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-phantom-20 transition hover:border-line-strong hover:text-polar"
              >
                <Download size={14} /> Employees CSV
              </button>
              <button onClick={onClose} className="rounded-md p-1.5 text-phantom-40 transition hover:bg-phantom-90 hover:text-polar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-5">
            {/* stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<CalendarDays size={15} />} label="Bookings" value={stats.total} />
              <StatCard icon={<CalendarDays size={15} />} label="Today" value={stats.todayCount} />
              <StatCard icon={<Users size={15} />} label="Employees" value={employees.length} />
              <StatCard icon={<DoorOpen size={15} />} label="Busiest room" value={stats.busiest} />
            </div>

            {/* room utilization */}
            <Section title="Room utilization">
              <div className="space-y-1.5">
                {stats.roomRows.map((r) => (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[13px] text-phantom-20">{r.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-phantom-90">
                      <div
                        className="h-full rounded-full bg-keen"
                        style={{ width: `${(r.count / stats.maxRoom) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[13px] tabular-nums text-phantom-40">{r.count}</span>
                  </div>
                ))}
              </div>
            </Section>

            <div className="grid gap-6 sm:grid-cols-2">
              <Section title="Top bookers">
                {stats.topBookers.length ? (
                  <ul className="space-y-1.5">
                    {stats.topBookers.map((b) => (
                      <li key={b.name} className="flex justify-between text-[13px] text-phantom-20">
                        <span className="truncate">{b.name}</span>
                        <span className="tabular-nums text-phantom-40">{b.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-phantom-40">No bookings yet.</p>
                )}
              </Section>

              <Section title="By purpose">
                {stats.purposes.length ? (
                  <ul className="space-y-1.5">
                    {stats.purposes.map((p) => (
                      <li key={p.name} className="flex justify-between text-[13px] text-phantom-20">
                        <span className="truncate">{p.name}</span>
                        <span className="tabular-nums text-phantom-40">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-phantom-40">No bookings yet.</p>
                )}
              </Section>
            </div>

            {/* employees */}
            <Section title={`Employees (${employees.length})`}>
              {employees.length ? (
                <div className="overflow-hidden rounded-lg border border-line">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-phantom-90 text-phantom-40">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Employee ID</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => (
                        <tr key={e.employeeId} className="border-t border-line text-phantom-20">
                          <td className="px-3 py-2 tabular-nums">{e.employeeId}</td>
                          <td className="px-3 py-2">{e.name}</td>
                          <td className="px-3 py-2">
                            {e.role === 'admin' ? (
                              <span className="rounded bg-codeblue/20 px-1.5 py-0.5 text-[11px] font-bold uppercase text-codeblue">
                                Admin
                              </span>
                            ) : (
                              <span className="text-phantom-40">Employee</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[13px] text-phantom-40">No employees registered yet.</p>
              )}
            </Section>

            {/* recent bookings */}
            <Section title="All bookings">
              {bookings.length ? (
                <div className="space-y-1">
                  {[...bookings]
                    .sort((a, b) => +new Date(b.start) - +new Date(a.start))
                    .slice(0, 40)
                    .map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-phantom-90">
                        <span className="min-w-0 flex-1 truncate text-phantom-20">
                          <span className="text-polar">{getRoom(b.roomId)?.name}</span> · {b.agenda} · {b.organizer}
                        </span>
                        <span className="shrink-0 text-phantom-40">
                          {new Date(b.start).toLocaleDateString([], { month: 'short', day: 'numeric' })} {fmtTime(b.start)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[13px] text-phantom-40">No bookings yet.</p>
              )}
            </Section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-phantom-90 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[12px] text-phantom-40">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold text-polar">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-phantom-40">{title}</h3>
      {children}
    </div>
  )
}
