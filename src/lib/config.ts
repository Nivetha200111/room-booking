/**
 * Data backend selector.
 * When VITE_USE_API is 'true' (set on Vercel), the app talks to the /api
 * serverless functions backed by Neon Postgres — a shared, multi-user board.
 * Otherwise it runs local-only (localStorage), so dev/demo needs no database.
 */
export const useApi = import.meta.env.VITE_USE_API === 'true'

/** how often to re-poll the shared board for other people's changes */
export const POLL_MS = 4000
