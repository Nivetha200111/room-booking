/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' to use the /api (Neon Postgres) backend; otherwise local-only */
  readonly VITE_USE_API?: string
  /** comma-separated admin employee IDs (local-mode only; prod uses server ADMIN_IDS) */
  readonly VITE_ADMIN_IDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
