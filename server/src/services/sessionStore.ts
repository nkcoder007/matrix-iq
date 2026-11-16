import type { GraphPreferences, SessionData, SessionStore } from '../types';

const DEFAULT_PREFS: GraphPreferences = {
  showLabels: true,
  highlightSuggested: true,
  reduceMotion: false,
  theme: 'light',
};

/**
 * In-memory session store with TTL-based expiration.
 * Sessions are keyed by a client-generated UUID stored in sessionStorage.
 * Expired sessions are reaped by sweep() on a timer; no reliance on
 * browser beforeunload events.
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionData>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly ttlMs: number) {
    // Start the periodic sweep immediately.
    this.startSweep(ttlMs);
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.lastAccessed = Date.now();
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
      activeInsights: [],
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
    if (session) {
      session.lastAccessed = Date.now();
    }
  }

  destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  sweep(maxAgeMs: number): number {
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

  startSweep(intervalMs: number): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
    this.sweepTimer = setInterval(() => {
      this.sweep(this.ttlMs);
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

/** Singleton instance shared by the app and middleware. */
export const sessionStore = new MemorySessionStore(
  parseInt(process.env.SESSION_TTL_MS ?? '1800000', 10)
);
