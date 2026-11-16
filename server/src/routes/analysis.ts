import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../app';
import type { AiConfig } from '../config';
import type {
  Concept,
  Connection,
  Insight,
  KnowledgeDocument,
  ProjectAnalysisRecord,
  ProjectAnalysisStatusResponse,
  SessionData,
  Workspace,
} from '../types';
import { runDocumentAnalysis } from '../services/ai/analysis';
import { AiProviderError } from '../services/ai/types';
import type { AiProvider } from '../services/ai/types';
import { AnalysisValidationError } from '../services/ai/validate';
import type { ValidatedAnalysis } from '../services/ai/validate';

function now(): string {
  return new Date().toISOString();
}

function findWorkspace(
  sessionId: string,
  workspaces: Workspace[],
  projectId: string,
): Workspace {
  const workspace = workspaces.find((item) => item.id === projectId);
  if (!workspace || workspace.sessionId !== sessionId) {
    throw new HTTPException(404, { message: 'Project not found.' });
  }
  return workspace;
}

function projectDocuments(session: SessionData, workspace: Workspace): KnowledgeDocument[] {
  return workspace.documentIds
    .map((id) => session.documents.find((document) => document.id === id))
    .filter((document): document is KnowledgeDocument => Boolean(document));
}

function sameDocumentSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = new Set(a);
  return b.every((id) => left.has(id));
}

function toStatusResponse(
  session: SessionData,
  workspace: Workspace,
): ProjectAnalysisStatusResponse {
  const record = session.projectAnalysis.get(workspace.id);
  const documentIds = workspace.documentIds;
  const currentDocumentCount = documentIds.length;

  if (!record) {
    return {
      projectId: workspace.id,
      status: 'idle',
      documentCount: currentDocumentCount,
      conceptCount: 0,
      connectionCount: 0,
      updatedAt: now(),
    };
  }

  const status =
    record.status === 'complete' && !sameDocumentSet(record.documentIds, documentIds)
      ? 'stale'
      : record.status;

  return {
    projectId: workspace.id,
    status,
    documentCount: currentDocumentCount,
    conceptCount: record.conceptCount,
    connectionCount: record.connectionCount,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
    error: record.error,
    model: record.model,
  };
}

function setDocumentStatus(
  session: SessionData,
  documentIds: string[],
  status: 'queued' | 'running' | 'complete' | 'failed',
  error?: string,
): void {
  const timestamp = now();
  for (const documentId of documentIds) {
    session.analysisStatus.set(documentId, {
      status,
      ...(error ? { error } : {}),
      updatedAt: timestamp,
    });
  }
}

function applyAnalysis(
  session: SessionData,
  workspace: Workspace,
  result: ValidatedAnalysis,
): void {
  const documentIds = new Set(workspace.documentIds);
  const replacedConceptIds = new Set(
    session.concepts
      .filter((concept) => concept.documentIds.some((id) => documentIds.has(id)))
      .map((concept) => concept.id),
  );

  session.concepts = session.concepts.filter(
    (concept) => !replacedConceptIds.has(concept.id),
  );
  session.connections = session.connections.filter(
    (connection) =>
      !replacedConceptIds.has(connection.from) && !replacedConceptIds.has(connection.to),
  );
  session.insights = session.insights.filter(
    (insight) => !insight.conceptIds.some((id) => replacedConceptIds.has(id)),
  );

  const concepts: Concept[] = result.concepts.map((concept) => ({
    ...concept,
    sessionId: session.sessionId,
  }));
  const connections: Connection[] = result.connections.map((connection) => ({
    ...connection,
    sessionId: session.sessionId,
  }));

  session.concepts.push(...concepts);
  session.connections.push(...connections);

  for (const document of projectDocuments(session, workspace)) {
    document.conceptIds = concepts
      .filter((concept) => concept.documentIds.includes(document.id))
      .map((concept) => concept.id);
    document.summary =
      'Analysed together with this project. Concepts and connections include source evidence.';
    session.analysisStatus.set(document.id, {
      status: 'complete',
      updatedAt: now(),
    });
  }
}

function analysisErrorMessage(error: unknown): string {
  if (error instanceof AiProviderError || error instanceof AnalysisValidationError) {
    return error.message;
  }
  return 'The analysis could not be completed. Try again.';
}

