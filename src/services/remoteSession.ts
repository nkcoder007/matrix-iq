import { currentSessionId } from './api';
import type { KnowledgeDocument } from '../types';

const STORAGE_KEY = 'matrixiq-remote-session';
const LEGACY_PROJECTS_KEY = 'matrixiq-remote-projects';

interface RemoteSessionState {
  sessionId: string;
  projects: Record<string, string>;
  documents: KnowledgeDocument[];
}

let memoryState: RemoteSessionState | null = null;

function storageOrNull(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRemoteState(value: unknown): value is RemoteSessionState {
  if (!isRecord(value) || typeof value.sessionId !== 'string') return false;
  if (!isRecord(value.projects) || !Array.isArray(value.documents)) return false;
  if (!Object.values(value.projects).every((id) => typeof id === 'string')) return false;
  return value.documents.every(
    (document) =>
      isRecord(document) &&
      typeof document.id === 'string' &&
      typeof document.remoteProjectId === 'string',
  );
}

function readState(): RemoteSessionState | null {
  const sessionId = currentSessionId();
  if (!sessionId) return null;

  let state = memoryState;
  if (!state) {
    try {
      const raw = storageOrNull()?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isRemoteState(parsed)) state = parsed;
      }
    } catch {
      state = null;
    }
  }

  if (!state || state.sessionId !== sessionId) {
    clearRemoteSession();
    return null;
  }
  return state;
}

function writeState(state: RemoteSessionState): void {
  memoryState = state;
  try {
    storageOrNull()?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The in-memory copy still covers this page load.
  }
}

function metadataOnly(document: KnowledgeDocument): KnowledgeDocument {
  const metadata = { ...document };
  delete metadata.content;
  delete metadata.fileKey;
  return metadata;
}

export function clearRemoteSession(): void {
  memoryState = null;
  try {
    const storage = storageOrNull();
    storage?.removeItem(STORAGE_KEY);
    storage?.removeItem(LEGACY_PROJECTS_KEY);
  } catch {
    // A failed clear must not break the session transition.
  }
}

export function hasRemoteSessionData(): boolean {
  const state = readState();
  return Boolean(state && (state.documents.length > 0 || Object.keys(state.projects).length > 0));
}

export function getRemoteProject(localProjectId: string): string | undefined {
  return readState()?.projects[localProjectId];
}

export function localProjectIdForRemoteProject(remoteProjectId: string): string | undefined {
  const state = readState();
  if (!state) return undefined;
  return Object.entries(state.projects).find(([, remoteId]) => remoteId === remoteProjectId)?.[0];
}

export function rememberRemoteProject(localProjectId: string, remoteProjectId: string): void {
  const sessionId = currentSessionId();
  if (!sessionId) throw new Error('A backend session is required for remote projects.');
  const state = readState() ?? { sessionId, projects: {}, documents: [] };
  writeState({
    ...state,
    projects: { ...state.projects, [localProjectId]: remoteProjectId },
  });
}

export function forgetRemoteProject(localProjectId: string): void {
  const state = readState();
  if (!state || !(localProjectId in state.projects)) return;
  const projects = { ...state.projects };
  delete projects[localProjectId];
  writeState({ ...state, projects });
}

export function getRemoteDocuments(): KnowledgeDocument[] {
  return (readState()?.documents ?? []).map((document) => ({ ...document }));
}

export function rememberRemoteDocuments(
  remoteProjectId: string,
  documents: KnowledgeDocument[],
): void {
  const sessionId = currentSessionId();
  if (!sessionId) return;
  const state = readState() ?? { sessionId, projects: {}, documents: [] };
  const prepared = documents.map((document) => ({
    ...metadataOnly(document),
    remoteProjectId,
  }));
  writeState({
    ...state,
    documents: [
      ...state.documents.filter((document) => document.remoteProjectId !== remoteProjectId),
      ...prepared,
    ],
  });
}

export function forgetRemoteDocument(sourceId: string): void {
  const state = readState();
  if (!state) return;
  const documents = state.documents.filter((document) => document.id !== sourceId);
  if (documents.length === state.documents.length) return;
  writeState({ ...state, documents });
}

export function forgetRemoteProjectDocuments(remoteProjectId: string): void {
  const state = readState();
  if (!state) return;
  const documents = state.documents.filter(
    (document) => document.remoteProjectId !== remoteProjectId,
  );
  if (documents.length === state.documents.length) return;
  writeState({ ...state, documents });
}

export function renameRemoteDocument(sourceId: string, title: string): void {
  const state = readState();
  if (!state) return;
  let changed = false;
  const documents = state.documents.map((document) => {
    if (document.id !== sourceId) return document;
    changed = true;
    return { ...document, title };
  });
  if (changed) writeState({ ...state, documents });
}

/**
 * Drops mappings and document metadata for backend projects that no longer
 * exist in the active session. The browser only keeps what the server can
 * still resolve after a reload.
 */
export function pruneRemoteSession(activeRemoteProjectIds: Set<string>): void {
  const state = readState();
  if (!state) return;
  const projects = Object.fromEntries(
    Object.entries(state.projects).filter(([, remoteId]) =>
      activeRemoteProjectIds.has(remoteId),
    ),
  );
  const remainingRemoteIds = new Set(Object.values(projects));
  const documents = state.documents.filter((document) =>
    remainingRemoteIds.has(document.remoteProjectId ?? ''),
  );
  writeState({ ...state, projects, documents });
}
