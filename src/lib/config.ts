/**
 * Data backend selector.
 * When VITE_USE_API is 'true' (set on Vercel), the app talks to the /api
 * serverless functions backed by Neon Postgres — a shared, multi-user board.
 * Otherwise it runs local-only (localStorage), so dev/demo needs no database.
 */
export const useApi = import.meta.env.VITE_USE_API === 'true'

/** how often to re-poll the shared board (when the tab is active & visible) */
export const POLL_MS = 20000

/** pause polling after this much inactivity; resume + refresh on the next interaction */
export const IDLE_MS = 2 * 60 * 1000
