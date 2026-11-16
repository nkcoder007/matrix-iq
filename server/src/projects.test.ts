import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from './app';
import { MemorySessionStore } from './services/sessionStore';

type TestApp = ReturnType<typeof createApp>['app'];

let app: TestApp;
let store: MemorySessionStore;

async function request(
  method: string,
  path: string,
  sessionId: string,
  body?: unknown,
) {
  const headers: Record<string, string> = { 'X-Session-ID': sessionId };
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
  return { status: res.status, json, body: text };
}

describe('Phase 1 — Project Management', () => {
  const sidA = 'session-a';
  const sidB = 'session-b';

  beforeEach(() => {
    store = new MemorySessionStore({ ttlMs: 30 * 60 * 1000, sweepMs: 1000, autoSweep: false });
    ({ app } = createApp({ store, corsOrigins: [] }));
    store.create(sidA);
    store.create(sidB);
  });
  describe('POST /projects — create', () => {
    it('creates a project with name and description', async () => {
      const { status, json } = await request('POST', '/projects', sidA, {
        name: 'My Project',
        description: 'A test project',
      });
      expect(status).toBe(201);
      expect((json as { id?: string }).id).toBeDefined();
      expect((json as { name?: string }).name).toBe('My Project');
      expect((json as { description?: string }).description).toBe('A test project');
      expect((json as { color?: string }).color).toBeDefined();
      expect((json as { createdAt?: string }).createdAt).toBeDefined();
      expect((json as { documentIds?: string[] }).documentIds).toEqual([]);
      expect(json).not.toHaveProperty('sessionId');
    });

    it('creates a project with empty description', async () => {
      const { status, json } = await request('POST', '/projects', sidA, {
        name: 'No Desc',
        description: '',
      });
      expect(status).toBe(201);
      expect((json as { description?: string }).description).toBe('');
    });

    it('rejects missing name', async () => {
      const { status, json } = await request('POST', '/projects', sidA, {
        description: 'no name',
      });
      expect(status).toBe(400);
      expect((json as { message?: string })?.message).toContain('name');
    });

    it('rejects empty name', async () => {
      const { status } = await request('POST', '/projects', sidA, {
        name: '   ',
        description: 'whitespace name',
      });
      expect(status).toBe(400);
    });

    it('rejects non-object body', async () => {
      const { status } = await request('POST', '/projects', sidA, 'not json');
      expect(status).toBe(400);
    });

    it('rejects invalid JSON body', async () => {
      const res = await app.fetch(
        new Request('http://localhost/projects', {
          method: 'POST',
          headers: {
            'X-Session-ID': sidA,
            'Content-Type': 'application/json',
          },
          body: '{invalid',
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('GET /projects — list', () => {
    it('returns empty list for session with no projects', async () => {
      const { status, json } = await request('GET', '/projects', sidA);
      expect(status).toBe(200);
      expect(json).toEqual([]);
    });

    it('returns only projects for the current session', async () => {
      await request('POST', '/projects', sidA, { name: 'Project A', description: 'desc A' });
      await request('POST', '/projects', sidB, { name: 'Project B', description: 'desc B' });

      const { status, json } = await request('GET', '/projects', sidA);
      expect(status).toBe(200);
      const projects = json as { name?: string }[];
      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('Project A');
      expect(projects[0]).not.toHaveProperty('sessionId');
    });

    it('returns multiple projects for the same session', async () => {
      await request('POST', '/projects', sidA, { name: 'First', description: 'd1' });
      await request('POST', '/projects', sidA, { name: 'Second', description: 'd2' });

      const { status, json } = await request('GET', '/projects', sidA);
      expect(status).toBe(200);
      const projects = json as { name?: string }[];
      expect(projects).toHaveLength(2);
    });
  });

  describe('GET /projects/:id — retrieve', () => {
    let projectId: string;

    beforeEach(async () => {
      const { json } = await request('POST', '/projects', sidA, {
        name: 'Retrieve Me',
        description: 'desc',
      });
      projectId = (json as { id?: string }).id as string;
    });

    it('returns the project by ID', async () => {
      const { status, json } = await request('GET', `/projects/${projectId}`, sidA);
      expect(status).toBe(200);
      expect((json as { id?: string }).id).toBe(projectId);
      expect((json as { name?: string }).name).toBe('Retrieve Me');
      expect(json).not.toHaveProperty('sessionId');
    });

    it('returns 404 for nonexistent project', async () => {
      const { status, json } = await request('GET', '/projects/nonexistent-id', sidA);
      expect(status).toBe(404);
      expect((json as { message?: string })?.message).toContain('Project');
    });

    it('returns 404 when accessing another session project', async () => {
      const { json } = await request('POST', '/projects', sidB, {
        name: 'Session B Project',
        description: 'desc',
      });
      const bid = (json as { id?: string }).id as string;

      const { status } = await request('GET', `/projects/${bid}`, sidA);
      expect(status).toBe(404);
    });
  });

  describe('PATCH /projects/:id — update', () => {
    let projectId: string;

    beforeEach(async () => {
      const { json } = await request('POST', '/projects', sidA, {
        name: 'Original',
        description: 'Original desc',
      });
      projectId = (json as { id?: string }).id as string;
    });

    it('updates name and description', async () => {
      const { status, json } = await request('PATCH', `/projects/${projectId}`, sidA, {
        name: 'Updated',
        description: 'Updated desc',
      });
      expect(status).toBe(200);
      expect((json as { name?: string }).name).toBe('Updated');
      expect((json as { description?: string }).description).toBe('Updated desc');
      expect(json).not.toHaveProperty('sessionId');
    });

    it('updates only name', async () => {
      const { status, json } = await request('PATCH', `/projects/${projectId}`, sidA, {
        name: 'Name Only',
      });
      expect(status).toBe(200);
      expect((json as { name?: string }).name).toBe('Name Only');
      expect((json as { description?: string }).description).toBe('Original desc');
    });

    it('updates only description', async () => {
      const { status, json } = await request('PATCH', `/projects/${projectId}`, sidA, {
        description: 'Desc Only',
      });
      expect(status).toBe(200);
      expect((json as { name?: string }).name).toBe('Original');
      expect((json as { description?: string }).description).toBe('Desc Only');
    });

    it('rejects empty name on update', async () => {
      const { status } = await request('PATCH', `/projects/${projectId}`, sidA, {
        name: '   ',
      });
      expect(status).toBe(400);
    });

    it('rejects empty body', async () => {
      const { status } = await request('PATCH', `/projects/${projectId}`, sidA, {});
      expect(status).toBe(400);
    });

    it('returns 404 for nonexistent project', async () => {
      const { status } = await request('PATCH', '/projects/nonexistent', sidA, {
        name: 'Nope',
      });
      expect(status).toBe(404);
    });

    it('returns 404 when updating another session project', async () => {
      const { json } = await request('POST', '/projects', sidB, {
        name: 'Session B',
        description: 'desc',
      });
      const bid = (json as { id?: string }).id as string;

      const { status } = await request('PATCH', `/projects/${bid}`, sidA, {
        name: 'Hacked',
      });
      expect(status).toBe(404);
    });
  });

  describe('DELETE /projects/:id — delete', () => {
    it('deletes a project and returns 204', async () => {
      const { json } = await request('POST', '/projects', sidA, {
        name: 'To Delete',
        description: 'desc',
      });
      const id = (json as { id?: string }).id as string;

      const { status } = await request('DELETE', `/projects/${id}`, sidA);
      expect(status).toBe(204);

      const { json: list } = await request('GET', '/projects', sidA);
      expect((list as unknown[])).toHaveLength(0);
    });

    it('returns 404 for nonexistent project', async () => {
      const { status } = await request('DELETE', '/projects/nonexistent', sidA);
      expect(status).toBe(404);
    });

    it('returns 404 when deleting another session project', async () => {
      const { json } = await request('POST', '/projects', sidB, {
        name: 'Session B',
        description: 'desc',
      });
      const bid = (json as { id?: string }).id as string;

      const { status } = await request('DELETE', `/projects/${bid}`, sidA);
      expect(status).toBe(404);

      const { json: listB } = await request('GET', '/projects', sidB);
      expect((listB as { id?: string }[])).toHaveLength(1);
    });

    it('cascades deletion: removes documents, concepts, connections, insights', async () => {
      const { json: projJson } = await request('POST', '/projects', sidA, {
        name: 'Cascade Test',
        description: 'desc',
      });
      const pid = (projJson as { id?: string }).id as string;

      const docId = 'doc-1';
      const session = store.get(sidA)!;
      session.documents.push({
        id: docId,
        sessionId: sidA,
        workspaceId: pid,
        title: 'Test Doc',
        subtitle: 'sub',
        kind: 'notes',
        source: 'test',
        addedAt: new Date().toISOString().slice(0, 10),
        words: 10,
        excerpt: 'excerpt',
        summary: 'summary',
        conceptIds: [],
        status: 'queued',
      });

      session.concepts.push({
        id: 'concept-1',
        sessionId: sidA,
        label: 'Test Concept',
        clusterId: 'colonies',
        definition: 'A test concept',
        documentIds: [docId],
        mentions: 1,
      });

      session.connections.push({
        id: 'conn-1',
        sessionId: sidA,
        from: 'concept-1',
        to: 'concept-1',
        type: 'related',
        strength: 1,
        confidence: 1,
        title: 'Self relation',
        explanation: 'test',
        isBridge: false,
      });

      session.insights.push({
        id: 'insight-1',
        sessionId: sidA,
        kind: 'pattern',
        title: 'Test Insight',
        summary: 'summary',
        rationale: 'rationale',
        conceptIds: ['concept-1'],
        confidence: 0.9,
        createdAt: new Date().toISOString(),
      });

      session.analysisStatus.set(docId, {
        status: 'queued',
        updatedAt: new Date().toISOString(),
      });
      session.fileBuffers.set(docId, {
        buffer: Buffer.from('test'),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });

      const { status } = await request('DELETE', `/projects/${pid}`, sidA);
      expect(status).toBe(204);

      const updated = store.get(sidA)!;
      expect(updated.documents).toHaveLength(0);
      expect(updated.concepts).toHaveLength(0);
      expect(updated.connections).toHaveLength(0);
      expect(updated.insights).toHaveLength(0);
      expect(updated.analysisStatus.has(docId)).toBe(false);
      expect(updated.fileBuffers.has(docId)).toBe(false);
      expect(updated.workspaces).toHaveLength(0);
    });

    it('cascades deletion: removes associated data but keeps other projects intact', async () => {
      const { json: projA } = await request('POST', '/projects', sidA, {
        name: 'Project A',
        description: 'desc',
      });
      const pidA = (projA as { id?: string }).id as string;

      const { json: projB } = await request('POST', '/projects', sidA, {
        name: 'Project B',
        description: 'desc',
      });
      const pidB = (projB as { id?: string }).id as string;

      const session = store.get(sidA)!;
      session.documents.push({
        id: 'doc-a',
        sessionId: sidA,
        workspaceId: pidA,
        title: 'Doc A',
        subtitle: 'sub',
        kind: 'notes',
        source: 'test',
        addedAt: new Date().toISOString().slice(0, 10),
        words: 10,
        excerpt: '',
        summary: '',
        conceptIds: [],
        status: 'queued',
      });

      session.concepts.push({
        id: 'concept-a',
        sessionId: sidA,
        label: 'Concept A',
        clusterId: 'colonies',
        definition: 'def',
        documentIds: ['doc-a'],
        mentions: 1,
      });

      await request('DELETE', `/projects/${pidA}`, sidA);

      const { json: list } = await request('GET', '/projects', sidA);
      expect((list as { id?: string }[])).toHaveLength(1);
      expect((list as { id?: string }[])[0]?.id).toBe(pidB);

      const updated = store.get(sidA)!;
      expect(updated.documents).toHaveLength(0);
      expect(updated.concepts).toHaveLength(0);
    });

    it('sets activeWorkspaceId to null when last project is deleted', async () => {
      const { json } = await request('POST', '/projects', sidA, {
        name: 'Only Project',
        description: 'desc',
      });
      const id = (json as { id?: string }).id as string;

      await request('DELETE', `/projects/${id}`, sidA);

      const session = store.get(sidA)!;
      expect(session.activeWorkspaceId).toBeNull();
    });
  });
});

