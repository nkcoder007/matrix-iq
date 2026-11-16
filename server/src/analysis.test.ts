import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemorySessionStore } from './services/sessionStore';
import { AiProviderError } from './services/ai/types';
import type { AiProvider } from './services/ai/types';
import type { AiConfig } from './config';
import type { KnowledgeDocument, SessionData, Workspace } from './types';

const SID_A = 'session-a';
const SID_B = 'session-b';
const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';

const AI_CONFIG: AiConfig = {
  provider: 'gemini',
  apiKey: 'test-key',
  model: 'test-model',
  timeoutMs: 1000,
  maxDocumentChars: 20_000,
  maxTotalChars: 50_000,
};

function workspace(id: string, sessionId: string): Workspace {
  return {
    id,
    sessionId,
    name: 'Transport and colonies',
    description: 'Cross-document analysis fixture',
    color: '#2563eb',
    createdAt: '2026-11-16',
    documentIds: [],
  };
}

function document(
  id: string,
  sessionId: string,
  projectId: string,
  content: string,
): KnowledgeDocument {
  return {
    id,
    sessionId,
    workspaceId: projectId,
    title: id,
    subtitle: `Uploaded ${id}`,
    kind: 'notes',
    source: 'Uploaded text',
    addedAt: '2026-11-16',
    words: content.split(/\s+/).length,
    excerpt: content,
    summary: 'Extracted text.',
    conceptIds: [],
    content,
    status: 'extracted',
  };
}

function addDocument(
  session: SessionData,
  workspaceId: string,
  item: KnowledgeDocument,
): void {
  session.documents.push(item);
  const project = session.workspaces.find((entry) => entry.id === workspaceId);
  project?.documentIds.push(item.id);
}

class FakeProvider implements AiProvider {
  readonly name = 'fake';
  readonly model = 'fake-model';
  calls: string[] = [];
  private readonly responder: (prompt: string) => Promise<unknown>;

  constructor(responder: () => Promise<unknown> | unknown = () => validResponse()) {
    this.responder = async () => responder();
  }

  async analyze(prompt: string): Promise<unknown> {
    this.calls.push(prompt);
    return this.responder(prompt);
  }
}

function validResponse() {
  return {
    concepts: [
      {
        label: 'Decentralised coordination',
        clusterId: 'consensus',
        definition:
          'Groups can coordinate through local decisions rather than a central controller.',
        evidence: [
          {
            documentId: 'doc-ants',
            excerpt: 'Ants coordinate without a central controller.',
          },
          {
            documentId: 'doc-nodes',
            excerpt: 'Nodes coordinate through local messages.',
          },
        ],
      },
      {
        label: 'Local optimisation',
        clusterId: 'traffic',
        definition: 'Each participant improves its own small decision instead of a global plan.',
        evidence: [
          {
            documentId: 'doc-ants',
            excerpt: 'Each ant follows local signals.',
          },
          {
            documentId: 'doc-nodes',
            excerpt: 'Optimisation happens through small local decisions.',
          },
        ],
      },
    ],
    connections: [
      {
        from: 'Decentralised coordination',
        to: 'Local optimisation',
        type: 'similar',
        evidenceLevel: 'inference',
        strength: 0.8,
        confidence: 0.62,
        title: 'Local rules support collective behaviour',
        explanation:
          'Both passages describe a collective pattern emerging from small local decisions. This is a conceptual similarity, not evidence of a shared cause.',
        evidence: [
          {
            documentId: 'doc-ants',
            excerpt: 'Ants coordinate without a central controller.',
          },
          {
            documentId: 'doc-nodes',
            excerpt: 'Optimisation happens through small local decisions.',
          },
        ],
      },
    ],
  };
}

async function readJson(response: Response): Promise<{ status: number; json: unknown }> {
  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : undefined,
  };
}

async function request(
  app: ReturnType<typeof createApp>['app'],
  method: string,
  path: string,
  sessionId = SID_A,
) {
  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'X-Session-ID': sessionId },
    }),
  );
  return readJson(response);
}

