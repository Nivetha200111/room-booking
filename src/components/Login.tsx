import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function Login() {
  const { signIn, loading } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [name, setName] = useState('')
  const valid = employeeId.trim().length >= 2 && name.trim().length >= 2

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (valid && !loading) signIn(employeeId, name)
  }

  return (
    <div className="ripple-faint flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <img src="/brand/logo-primary.png" alt="KeenStack" className="mb-10 h-9 w-auto" />

        <h1 className="font-display text-3xl font-light tracking-tight text-polar">Meeting Rooms</h1>
        <p className="mt-2 text-sm text-phantom-20">
          Sign in with your employee ID to book a room.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">Employee ID</span>
            <input
              autoFocus
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-phantom-20">Full Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>

          <button
            type="submit"
            disabled={!valid || loading}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-keen px-4 py-2.5 text-sm font-bold text-phantom transition-colors ease-ks hover:bg-keen-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Signing In…' : 'Continue'}
            {!loading && <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />}
          </button>
        </form>

        <p className="mt-6 text-[13px] text-phantom-40">
          No password needed. Your ID identifies your bookings to the team.
        </p>
      </motion.div>
    </div>
  )
}

const input =
  'w-full rounded-lg border border-line bg-phantom-90 px-3 py-2.5 text-sm text-polar outline-none transition focus:border-codeblue focus:ring-2 focus:ring-codeblue/40'
