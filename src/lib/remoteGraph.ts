import type { Concept, Connection, KnowledgeState } from '../types';

export interface RemoteGraph {
  concepts: Concept[];
  connections: Connection[];
}

function remoteDocumentIdsForProject(state: KnowledgeState, remoteProjectId: string): Set<string> {
  return new Set(
    state.documents
      .filter((document) => document.remoteProjectId === remoteProjectId)
      .map((document) => document.id),
  );
}

/**
 * Removes analysis derived from the given remote documents while keeping
 * unrelated local-mode concepts, connections and insights intact.
 */
export function stripRemoteAnalysis(
  state: KnowledgeState,
  remoteDocumentIds: Set<string>,
): KnowledgeState {
  if (remoteDocumentIds.size === 0) return state;

  const removedConceptIds = new Set(
    state.concepts
      .filter((concept) =>
        concept.documentIds.some((documentId) => remoteDocumentIds.has(documentId)),
      )
      .map((concept) => concept.id),
  );
  if (removedConceptIds.size === 0) return state;

  return {
    ...state,
    concepts: state.concepts.filter((concept) => !removedConceptIds.has(concept.id)),
    connections: state.connections.filter(
      (connection) =>
        !removedConceptIds.has(connection.from) && !removedConceptIds.has(connection.to),
    ),
    insights: state.insights.filter(
      (insight) => !insight.conceptIds.some((id) => removedConceptIds.has(id)),
    ),
  };
}

/**
 * Applies the backend's authoritative graph for one remote project. Local
 * documents and local concepts are never replaced.
 */
export function mergeRemoteGraph(
  state: KnowledgeState,
  remoteProjectId: string,
  graph: RemoteGraph,
): KnowledgeState {
  const remoteDocumentIds = remoteDocumentIdsForProject(state, remoteProjectId);
  if (remoteDocumentIds.size === 0) return state;

  const stripped = stripRemoteAnalysis(state, remoteDocumentIds);

  const incomingConcepts: Concept[] = graph.concepts.flatMap((concept) => {
    const documentIds = concept.documentIds.filter((id) => remoteDocumentIds.has(id));
    if (documentIds.length === 0) return [];
    const evidence = concept.evidence?.filter((entry) =>
      remoteDocumentIds.has(entry.documentId),
    );
    return [{ ...concept, documentIds, ...(evidence ? { evidence } : {}) }];
  });
  const allConcepts = [...stripped.concepts, ...incomingConcepts];
  const conceptIds = new Set(allConcepts.map((concept) => concept.id));

  const incomingConnections = graph.connections.filter(
    (connection) =>
      conceptIds.has(connection.from) &&
      conceptIds.has(connection.to) &&
      (connection.evidence ?? []).some((entry) => remoteDocumentIds.has(entry.documentId)),
  );

  const incomingByDocument = new Map<string, string[]>();
  for (const concept of incomingConcepts) {
    for (const documentId of concept.documentIds) {
      incomingByDocument.set(documentId, [
        ...(incomingByDocument.get(documentId) ?? []),
        concept.id,
      ]);
    }
  }

  return {
    ...stripped,
    concepts: allConcepts,
    connections: [
      ...stripped.connections,
      ...incomingConnections.filter(
        (connection) => !stripped.connections.some((edge) => edge.id === connection.id),
      ),
    ],
    documents: stripped.documents.map((document) =>
      remoteDocumentIds.has(document.id)
        ? {
            ...document,
            conceptIds: incomingByDocument.get(document.id) ?? [],
            summary:
              (incomingByDocument.get(document.id)?.length ?? 0) > 0
                ? 'Analysed together with this project. Concepts and connections include source evidence.'
                : document.summary,
          }
        : document,
    ),
  };
}

/** Removes every source and analysis artifact tied to remote sessions. */
export function removeRemoteSessionData(state: KnowledgeState): KnowledgeState {
  const remoteDocumentIds = new Set(
    state.documents
      .filter((document) => Boolean(document.remoteProjectId))
      .map((document) => document.id),
  );
  if (remoteDocumentIds.size === 0) return state;

  const stripped = stripRemoteAnalysis(state, remoteDocumentIds);
  return {
    ...stripped,
    documents: stripped.documents.filter((document) => !remoteDocumentIds.has(document.id)),
    workspaces: stripped.workspaces.map((workspace) => ({
      ...workspace,
      documentIds: workspace.documentIds.filter((id) => !remoteDocumentIds.has(id)),
    })),
  };
}
