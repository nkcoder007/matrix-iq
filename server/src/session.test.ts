import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemorySessionStore } from './services/sessionStore';

function testApp() {
  const store = new MemorySessionStore({ ttlMs: 60_000, sweepMs: 1_000, autoSweep: false });
  const { app } = createApp({ store, corsOrigins: [] });
  return { app, store };
}

async function request(
  app: ReturnType<typeof createApp>['app'],
  method: string,
  path: string,
  headers: Record<string, string> = {},
) {
  const res = await app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers,
    }),
  );
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;
  return { status: res.status, json };
}

describe('POST /session', () => {
  it('creates a session without an existing session header', async () => {
    const { app, store } = testApp();
    const { status, json } = await request(app, 'POST', '/session');
    const sessionId = (json as { sessionId?: string }).sessionId;

    expect(status).toBe(201);
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(store.size()).toBe(1);
    expect(store.get(sessionId as string)?.sessionId).toBe(sessionId);
  });

  it('returns a session that can access protected routes', async () => {
    const { app } = testApp();
    const created = await request(app, 'POST', '/session');
    const sessionId = (created.json as { sessionId: string }).sessionId;

    const projects = await request(app, 'GET', '/projects', {
      'X-Session-ID': sessionId,
    });
    expect(projects.status).toBe(200);
    expect(projects.json).toEqual([]);
  });

  it('ignores an existing session header when bootstrapping', async () => {
    const { app, store } = testApp();
    const { status, json } = await request(app, 'POST', '/session', {
      'X-Session-ID': 'unknown-session',
    });
    const sessionId = (json as { sessionId?: string }).sessionId;

    expect(status).toBe(201);
    expect(sessionId).not.toBe('unknown-session');
    expect(store.size()).toBe(1);
  });

  it('creates distinct sessions for concurrent requests', async () => {
    const { app, store } = testApp();
    const results = await Promise.all([
      request(app, 'POST', '/session'),
      request(app, 'POST', '/session'),
    ]);
    const ids = results.map((result) => (result.json as { sessionId: string }).sessionId);

    expect(new Set(ids).size).toBe(2);
    expect(store.size()).toBe(2);
  });
});
