/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * "local" keeps all data in IndexedDB and sends nothing. "remote" enables the
   * typed client once VITE_API_BASE_URL is set.
   */
  readonly VITE_API_MODE?: 'local' | 'remote';
  readonly VITE_API_BASE_URL?: string;
  /** Development-only proxy target for requests to /api. Never bundled. */
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
