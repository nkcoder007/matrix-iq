import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeDocument } from '../types';

const apiMocks = vi.hoisted(() => ({
  sessionId: 'session-1' as string | null,
}));

vi.mock('./api', () => ({
  currentSessionId: () => apiMocks.sessionId,
}));

const STORAGE_KEY = 'matrixiq-remote-session';
const LEGACY_KEY = 'matrixiq-remote-projects';

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

async function loadModule() {
  vi.resetModules();
  return import('./remoteSession');
}

function source(id: string, remoteProjectId: string): KnowledgeDocument {
  return {
    id,
    title: id,
    subtitle: 'Uploaded text',
    kind: 'notes',
    source: 'Pasted text',
    addedAt: '2026-11-16',
    words: 2,
    excerpt: 'Temporary excerpt',
    summary: 'Temporary summary',
    conceptIds: [],
    status: 'extracted',
    remoteProjectId,
    content: 'temporary extracted text',
    fileKey: 'temporary-file',
  };
}

beforeEach(() => {
  storage = new Map();
  apiMocks.sessionId = 'session-1';
  vi.stubGlobal('sessionStorage', createSessionStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('session-scoped remote metadata', () => {
  it('stores mappings and metadata without extracted text or file keys', async () => {
    const remote = await loadModule();
    remote.rememberRemoteProject('local-1', 'remote-1');
    remote.rememberRemoteDocuments('remote-1', [source('doc-1', 'remote-1')]);

    expect(remote.getRemoteProject('local-1')).toBe('remote-1');
    const documents = remote.getRemoteDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0]?.content).toBeUndefined();
    expect(documents[0]?.fileKey).toBeUndefined();
    expect(storage.get(STORAGE_KEY)).toContain('"sessionId":"session-1"');
  });

  it('discards old metadata as soon as the backend session changes', async () => {
    const remote = await loadModule();
    remote.rememberRemoteProject('local-1', 'remote-1');
    remote.rememberRemoteDocuments('remote-1', [source('doc-1', 'remote-1')]);
    expect(remote.hasRemoteSessionData()).toBe(true);

    apiMocks.sessionId = 'session-2';

    expect(remote.getRemoteDocuments()).toEqual([]);
    expect(remote.getRemoteProject('local-1')).toBeUndefined();
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it('prunes mappings and documents for projects the server no longer has', async () => {
    const remote = await loadModule();
    remote.rememberRemoteProject('local-1', 'remote-1');
    remote.rememberRemoteProject('local-2', 'remote-2');
    remote.rememberRemoteDocuments('remote-1', [source('doc-1', 'remote-1')]);
    remote.rememberRemoteDocuments('remote-2', [source('doc-2', 'remote-2')]);

    remote.pruneRemoteSession(new Set(['remote-1']));

    expect(remote.getRemoteProject('local-1')).toBe('remote-1');
    expect(remote.getRemoteProject('local-2')).toBeUndefined();
    expect(remote.getRemoteDocuments().map((document) => document.id)).toEqual(['doc-1']);
  });

  it('clears only remote-session keys, leaving local-mode data alone', async () => {
    storage.set(LEGACY_KEY, '{}');
    storage.set('matrixiq-local-mode', 'keep me');
    const remote = await loadModule();
    remote.rememberRemoteProject('local-1', 'remote-1');

    remote.clearRemoteSession();

    expect(storage.has(STORAGE_KEY)).toBe(false);
    expect(storage.has(LEGACY_KEY)).toBe(false);
    expect(storage.get('matrixiq-local-mode')).toBe('keep me');
  });

  it('does not create remote state without an active backend session', async () => {
    apiMocks.sessionId = null;
    const remote = await loadModule();

    expect(() => remote.rememberRemoteProject('local-1', 'remote-1')).toThrow(
      'A backend session is required',
    );
    remote.rememberRemoteDocuments('remote-1', [source('doc-1', 'remote-1')]);

    expect(remote.hasRemoteSessionData()).toBe(false);
    expect(remote.getRemoteDocuments()).toEqual([]);
  });
});
