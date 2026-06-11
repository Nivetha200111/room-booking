/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' to use the /api (Neon Postgres) backend; otherwise local-only */
  readonly VITE_USE_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
