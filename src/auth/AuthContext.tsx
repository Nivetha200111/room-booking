import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '../types'
import { signIn as dbSignIn } from '../lib/db'

const SESSION_KEY = 'keenstack.user.v1'

interface AuthCtx {
  user: User | null
  loading: boolean
  signIn: (employeeId: string, name: string) => Promise<void>
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw) as User)
    } catch {
      /* ignore */
    }
  }, [])

  const signIn = useCallback(async (employeeId: string, name: string) => {
    setLoading(true)
    try {
      const u = await dbSignIn(employeeId, name)
      setUser(u)
      localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
