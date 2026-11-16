import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '../types';

const apiMocks = vi.hoisted(() => ({
  sessionId: 'session-1',
  get: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('./api', () => {
  class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    ApiError,
    currentSessionId: () => apiMocks.sessionId,
    api: {
      projects: {
        get: apiMocks.get,
        create: apiMocks.create,
        remove: apiMocks.remove,
      },
    },
  };
});

const STORAGE_KEY = 'matrixiq-remote-session';

const workspace: Workspace = {
  id: 'ws-local',
  name: 'Local project',
  description: 'A local project',
  color: '#2563eb',
  createdAt: '2026-11-16',
  documentIds: [],
};

let storage: Map<string, string>;

function createSessionStorage(): Storage {
  return {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => [...storage.keys()][index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };
}

async function loadModules() {
  vi.resetModules();
  const remoteProjects = await import('./remoteProjects');
  const api = await import('./api');
  return { ...remoteProjects, ApiError: api.ApiError };
}

function mappedId(): string | undefined {
  const raw = storage.get(STORAGE_KEY);
  return raw
    ? (JSON.parse(raw) as { projects: Record<string, string> }).projects[workspace.id]
    : undefined;
}

function storeProjects(projects: Record<string, string>): void {
  storage.set(
    STORAGE_KEY,
    JSON.stringify({ sessionId: apiMocks.sessionId, projects, documents: [] }),
  );
}

beforeEach(() => {
  storage = new Map();
  apiMocks.sessionId = 'session-1';
  vi.stubGlobal('sessionStorage', createSessionStorage());
  apiMocks.get.mockReset();
  apiMocks.create.mockReset();
  apiMocks.remove.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('remote project mapping', () => {
  it('creates one backend project and reuses its ID', async () => {
    apiMocks.create.mockResolvedValue({ ...workspace, id: 'remote-1' });
    apiMocks.get.mockResolvedValue({ ...workspace, id: 'remote-1' });
    const { ensureRemoteProject } = await loadModules();

    await expect(ensureRemoteProject(workspace)).resolves.toBe('remote-1');
    await expect(ensureRemoteProject(workspace)).resolves.toBe('remote-1');

    expect(apiMocks.create).toHaveBeenCalledTimes(1);
    expect(apiMocks.get).toHaveBeenCalledWith('remote-1');
    expect(mappedId()).toBe('remote-1');
  });

  it('shares one creation request between concurrent uploads', async () => {
    let release!: (value: Workspace) => void;
    apiMocks.create.mockImplementation(
      () =>
        new Promise<Workspace>((resolve) => {
          release = resolve;
        }),
    );
    const { ensureRemoteProject } = await loadModules();

    const first = ensureRemoteProject(workspace);
    const second = ensureRemoteProject(workspace);
    expect(apiMocks.create).toHaveBeenCalledTimes(1);

    release({ ...workspace, id: 'remote-concurrent' });
    await expect(Promise.all([first, second])).resolves.toEqual([
      'remote-concurrent',
      'remote-concurrent',
    ]);
  });

  it('recreates a backend project when the mapped project has expired', async () => {
    storeProjects({ [workspace.id]: 'remote-stale' });
    apiMocks.create.mockResolvedValue({ ...workspace, id: 'remote-fresh' });
    const { ensureRemoteProject, ApiError } = await loadModules();
    apiMocks.get.mockRejectedValue(new ApiError('Project not found.', 404));

    await expect(ensureRemoteProject(workspace)).resolves.toBe('remote-fresh');
    expect(apiMocks.create).toHaveBeenCalledTimes(1);
    expect(mappedId()).toBe('remote-fresh');
  });

  it('deletes the mapped backend project and forgets the mapping', async () => {
    storeProjects({ [workspace.id]: 'remote-delete' });
    apiMocks.remove.mockResolvedValue(undefined);
    const { deleteRemoteProject } = await loadModules();

    await deleteRemoteProject(workspace.id);

    expect(apiMocks.remove).toHaveBeenCalledWith('remote-delete');
    expect(mappedId()).toBeUndefined();
  });

  it('treats an already deleted backend project as cleaned up', async () => {
    storeProjects({ [workspace.id]: 'remote-gone' });
    const { deleteRemoteProject, ApiError } = await loadModules();
    apiMocks.remove.mockRejectedValue(new ApiError('Project not found.', 404));

    await expect(deleteRemoteProject(workspace.id)).resolves.toBeUndefined();
    expect(mappedId()).toBeUndefined();
  });

  it('does not reuse mappings from a different browser session', async () => {
    storeProjects({ [workspace.id]: 'remote-old-session' });
    apiMocks.sessionId = 'session-2';
    apiMocks.create.mockResolvedValue({ ...workspace, id: 'remote-new-session' });
    const { ensureRemoteProject } = await loadModules();

    await expect(ensureRemoteProject(workspace)).resolves.toBe('remote-new-session');
    expect(apiMocks.get).not.toHaveBeenCalled();
    expect(apiMocks.create).toHaveBeenCalledTimes(1);
    expect(mappedId()).toBe('remote-new-session');
  });
});
