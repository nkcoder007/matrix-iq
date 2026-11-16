import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../app';
import type {
  Workspace,
  KnowledgeDocument,
  SessionData,
} from '../types';
import { pruneAnalysisForRemovedDocuments } from '../services/analysisCleanup';

const projects = new Hono<Env>();

const DEFAULT_COLORS = [
  '#2563eb',
  '#6d5bd0',
  '#b7791f',
  '#b8455f',
  '#0e7490',
  '#b45309',
];

function generateColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type ProjectResponse = Omit<Workspace, 'sessionId'>;

function toProjectResponse(workspace: Workspace): ProjectResponse {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    color: workspace.color,
    createdAt: workspace.createdAt,
    documentIds: workspace.documentIds,
  };
}

function validateCreate(body: unknown): { name: string; description: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HTTPException(400, { message: 'Request body must be a JSON object.' });
  }
  const obj = body as Record<string, unknown>;
  const name = obj.name;
  const description = obj.description;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new HTTPException(400, {
      message: 'Project name is required and must be a non-empty string.',
    });
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new HTTPException(400, {
      message: 'Project description must be a string.',
    });
  }

  return {
    name: name.trim(),
    description: (description ?? '').trim(),
  };
}

function validateUpdate(body: unknown): { name?: string; description?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HTTPException(400, { message: 'Request body must be a JSON object.' });
  }
  const obj = body as Record<string, unknown>;
  const name = obj.name;
  const description = obj.description;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new HTTPException(400, {
        message: 'Project name must be a non-empty string.',
      });
    }
  }
  if (description !== undefined && typeof description !== 'string') {
    throw new HTTPException(400, {
      message: 'Project description must be a string.',
    });
  }
  if (name === undefined && description === undefined) {
    throw new HTTPException(400, {
      message: 'At least one of name or description must be provided.',
    });
  }

  return {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(description !== undefined ? { description: description.trim() } : {}),
  };
}

function findWorkspace(sessionId: string, sessionWorkspaces: Workspace[], id: string): Workspace {
  const workspace = sessionWorkspaces.find((w) => w.id === id);
  if (!workspace) {
    throw new HTTPException(404, { message: 'Project not found.' });
  }
  if (workspace.sessionId !== sessionId) {
    throw new HTTPException(404, { message: 'Project not found.' });
  }
  return workspace;
}

function cascadeDeleteProject(session: SessionData, workspace: Workspace): void {
  // Collect document IDs from both workspace.documentIds and any documents
  // in the session that reference this workspace (defensive: workspace.documentIds
  // should be authoritative, but we also scan session.documents for robustness).
  const documentIds = new Set(workspace.documentIds);
  session.documents.forEach((doc: KnowledgeDocument) => {
    if (doc.workspaceId === workspace.id) {
      documentIds.add(doc.id);
    }
  });

  session.documents = session.documents.filter(
    (doc: KnowledgeDocument) => doc.workspaceId !== workspace.id,
  );
  pruneAnalysisForRemovedDocuments(session, documentIds);
  session.projectAnalysis.delete(workspace.id);

  for (const docId of documentIds) {
    session.analysisStatus.delete(docId);
    session.fileBuffers.delete(docId);
  }
}
/** GET /projects — list all projects belonging to the current session. */
projects.get('/', (c) => {
  const session = c.get('session');
  const workspaces = session.workspaces.map(toProjectResponse);
  return c.json(workspaces);
});

/** POST /projects — create a new project. */
projects.post('/', async (c) => {
  const session = c.get('session');
  const sessionId = c.get('sessionId');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid request body.' });
  }
  let input: { name: string; description: string };
  try {
    input = validateCreate(body);
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    throw new HTTPException(400, { message: 'Invalid request body.' });
  }

  const id = crypto.randomUUID();
  const workspace: Workspace = {
    id,
    sessionId,
    name: input.name,
    description: input.description,
    color: generateColor(input.name),
    createdAt: nowIso(),
    documentIds: [],
  };

  session.workspaces.push(workspace);
  if (!session.activeWorkspaceId) {
    session.activeWorkspaceId = id;
  }

  return c.json(toProjectResponse(workspace), 201);
});

/** GET /projects/:id — retrieve a specific project. */
projects.get('/:id', (c) => {
  const session = c.get('session');
  const sessionId = c.get('sessionId');
  const id = c.req.param('id');
  const workspace = findWorkspace(sessionId, session.workspaces, id);
  return c.json(toProjectResponse(workspace));
});

/** PATCH /projects/:id — update project information. */
projects.patch('/:id', async (c) => {
  const session = c.get('session');
  const sessionId = c.get('sessionId');
  const id = c.req.param('id');
  const existing = findWorkspace(sessionId, session.workspaces, id);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid request body.' });
  }
  let input: { name?: string; description?: string };
  try {
    input = validateUpdate(body);
  } catch (err) {
    if (err instanceof HTTPException) throw err;
    throw new HTTPException(400, { message: 'Invalid request body.' });
  }

  const index = session.workspaces.findIndex((w) => w.id === id);
  const workspace = { ...existing, ...input };
  session.workspaces[index] = workspace;

  return c.json(toProjectResponse(workspace));
});

/** DELETE /projects/:id — delete a project and all its associated data. */
projects.delete('/:id', (c) => {
  const session = c.get('session');
  const sessionId = c.get('sessionId');
  const id = c.req.param('id');
  const workspace = findWorkspace(sessionId, session.workspaces, id);

  cascadeDeleteProject(session, workspace);

  session.workspaces = session.workspaces.filter((w) => w.id !== id);

  if (session.activeWorkspaceId === id) {
    session.activeWorkspaceId =
      session.workspaces.length > 0 ? session.workspaces[0].id : null;
  }

  return c.body(null, 204);
});

export default projects;