function setup(provider: AiProvider | null = new FakeProvider()) {
  const store = new MemorySessionStore({ ttlMs: 60_000, sweepMs: 1000, autoSweep: false });
  const { app } = createApp({
    store,
    corsOrigins: [],
    aiProvider: provider,
    aiConfig: AI_CONFIG,
  });

  const sessionA = store.create(SID_A);
  const sessionB = store.create(SID_B);
  sessionA.workspaces.push(workspace(PROJECT_A, SID_A));
  sessionB.workspaces.push(workspace(PROJECT_B, SID_B));
  addDocument(
    sessionA,
    PROJECT_A,
    document(
      'doc-ants',
      SID_A,
      PROJECT_A,
      'Ants coordinate without a central controller. Each ant follows local signals. The colony adjusts to traffic and food without a manager.',
    ),
  );
  addDocument(
    sessionA,
    PROJECT_A,
    document(
      'doc-nodes',
      SID_A,
      PROJECT_A,
      'Nodes coordinate through local messages. Optimisation happens through small local decisions. Distributed systems tolerate missing messages.',
    ),
  );
  addDocument(
    sessionB,
    PROJECT_B,
    document(
      'doc-other',
      SID_B,
      PROJECT_B,
      'A private source in another session. It should never be visible to session A.',
    ),
  );

  return { app, store };
}

async function waitForStatus(
  app: ReturnType<typeof createApp>['app'],
  projectId: string,
  sessionId = SID_A,
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await request(app, 'GET', `/projects/${projectId}/analysis`, sessionId);
    const status = result.json as { status?: string };
    if (status.status !== 'running') return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Analysis did not finish in time.');
}

