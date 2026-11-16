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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  const response = await fetch(`${backendConfig.baseUrl}${path}`, {
    ...init,
    headers,
    // Authentication is deliberately not implemented in this frontend build.
    credentials: 'same-origin',
  });

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

/**
 * Contract for the future backend. These methods are intentionally unused by
 * the UI until a backend exists; screens read local IndexedDB state instead.
 */
export const api = {
  health: () => request<{ ok: boolean }>('/health'),

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
