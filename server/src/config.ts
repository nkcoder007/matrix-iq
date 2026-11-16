export const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_SESSION_SWEEP_MS = 5 * 60 * 1000;

export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface SessionStoreConfig {
  ttlMs: number;
  sweepMs: number;
}

export function readSessionStoreConfig(
  env: NodeJS.ProcessEnv = process.env,
): SessionStoreConfig {
  return {
    ttlMs: positiveInteger(env.SESSION_TTL_MS, DEFAULT_SESSION_TTL_MS),
    sweepMs: positiveInteger(env.SESSION_SWEEP_MS, DEFAULT_SESSION_SWEEP_MS),
  };
}

export function readCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.CORS_ORIGINS;
  if (configured === undefined) return [...DEFAULT_CORS_ORIGINS];
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