describe('Phase 3 — AI analysis', () => {
  it('creates a provider only when a key is configured', async () => {
    const { createAiProvider } = await import('./services/ai/gemini');
    expect(createAiProvider({ ...AI_CONFIG, apiKey: '' })).toBeNull();
    expect(createAiProvider(AI_CONFIG)?.model).toBe('test-model');
  });

  it('runs a multi-document analysis and stores validated concepts and evidence', async () => {
    const provider = new FakeProvider();
    const { app, store } = setup(provider);

    const started = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(started.status).toBe(202);
    expect((started.json as { status?: string }).status).toBe('running');

    const finished = await waitForStatus(app, PROJECT_A);
    expect(finished.status).toBe(200);
    expect(finished.json).toMatchObject({
      status: 'complete',
      documentCount: 2,
      conceptCount: 2,
      connectionCount: 1,
      model: 'fake-model',
    });

    const graph = await request(app, 'GET', `/projects/${PROJECT_A}/graph`);
    const body = graph.json as {
      concepts: Array<{
        id: string;
        label: string;
        documentIds: string[];
        evidence: Array<{ documentId: string; excerpt: string }>;
      }>;
      connections: Array<{
        id: string;
        from: string;
        to: string;
        evidenceLevel: string;
        isBridge: boolean;
        evidence: Array<{ documentId: string; excerpt: string }>;
      }>;
    };

    expect(body.concepts).toHaveLength(2);
    expect(body.concepts[0]?.id).toMatch(/^concept-/);
    expect(new Set(body.concepts.map((concept) => concept.id)).size).toBe(2);
    expect(body.concepts[0]?.documentIds).toEqual(['doc-ants', 'doc-nodes']);
    expect(body.concepts[0]?.evidence).toHaveLength(2);
    expect(body.connections[0]).toMatchObject({
      evidenceLevel: 'inference',
      isBridge: true,
    });
    expect(body.connections[0]?.evidence).toHaveLength(2);

    const session = store.get(SID_A)!;
    expect(session.documents.every((item) => item.conceptIds.length > 0)).toBe(true);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toContain('doc-ants');
    expect(provider.calls[0]).toContain('cross-document analysis engine');
  });

  it('rejects malformed responses and evidence that is not in the documents', async () => {
    const malformed = new FakeProvider(() => ({ concepts: 'not-a-list', connections: [] }));
    const { app } = setup(malformed);
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    const malformedStatus = await waitForStatus(app, PROJECT_A);
    expect(malformedStatus.json).toMatchObject({ status: 'failed' });
    expect((malformedStatus.json as { error?: string }).error).toContain('concepts');

    const inventedEvidence = new FakeProvider(() => ({
      ...validResponse(),
      concepts: [
        {
          ...validResponse().concepts[0],
          evidence: [{ documentId: 'doc-ants', excerpt: 'A quote that does not exist.' }],
        },
      ],
      connections: [],
    }));
    const second = setup(inventedEvidence);
    await request(second.app, 'POST', `/projects/${PROJECT_A}/analysis`);
    const evidenceStatus = await waitForStatus(second.app, PROJECT_A);
    expect(evidenceStatus.json).toMatchObject({ status: 'failed' });
    expect((evidenceStatus.json as { error?: string }).error).toContain('evidence excerpt');
  });

  it('surfaces provider failures and timeouts without exposing internals', async () => {
    const rateLimited = new FakeProvider(() => {
      throw new AiProviderError('rate_limit', 429, 'The AI provider is rate limiting requests.');
    });
    const first = setup(rateLimited);
    await request(first.app, 'POST', `/projects/${PROJECT_A}/analysis`);
    const limited = await waitForStatus(first.app, PROJECT_A);
    expect(limited.json).toMatchObject({ status: 'failed' });
    expect((limited.json as { error?: string }).error).toContain('rate limiting');
    expect(JSON.stringify(limited.json)).not.toContain('test-key');

    const timedOut = new FakeProvider(() => {
      throw new AiProviderError('timeout', 504, 'The AI analysis timed out.');
    });
    const second = setup(timedOut);
    await request(second.app, 'POST', `/projects/${PROJECT_A}/analysis`);
    const timeout = await waitForStatus(second.app, PROJECT_A);
    expect(timeout.json).toMatchObject({ status: 'failed' });
    expect((timeout.json as { error?: string }).error).toContain('timed out');
  });

  it('prevents duplicate simultaneous analysis requests', async () => {
    let resolveResponse: ((value: unknown) => void) | undefined;
    const pending = new Promise<unknown>((resolve) => {
      resolveResponse = resolve;
    });
    const provider = new FakeProvider(() => pending);
    const { app } = setup(provider);

    const first = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(first.status).toBe(202);

    const second = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(second.status).toBe(409);
    expect((second.json as { message?: string }).message).toContain('already running');

    resolveResponse?.(validResponse());
    const finished = await waitForStatus(app, PROJECT_A);
    expect(finished.json).toMatchObject({ status: 'complete' });
  });

  it('deduplicates concepts and merges their evidence', async () => {
    const duplicate = new FakeProvider(() => ({
      concepts: [
        {
          label: 'Local signals',
          clusterId: 'colonies',
          definition: 'Small local signals guide behaviour.',
          evidence: [{ documentId: 'doc-ants', excerpt: 'Each ant follows local signals.' }],
        },
        {
          label: '  local signals ',
          clusterId: 'colonies',
          definition: 'Small local signals guide behaviour.',
          evidence: [
            {
              documentId: 'doc-nodes',
              excerpt: 'Nodes coordinate through local messages.',
            },
          ],
        },
      ],
      connections: [],
    }));
    const { app } = setup(duplicate);
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(app, PROJECT_A);

    const graph = await request(app, 'GET', `/projects/${PROJECT_A}/graph`);
    const body = graph.json as {
      concepts: Array<{ id: string; documentIds: string[]; evidence: unknown[] }>;
    };
    expect(body.concepts).toHaveLength(1);
    expect(body.concepts[0]?.documentIds).toEqual(['doc-ants', 'doc-nodes']);
    expect(body.concepts[0]?.evidence).toHaveLength(2);
  });

  it('keeps analysis isolated between sessions and returns project-scoped graphs', async () => {
    const { app } = setup();
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(app, PROJECT_A);

    const otherGraph = await request(app, 'GET', `/projects/${PROJECT_B}/graph`, SID_B);
    expect(otherGraph.status).toBe(200);
    expect(otherGraph.json).toEqual({ concepts: [], connections: [] });

    const crossSession = await request(app, 'GET', `/projects/${PROJECT_A}/graph`, SID_B);
    expect(crossSession.status).toBe(404);

    const otherAnalysis = await request(app, 'GET', `/projects/${PROJECT_B}/analysis`, SID_B);
    expect(otherAnalysis.json).toMatchObject({ status: 'idle', documentCount: 1 });
  });

  it('marks speculative links as suggested and caps their confidence', async () => {
    const speculative = new FakeProvider(() => ({
      concepts: [
        {
          label: 'Collective rhythm',
          clusterId: 'colonies',
          definition: 'A shared rhythm emerges from repeated local behaviour.',
          evidence: [{ documentId: 'doc-ants', excerpt: 'Each ant follows local signals.' }],
        },
      ],
      connections: [],
    }));
    const { app } = setup(speculative);
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(app, PROJECT_A);

    const directSpeculative = new FakeProvider(() => ({
      concepts: [
        {
          label: 'Collective rhythm',
          clusterId: 'colonies',
          definition: 'A shared rhythm emerges from repeated local behaviour.',
          evidence: [{ documentId: 'doc-ants', excerpt: 'Each ant follows local signals.' }],
        },
        {
          label: 'Distributed messaging',
          clusterId: 'consensus',
          definition: 'Nodes exchange small messages rather than a central plan.',
          evidence: [{ documentId: 'doc-nodes', excerpt: 'Nodes coordinate through local messages.' }],
        },
      ],
      connections: [
        {
          from: 'Collective rhythm',
          to: 'Distributed messaging',
          type: 'similar',
          evidenceLevel: 'speculative',
          strength: 0.5,
          confidence: 0.99,
          title: 'Possible shared pattern',
          explanation: 'This is an analogy that needs further investigation, not a proven link.',
          evidence: [
            { documentId: 'doc-ants', excerpt: 'Each ant follows local signals.' },
          ],
        },
      ],
    }));
    const second = setup(directSpeculative);
    await request(second.app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(second.app, PROJECT_A);
    const graph = await request(second.app, 'GET', `/projects/${PROJECT_A}/graph`);
    const body = graph.json as {
      connections: Array<{ evidenceLevel: string; confidence: number; suggested?: boolean }>;
    };
    expect(body.connections[0]).toMatchObject({
      evidenceLevel: 'speculative',
      confidence: 0.4,
      suggested: true,
    });
  });

  it('marks analysis stale after sources change and replaces results on reanalysis', async () => {
    const { app, store } = setup();
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(app, PROJECT_A);

    addDocument(
      store.get(SID_A)!,
      PROJECT_A,
      document(
        'doc-new',
        SID_A,
        PROJECT_A,
        'A new source adds another local decision example.',
      ),
    );

    const stale = await request(app, 'GET', `/projects/${PROJECT_A}/analysis`);
    expect(stale.json).toMatchObject({ status: 'stale' });

    const reanalysis = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(reanalysis.status).toBe(202);
    const finished = await waitForStatus(app, PROJECT_A);
    expect(finished.json).toMatchObject({ status: 'complete', documentCount: 3 });

    const graph = await request(app, 'GET', `/projects/${PROJECT_A}/graph`);
    const body = graph.json as { concepts: Array<{ id: string }> };
    expect(body.concepts).toHaveLength(2);
    expect(new Set(body.concepts.map((concept) => concept.id)).size).toBe(2);
  });

  it('removes concepts and connection evidence when a source is deleted', async () => {
    const { app } = setup();
    await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    await waitForStatus(app, PROJECT_A);

    const deleted = await request(app, 'DELETE', `/projects/${PROJECT_A}/sources/doc-ants`);
    expect(deleted.status).toBe(204);

    const graph = await request(app, 'GET', `/projects/${PROJECT_A}/graph`);
    const body = graph.json as {
      concepts: Array<{
        label: string;
        documentIds: string[];
        evidence: Array<{ documentId: string }>;
      }>;
      connections: Array<{ evidence: Array<{ documentId: string }> }>;
    };

    expect(body.concepts).toHaveLength(2);
    expect(
      body.concepts.every((concept) =>
        concept.evidence.every((entry) => entry.documentId !== 'doc-ants'),
      ),
    ).toBe(true);
    expect(body.connections).toHaveLength(1);
    expect(
      body.connections[0]?.evidence.every((entry) => entry.documentId !== 'doc-ants'),
    ).toBe(true);
  });

  it('requires sources and a configured provider', async () => {
    const { app, store } = setup(null);
    const session = store.get(SID_A)!;
    const project = session.workspaces.find((item) => item.id === PROJECT_A)!;
    project.documentIds = [];
    session.documents = session.documents.filter((item) => item.workspaceId !== PROJECT_A);

    const noSources = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(noSources.status).toBe(400);

    addDocument(
      session,
      PROJECT_A,
      document('doc-one', SID_A, PROJECT_A, 'One source is enough to explain this idea.'),
    );
    const configured = await request(app, 'POST', `/projects/${PROJECT_A}/analysis`);
    expect(configured.status).toBe(503);
    expect((configured.json as { message?: string }).message).toContain('GEMINI_API_KEY');
  });
});