export function createAnalysisRoute(provider: AiProvider | null, config: AiConfig) {
  const analysis = new Hono<Env>();

  analysis.get('/:projectId/analysis', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(
      sessionId,
      session.workspaces,
      c.req.param('projectId'),
    );
    return c.json(toStatusResponse(session, workspace), 200);
  });

  analysis.post('/:projectId/analysis', async (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(
      sessionId,
      session.workspaces,
      c.req.param('projectId'),
    );
    const documents = projectDocuments(session, workspace);

    if (documents.length === 0) {
      throw new HTTPException(400, {
        message: 'Add at least one source before running analysis.',
      });
    }
    if (!provider) {
      throw new HTTPException(503, {
        message:
          'AI analysis is not configured on this server. Set GEMINI_API_KEY in the server environment.',
      });
    }

    const existing = session.projectAnalysis.get(workspace.id);
    if (existing?.status === 'running') {
      throw new HTTPException(409, {
        message: 'Analysis is already running for this project.',
      });
    }

    const documentIds = [...workspace.documentIds];
    const record: ProjectAnalysisRecord = {
      status: 'running',
      startedAt: now(),
      updatedAt: now(),
      documentIds,
      conceptCount: 0,
      connectionCount: 0,
      model: provider.model,
    };
    session.projectAnalysis.set(workspace.id, record);
    setDocumentStatus(session, documentIds, 'running');

    void runDocumentAnalysis(provider, workspace.id, workspace.name, documents, config)
      .then((result) => {
        const currentWorkspace = session.workspaces.find((item) => item.id === workspace.id);
        if (!currentWorkspace) return;

        if (!sameDocumentSet(record.documentIds, currentWorkspace.documentIds)) {
          record.status = 'failed';
          record.error = 'Sources changed while analysis was running. Run analysis again.';
          record.updatedAt = now();
          setDocumentStatus(session, record.documentIds, 'failed', record.error);
          return;
        }

        applyAnalysis(session, currentWorkspace, result);
        record.status = 'complete';
        record.completedAt = now();
        record.updatedAt = record.completedAt;
        record.conceptCount = result.concepts.length;
        record.connectionCount = result.connections.length;
        record.error = undefined;
      })
      .catch((error: unknown) => {
        const currentWorkspace = session.workspaces.find((item) => item.id === workspace.id);
        if (!currentWorkspace) return;

        record.status = 'failed';
        record.error = analysisErrorMessage(error);
        record.updatedAt = now();
        setDocumentStatus(session, record.documentIds, 'failed', record.error);
      });

    return c.json(toStatusResponse(session, workspace), 202);
  });

  analysis.get('/:projectId/graph', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(
      sessionId,
      session.workspaces,
      c.req.param('projectId'),
    );
    const documentIds = new Set(workspace.documentIds);
    const concepts = session.concepts.filter((concept) =>
      concept.documentIds.some((documentId) => documentIds.has(documentId)),
    );
    const conceptIds = new Set(concepts.map((concept) => concept.id));
    const connections = session.connections.filter(
      (connection) => conceptIds.has(connection.from) && conceptIds.has(connection.to),
    );

    return c.json(
      {
        concepts: concepts.map(({ sessionId: _sessionId, ...concept }) => concept),
        connections: connections.map(({ sessionId: _sessionId, ...connection }) => connection),
      },
      200,
    );
  });

  analysis.get('/:projectId/insights', (c) => {
    const session = c.get('session');
    const sessionId = c.get('sessionId');
    const workspace = findWorkspace(
      sessionId,
      session.workspaces,
      c.req.param('projectId'),
    );
    const documentIds = new Set(workspace.documentIds);
    const conceptIds = new Set(
      session.concepts
        .filter((concept) => concept.documentIds.some((id) => documentIds.has(id)))
        .map((concept) => concept.id),
    );
    const insights = session.insights.filter((insight: Insight) =>
      insight.conceptIds.some((id) => conceptIds.has(id)),
    );
    return c.json(
      {
        insights: insights.map(({ sessionId: _sessionId, ...insight }) => insight),
      },
      200,
    );
  });

  return analysis;
}
