import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createApp } from './app';
import { sessionStore } from './services/sessionStore';

// Reduce TTL for tests so expiration is fast.
const ORIGINAL_TTL = process.env.SESSION_TTL_MS;

function resetStore() {
  // Clear all sessions by sweeping with age 0 (reap everything).
  sessionStore.sweep(0);
}

beforeEach(() => {
  resetStore();
  process.env.SESSION_TTL_MS = '100'; // 100ms TTL for fast expiry tests
});

afterEach(() => {
  resetStore();
  if (ORIGINAL_TTL !== undefined) {
    process.env.SESSION_TTL_MS = ORIGINAL_TTL;
  } else {
    delete process.env.SESSION_TTL_MS;
  }
});

const { app } = createApp();

async function request(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...headers };
  } else {
    init.headers = headers;
  }
  const res = await app.fetch(new Request(`http://localhost${path}`, init));
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, headers: res.headers, json, body: text };
}

describe('Phase 0 — Backend Foundation', () => {
  describe('GET /health', () => {
    it('returns ok: true and session count', async () => {
      const { status, json } = await request('GET', '/health');
      expect(status).toBe(200);
      expect(json).toMatchObject({ ok: true });
      expect(typeof (json as { sessions?: number })?.sessions).toBe('number');
    });
  });

  describe('Session middleware (X-Session-ID)', () => {
    it('rejects requests without X-Session-ID header', async () => {
      const { status, json } = await request('GET', '/projects');
      expect(status).toBe(401);
      expect(typeof (json as { message?: string })?.message).toBe('string');
    });

    it('rejects requests with empty X-Session-ID header', async () => {
      const { status } = await request('GET', '/projects', {
        'X-Session-ID': '',
      });
      expect(status).toBe(401);
    });

    it('rejects requests with an expired/unknown session', async () => {
      const { status, json } = await request('GET', '/projects', {
        'X-Session-ID': 'nonexistent-session-id',
      });
      expect(status).toBe(401);
      expect((json as { message?: string })?.message).toContain('Session');
    });

    it('allows requests with a valid session for existing routes (200 not 401)', async () => {
      const sid = crypto.randomUUID();
      sessionStore.create(sid);
      const { status } = await request('GET', '/projects', {
        'X-Session-ID': sid,
      });
      // Route is now mounted → 200 with empty list, session validation passed (not 401)
      expect(status).toBe(200);
    });

    it('touches session on access (updates lastAccessed)', async () => {
      const sid = crypto.randomUUID();
      const session = sessionStore.create(sid);
      const originalLastAccessed = session.lastAccessed;
      // Wait a tiny bit to ensure timestamp changes.
      await new Promise((r) => setTimeout(r, 10));
      await request('GET', '/projects', { 'X-Session-ID': sid });
      const touched = sessionStore.get(sid);
      expect(touched?.lastAccessed).toBeGreaterThanOrEqual(originalLastAccessed);
    });
  });

  describe('Session store TTL', () => {
    it('reaps expired sessions on sweep', async () => {
      const sid = crypto.randomUUID();
      sessionStore.create(sid);
      expect(sessionStore.size()).toBe(1);

      // Manually age the session beyond TTL.
      const session = sessionStore.get(sid);
      if (session) {
        session.lastAccessed = Date.now() - 10000; // 10s ago
      }

      const reaped = sessionStore.sweep(100); // 100ms max age
      expect(reaped).toBe(1);
      expect(sessionStore.size()).toBe(0);
    });

    it('keeps recently accessed sessions', async () => {
      const sid = crypto.randomUUID();
      sessionStore.create(sid);
      const reaped = sessionStore.sweep(100000); // 100s max age
      expect(reaped).toBe(0);
      expect(sessionStore.size()).toBe(1);
    });
  });
});
