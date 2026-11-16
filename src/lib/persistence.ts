import type { GraphPreferences, KnowledgeState } from '../types';
import { stripRemoteAnalysis } from './remoteGraph';

const DB_NAME = 'matrixiq-local';
const DB_VERSION = 1;
const STATE_STORE = 'state';
const FILE_STORE = 'files';
const SNAPSHOT_KEY = 'workspace';
const FALLBACK_KEY = 'matrixiq-workspace-v1';
const SNAPSHOT_VERSION = 1;

export interface PersistedSnapshot {
  version: typeof SNAPSHOT_VERSION;
  savedAt: string;
  state: KnowledgeState;
  dismissedIds: string[];
  savedConnectionIds: string[];
  prefs: GraphPreferences;
}

/**
 * Remote sources belong to the active browser session, not the durable local
 * snapshot. They live in sessionStorage with their project mapping; only
 * local-mode sources are written to IndexedDB/localStorage.
 */
export function withoutRemoteSources(snapshot: PersistedSnapshot): PersistedSnapshot {
  const remoteIds = new Set(
    snapshot.state.documents
      .filter((document) => Boolean(document.remoteProjectId))
      .map((document) => document.id),
  );
  if (remoteIds.size === 0) return snapshot;

  const stripped = stripRemoteAnalysis(snapshot.state, remoteIds);

  return {
    ...snapshot,
    state: {
      ...stripped,
      documents: stripped.documents.filter((document) => !remoteIds.has(document.id)),
      workspaces: stripped.workspaces.map((workspace) => ({
        ...workspace,
        documentIds: workspace.documentIds.filter((id) => !remoteIds.has(id)),
      })),
    },
  };
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable.'));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE)) {
        database.createObjectStore(STATE_STORE);
      }
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        database.createObjectStore(FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasId(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPreferences(value: unknown): value is GraphPreferences {
  return (
    isRecord(value) &&
    typeof value.showLabels === 'boolean' &&
    typeof value.highlightSuggested === 'boolean' &&
    typeof value.reduceMotion === 'boolean' &&
    (value.theme === 'light' || value.theme === 'dark')
  );
}

export function isPersistedSnapshot(value: unknown): value is PersistedSnapshot {
  if (!isRecord(value) || value.version !== SNAPSHOT_VERSION) return false;
  const state = value.state;
  if (!isRecord(state)) return false;
  if (!Array.isArray(state.workspaces) || state.workspaces.length === 0) return false;
  if (
    !state.workspaces.every(
      (workspace) =>
        isRecord(workspace) &&
        typeof workspace.id === 'string' &&
        Array.isArray(workspace.documentIds),
    )
  ) {
    return false;
  }
  if (typeof state.activeWorkspaceId !== 'string') return false;
  if (
    !Array.isArray(state.documents) ||
    !state.documents.every(hasId) ||
    !Array.isArray(state.concepts) ||
    !state.concepts.every(hasId) ||
    !Array.isArray(state.connections) ||
    !state.connections.every(hasId) ||
    !Array.isArray(state.insights) ||
    !state.insights.every(hasId)
  ) {
    return false;
  }
  return (
    isStringArray(value.dismissedIds) &&
    isStringArray(value.savedConnectionIds) &&
    isPreferences(value.prefs)
  );
}

function readFallbackSnapshot(): PersistedSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadPersistedSnapshot(): Promise<PersistedSnapshot | null> {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STATE_STORE, 'readonly');
    const result = await requestResult(
      transaction.objectStore(STATE_STORE).get(SNAPSHOT_KEY),
    );
    const snapshot = isPersistedSnapshot(result) ? result : readFallbackSnapshot();
    return snapshot ? withoutRemoteSources(snapshot) : null;
  } catch {
    const snapshot = readFallbackSnapshot();
    return snapshot ? withoutRemoteSources(snapshot) : null;
  }
}

export async function savePersistedSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  const stored = withoutRemoteSources(snapshot);
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STATE_STORE, 'readwrite');
    transaction.objectStore(STATE_STORE).put(stored, SNAPSHOT_KEY);
    await transactionDone(transaction);
  } catch {
    // A small metadata-only fallback keeps projects alive if IndexedDB is blocked.
    try {
      window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(stored));
    } catch {
      throw new Error('Browser storage is unavailable or full.');
    }
  }
}

export async function saveSourceFile(key: string, file: Blob): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, 'readwrite');
  transaction.objectStore(FILE_STORE).put(file, key);
  await transactionDone(transaction);
}

export async function getSourceFile(key: string): Promise<Blob | null> {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(FILE_STORE, 'readonly');
    const result = await requestResult(transaction.objectStore(FILE_STORE).get(key));
    return result instanceof Blob ? result : null;
  } catch {
    return null;
  }
}

export async function deleteSourceFile(key: string): Promise<void> {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(FILE_STORE, 'readwrite');
    transaction.objectStore(FILE_STORE).delete(key);
    await transactionDone(transaction);
  } catch {
    // A missing stored file must never block deleting its source record.
  }
}

export async function downloadSourceFile(key: string, fileName: string): Promise<boolean> {
  const file = await getSourceFile(key);
  if (!file) return false;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export const snapshotVersion = SNAPSHOT_VERSION;
