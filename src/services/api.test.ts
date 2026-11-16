import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

let apiModule: typeof import('./api');
let fetchMock: Mock<typeof fetch>;
let sessionValues: Map<string, string>;
let removedSessionKeys: string[];

function createSessionStorage(): Storage {
  return {
    get length() {
      return sessionValues.size;
    },
    clear: () => sessionValues.clear(),
    getItem: (key: string) => sessionValues.get(key) ?? null,
    key: (index: number) => [...sessionValues.keys()][index] ?? null,
    removeItem: (key: string) => {
      removedSessionKeys.push(key);
      sessionValues.delete(key);
    },
    setItem: (key: string, value: string) => {
      sessionValues.set(key, value);
    },
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function loadRemoteApi(): Promise<void> {
  vi.resetModules();
  vi.stubEnv('VITE_API_MODE', 'remote');
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.matrixiq.test');
  apiModule = await import('./api');
}

beforeEach(() => {
  sessionValues = new Map();
  removedSessionKeys = [];
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('sessionStorage', createSessionStorage());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('API session integration', () => {
  it('creates a session and attaches it to protected requests', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/session')) return jsonResponse({ sessionId: 'session-1' }, 201);
      if (url.endsWith('/projects')) return jsonResponse([]);
      throw new Error(`Unexpected request: ${url}`);
    });
    await loadRemoteApi();

    await expect(apiModule.api.projects.list()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/session');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });

    const projectInit = fetchMock.mock.calls[1]?.[1];
    expect(projectInit).toBeDefined();
    expect(new Headers(projectInit?.headers).get('X-Session-ID')).toBe('session-1');
    expect(sessionValues.get(apiModule.SESSION_STORAGE_KEY)).toBe('session-1');
  });

  it('reuses the stored session after a page reload', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/session')) return jsonResponse({ sessionId: 'session-reload' }, 201);
      if (url.endsWith('/projects')) return jsonResponse([]);
      throw new Error(`Unexpected request: ${url}`);
    });
    await loadRemoteApi();

    await apiModule.api.projects.list();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Simulate a reload: module state is discarded, sessionStorage survives.
    vi.resetModules();
    apiModule = await import('./api');
    await apiModule.api.projects.list();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const lastCall = fetchMock.mock.calls[2];
    expect(String(lastCall?.[0])).toContain('/projects');
    expect(new Headers(lastCall?.[1]?.headers).get('X-Session-ID')).toBe('session-reload');
  });

  it('shares one bootstrap request across simultaneous calls', async () => {
    let releaseSession!: () => void;
    const sessionGate = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });
    let sessionRequests = 0;

    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/session')) {
        sessionRequests += 1;
        await sessionGate;
        return jsonResponse({ sessionId: 'single-flight' }, 201);
      }
      if (url.endsWith('/projects')) return jsonResponse([]);
      throw new Error(`Unexpected request: ${url}`);
    });
    await loadRemoteApi();

    const first = apiModule.api.projects.list();
    const second = apiModule.api.projects.list();

    expect(sessionRequests).toBe(1);
    releaseSession();
    await Promise.all([first, second]);

    expect(sessionRequests).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sessionValues.get(apiModule.SESSION_STORAGE_KEY)).toBe('single-flight');
  });

  it('does not bootstrap a session for the public health endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await loadRemoteApi();

    await expect(apiModule.api.health()).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has('X-Session-ID')).toBe(false);
    expect(sessionValues.size).toBe(0);
  });

  it('replaces an expired session and retries the original request once', async () => {
    await loadRemoteApi();
    sessionValues.set(apiModule.SESSION_STORAGE_KEY, 'expired-session');
    const input = { name: 'Recovered project', description: 'retry test' };
    const created = {
      id: 'project-1',
      name: input.name,
      description: input.description,
      color: '#2563eb',
      createdAt: '2026-11-16',
      documentIds: [],
    };
    let sessionRequests = 0;
    let projectRequests = 0;
    const attemptedSessions: Array<string | null> = [];

    fetchMock.mockImplementation(async (request, init) => {
      const url = String(request);
      if (url.endsWith('/session')) {
        sessionRequests += 1;
        return jsonResponse({ sessionId: 'fresh-session' }, 201);
      }
      if (url.endsWith('/projects')) {
        projectRequests += 1;
        const sessionId = new Headers(init?.headers).get('X-Session-ID');
        attemptedSessions.push(sessionId);
        if (sessionId === 'expired-session') {
          return jsonResponse({ message: 'Session expired or missing.' }, 401);
        }
        if (sessionId === 'fresh-session') return jsonResponse(created, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(apiModule.api.projects.create(input)).resolves.toEqual(created);

    expect(sessionRequests).toBe(1);
    expect(projectRequests).toBe(2);
    expect(removedSessionKeys).toContain(apiModule.SESSION_STORAGE_KEY);
    expect(sessionValues.get(apiModule.SESSION_STORAGE_KEY)).toBe('fresh-session');

    const projectCalls = fetchMock.mock.calls.filter(([request]) =>
      String(request).endsWith('/projects'),
    );
    expect(projectCalls).toHaveLength(2);
    expect(attemptedSessions).toEqual(['expired-session', 'fresh-session']);
    expect(projectCalls[0]?.[1]?.method).toBe('POST');
    expect(projectCalls[1]?.[1]?.method).toBe('POST');
    expect(projectCalls[0]?.[1]?.body).toBe(JSON.stringify(input));
    expect(projectCalls[1]?.[1]?.body).toBe(JSON.stringify(input));
  });

  it('stops after one retry when the refreshed session is also rejected', async () => {
    await loadRemoteApi();
    sessionValues.set(apiModule.SESSION_STORAGE_KEY, 'expired-session');
    let sessionRequests = 0;
    let projectRequests = 0;

    fetchMock.mockImplementation(async (request) => {
      const url = String(request);
      if (url.endsWith('/session')) {
        sessionRequests += 1;
        return jsonResponse({ sessionId: 'fresh-session' }, 201);
      }
      if (url.endsWith('/projects')) {
        projectRequests += 1;
        return jsonResponse({ message: 'Session rejected.' }, 401);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(apiModule.api.projects.list()).rejects.toMatchObject({ status: 401 });

    expect(sessionRequests).toBe(1);
    expect(projectRequests).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sessionValues.has(apiModule.SESSION_STORAGE_KEY)).toBe(false);
  });

  it('keeps local mode network-free', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_MODE', 'local');
    vi.stubEnv('VITE_API_BASE_URL', '');
    apiModule = await import('./api');

    await expect(apiModule.api.projects.list()).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
