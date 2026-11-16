import {
  DEFAULT_SESSION_SWEEP_MS,
  DEFAULT_SESSION_TTL_MS,
  readSessionStoreConfig,
} from '../config';
import type { GraphPreferences, SessionData, SessionStore } from '../types';

const DEFAULT_PREFS: GraphPreferences = {
  showLabels: true,
  highlightSuggested: true,
  reduceMotion: false,
  theme: 'light',
};

export interface MemorySessionStoreOptions {
  ttlMs?: number;
  sweepMs?: number;
  /** Tests should disable the timer and sweep explicitly. */
  autoSweep?: boolean;
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

/**
 * In-memory session store with TTL-based expiration.
 * Sessions are keyed by a server-generated UUID stored in sessionStorage.
 * Expiration is checked on every read, and sweep() provides periodic cleanup.
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionData>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private readonly ttlMs: number;
  private readonly sweepMs: number;

  constructor(options: MemorySessionStoreOptions = {}) {
    this.ttlMs = positive(options.ttlMs, DEFAULT_SESSION_TTL_MS);
    this.sweepMs = positive(options.sweepMs, DEFAULT_SESSION_SWEEP_MS);

    if (options.autoSweep !== false) {
      this.startSweep();
    }
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const now = Date.now();
    if (now - session.lastAccessed >= this.ttlMs) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    session.lastAccessed = now;
    return session;
  }

  create(sessionId: string): SessionData {
    const now = Date.now();
    const session: SessionData = {
      sessionId,
      createdAt: now,
      lastAccessed: now,
      workspaces: [],
      activeWorkspaceId: null,
      documents: [],
      concepts: [],
      connections: [],
      insights: [],
      dismissedIds: [],
      savedConnectionIds: [],
      prefs: { ...DEFAULT_PREFS },
      fileBuffers: new Map(),
      analysisStatus: new Map(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (Date.now() - session.lastAccessed >= this.ttlMs) {
      this.sessions.delete(sessionId);
      return;
    }
    session.lastAccessed = Date.now();
  }

  destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  sweep(maxAgeMs: number = this.ttlMs): number {
    const cutoff = Date.now() - maxAgeMs;
    let reaped = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastAccessed <= cutoff) {
        this.sessions.delete(sessionId);
        reaped += 1;
      }
    }
    return reaped;
  }

  startSweep(intervalMs: number = this.sweepMs): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
    this.sweepTimer = setInterval(() => {
      this.sweep();
    }, intervalMs);
    // Allow the process to exit even if the timer is still running.
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  stopSweep(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  size(): number {
    return this.sessions.size;
  }
}

/** Singleton instance shared by the default app and middleware. */
export const sessionStore = new MemorySessionStore(readSessionStoreConfig());
