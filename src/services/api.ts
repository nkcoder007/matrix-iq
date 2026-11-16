import type {
  Concept,
  Connection,
  Insight,
  KnowledgeDocument,
  Workspace,
} from '../types';

export type ApiMode = 'local' | 'remote';

export interface BackendConfig {
  mode: ApiMode;
  baseUrl: string;
  /**
   * Remote calls require an explicit mode AND base URL. This prevents a
   * half-configured deployment from accidentally posting source content.
   */
  configured: boolean;
}

const requestedMode = import.meta.env.VITE_API_MODE;
const requestedBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const backendConfig: BackendConfig = {
  mode: requestedMode === 'remote' ? 'remote' : 'local',
  baseUrl: requestedBaseUrl || '/api',
  configured: requestedMode === 'remote' && Boolean(requestedBaseUrl),
};

export const SESSION_STORAGE_KEY = 'matrixiq-session-id';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ProjectInput {
  name: string;
  description: string;
}

export interface SourceUploadInput {
  /** PDF or other original file. The backend owns extraction. */
  file?: Blob;
  fileName?: string;
  /** Pasted or text-file content. */
  content?: string;
  title?: string;
}

export interface GraphResponse {
  concepts: Concept[];
  connections: Connection[];
}

export interface InsightsResponse {
  insights: Insight[];
}

export interface SourceAnalysis {
  sourceId: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  error?: string;
  updatedAt: string;
}

let memorySessionId: string | null = null;
let pendingSession: Promise<string> | null = null;
let ignoredSessionId: string | null = null;

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function storedSessionId(): string | null {
  if (memorySessionId) return memorySessionId;
  try {
    const stored = sessionStorageOrNull()?.getItem(SESSION_STORAGE_KEY)?.trim();
    return stored && stored !== ignoredSessionId ? stored : null;
  } catch {
    return null;
  }
}

function rememberSessionId(sessionId: string): void {
  memorySessionId = sessionId;
  ignoredSessionId = null;
  try {
    sessionStorageOrNull()?.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Private browsing can block storage; the in-memory fallback still works
    // for this page load.
  }
}

function forgetSessionId(sessionId: string): void {
  const memoryMatches = memorySessionId === sessionId;
  let storageMatches = false;

  try {
    const storage = sessionStorageOrNull();
    if (storage?.getItem(SESSION_STORAGE_KEY) === sessionId) {
      storageMatches = true;
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // The in-memory guard below still prevents reuse for this page load.
  }

  if (!memoryMatches && !storageMatches) return;
  if (memoryMatches) memorySessionId = null;
  ignoredSessionId = sessionId;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : undefined;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

async function createSession(): Promise<string> {
  const response = await fetch(`${backendConfig.baseUrl}/session`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await parseResponse<{ sessionId?: unknown }>(response);

  if (typeof payload?.sessionId !== 'string' || payload.sessionId.trim() === '') {
    throw new ApiError('The backend did not return a valid session ID.', response.status);
  }

  const sessionId = payload.sessionId.trim();
  rememberSessionId(sessionId);
  return sessionId;
}

async function ensureSessionId(): Promise<string> {
  const existing = storedSessionId();
  if (existing) return existing;

  if (!pendingSession) {
    pendingSession = createSession().finally(() => {
      pendingSession = null;
    });
  }

  return pendingSession;
}

interface RequestOptions {
  /** Public endpoints such as /health must not bootstrap a session. */
  authenticated?: boolean;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  if (!backendConfig.configured) {
    throw new ApiError(
      'The backend is not configured. Set VITE_API_MODE=remote and VITE_API_BASE_URL.',
      0,
    );
  }

  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let managedSessionId: string | null = null;
  if (options.authenticated !== false && !headers.has('X-Session-ID')) {
    managedSessionId = await ensureSessionId();
    headers.set('X-Session-ID', managedSessionId);
  }

  const send = () =>
    fetch(`${backendConfig.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
    });

  let response = await send();

  // A managed session can expire while the tab stays open. Invalidate it,
  // bootstrap once, and retry the same request once. If the retry is also
  // rejected, surface the 401 instead of looping.
  if (response.status === 401 && managedSessionId) {
    forgetSessionId(managedSessionId);
    const refreshedSessionId = await ensureSessionId();
    headers.set('X-Session-ID', refreshedSessionId);
    response = await send();

    if (response.status === 401) {
      forgetSessionId(refreshedSessionId);
    }
  }

  return parseResponse<T>(response);
}

/**
 * Contract for the backend. The UI still reads and writes local IndexedDB
 * state; these methods are the integration seam for remote-backed screens.
 */
export const api = {
  health: () => request<{ ok: boolean }>('/health', {}, { authenticated: false }),

  projects: {
    list: () => request<Workspace[]>('/projects'),
    get: (projectId: string) => request<Workspace>(`/projects/${projectId}`),
    create: (input: ProjectInput) =>
      request<Workspace>('/projects', { method: 'POST', body: JSON.stringify(input) }),
    update: (projectId: string, input: ProjectInput) =>
      request<Workspace>(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: (projectId: string) =>
      request<void>(`/projects/${projectId}`, { method: 'DELETE' }),
    graph: (projectId: string) => request<GraphResponse>(`/projects/${projectId}/graph`),
    insights: (projectId: string) =>
      request<InsightsResponse>(`/projects/${projectId}/insights`),
  },

  sources: {
    list: (projectId: string) =>
      request<KnowledgeDocument[]>(`/projects/${projectId}/sources`),
    get: (projectId: string, sourceId: string) =>
      request<KnowledgeDocument>(`/projects/${projectId}/sources/${sourceId}`),
    upload: (projectId: string, input: SourceUploadInput) => {
      const form = new FormData();
      if (input.file) {
        form.append('file', input.file, input.fileName ?? 'source');
      }
      if (input.content !== undefined) form.append('content', input.content);
      if (input.title) form.append('title', input.title);
      return request<KnowledgeDocument>(`/projects/${projectId}/sources`, {
        method: 'POST',
        body: form,
      });
    },
    remove: (projectId: string, sourceId: string) =>
      request<void>(`/projects/${projectId}/sources/${sourceId}`, { method: 'DELETE' }),
    analyze: (projectId: string, sourceId: string) =>
      request<SourceAnalysis>(`/projects/${projectId}/sources/${sourceId}/analyze`, {
        method: 'POST',
      }),
    analysis: (projectId: string, sourceId: string) =>
      request<SourceAnalysis>(`/projects/${projectId}/sources/${sourceId}/analysis`),
  },
};
