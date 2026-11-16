import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemorySessionStore } from './services/sessionStore';

type TestApp = ReturnType<typeof createApp>['app'];

function testApp(ttlMs = 30 * 60 * 1000) {
  const store = new MemorySessionStore({ ttlMs, sweepMs: 1000, autoSweep: false });
  const { app } = createApp({ store, corsOrigins: [] });
  return { app, store };
}

async function request(
  app: TestApp,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: unknown,
) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json', ...headers };
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
      const { app } = testApp();
      const { status, json } = await request(app, 'GET', '/health');
      expect(status).toBe(200);
      expect(json).toMatchObject({ ok: true, sessions: 0 });
    });
  });

  describe('Session middleware (X-Session-ID)', () => {
    it('rejects requests without X-Session-ID header', async () => {
      const { app } = testApp();
      const { status, json } = await request(app, 'GET', '/projects');
      expect(status).toBe(401);
      expect(typeof (json as { message?: string })?.message).toBe('string');
    });

    it('rejects requests with an empty X-Session-ID header', async () => {
      const { app } = testApp();
      const { status } = await request(app, 'GET', '/projects', {
        'X-Session-ID': '',
      });
      expect(status).toBe(401);
    });

    it('rejects requests with a blank X-Session-ID header', async () => {
      const { app } = testApp();
      const { status } = await request(app, 'GET', '/projects', {
        'X-Session-ID': '   ',
      });
      expect(status).toBe(401);
    });

    it('rejects requests with an unknown session', async () => {
      const { app } = testApp();
      const { status, json } = await request(app, 'GET', '/projects', {
        'X-Session-ID': 'nonexistent-session-id',
      });
      expect(status).toBe(401);
      expect((json as { message?: string })?.message).toContain('Session');
    });

    it('allows requests with a valid session', async () => {
      const { app, store } = testApp();
      const sid = crypto.randomUUID();
      store.create(sid);
      const { status } = await request(app, 'GET', '/projects', {
        'X-Session-ID': sid,
      });
      expect(status).toBe(200);
    });

    it('touches session on access (updates lastAccessed)', async () => {
      const { app, store } = testApp();
      const sid = crypto.randomUUID();
      const session = store.create(sid);
      const originalLastAccessed = session.lastAccessed;
      await new Promise((resolve) => setTimeout(resolve, 10));
      await request(app, 'GET', '/projects', { 'X-Session-ID': sid });
      const touched = store.get(sid);
      expect(touched?.lastAccessed).toBeGreaterThanOrEqual(originalLastAccessed);
    });

    it('rejects an expired session immediately on access', async () => {
      const { app, store } = testApp(100);
      const sid = crypto.randomUUID();
      const session = store.create(sid);
      session.lastAccessed = Date.now() - 101;

      const { status, json } = await request(app, 'GET', '/projects', {
        'X-Session-ID': sid,
      });
      expect(status).toBe(401);
      expect((json as { message?: string })?.message).toContain('expired');
      expect(store.size()).toBe(0);
    });
  });

  describe('Session store TTL', () => {
    it('reaps expired sessions on sweep', () => {
      const { store } = testApp();
      const sid = crypto.randomUUID();
      store.create(sid);
      expect(store.size()).toBe(1);

      const session = store.get(sid);
      if (session) {
        session.lastAccessed = Date.now() - 10000;
      }

      const reaped = store.sweep(100);
      expect(reaped).toBe(1);
      expect(store.size()).toBe(0);
    });

    it('keeps recently accessed sessions', () => {
      const { store } = testApp();
      const sid = crypto.randomUUID();
      store.create(sid);
      const reaped = store.sweep(100000);
      expect(reaped).toBe(0);
      expect(store.size()).toBe(1);
    });
  });
});
