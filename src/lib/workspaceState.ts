import type { KnowledgeState } from '../types';

/**
 * Removes a source and every derived record that can no longer be supported.
 * Concepts shared with another remaining source survive; the rest cascade.
 */
export function removeDocumentFromState(
  state: KnowledgeState,
  documentId: string,
): KnowledgeState {
  if (!state.documents.some((document) => document.id === documentId)) return state;

  const removedConceptIds = new Set<string>();
  const concepts = state.concepts.flatMap((concept) => {
    if (!concept.documentIds.includes(documentId)) return [concept];
    const documentIds = concept.documentIds.filter((id) => id !== documentId);
    if (documentIds.length === 0) {
      removedConceptIds.add(concept.id);
      return [];
    }
    if (!concept.evidence) return [{ ...concept, documentIds }];
    const evidence = concept.evidence.filter((entry) => entry.documentId !== documentId);
    if (evidence.length === 0) {
      removedConceptIds.add(concept.id);
      return [];
    }
    return [{ ...concept, documentIds, evidence, mentions: evidence.length }];
  });

  const connections = state.connections.flatMap((connection) => {
    if (removedConceptIds.has(connection.from) || removedConceptIds.has(connection.to)) {
      return [];
    }
    if (!connection.evidence) return [connection];
    const evidence = connection.evidence.filter(
      (entry) => entry.documentId !== documentId,
    );
    if (evidence.length === 0) return [];
    if (connection.evidenceLevel === 'inference' && evidence.length < 2) return [];
    return [{ ...connection, evidence }];
  });
  const connectionIds = new Set(connections.map((connection) => connection.id));

  const insights = state.insights.flatMap((insight) => {
    if (insight.conceptIds.some((conceptId) => removedConceptIds.has(conceptId))) return [];
    if (!insight.evidence) return [insight];

    const evidence = insight.evidence.filter((entry) => entry.documentId !== documentId);
    if (evidence.length === 0) return [];
    if (insight.evidenceLevel === 'inference' && evidence.length < 2) return [];

    const documentIds = [...new Set(evidence.map((entry) => entry.documentId))];
    if (
      (insight.kind === 'bridge' || insight.kind === 'pattern') &&
      documentIds.length < 2
    ) {
      return [];
    }

    const { edgeId, ...rest } = insight;
    return [
      {
        ...rest,
        evidence,
        documentIds,
        ...(edgeId && connectionIds.has(edgeId) ? { edgeId } : {}),
      },
    ];
  });

  return {
    ...state,
    workspaces: state.workspaces.map((workspace) => ({
      ...workspace,
      documentIds: workspace.documentIds.filter((id) => id !== documentId),
    })),
    documents: state.documents.filter((document) => document.id !== documentId),
    concepts,
    connections,
    insights,
  };
}

/** Removes a project by cascading every source it owns, then chooses a survivor. */
export function removeWorkspaceFromState(
  state: KnowledgeState,
  workspaceId: string,
): KnowledgeState {
  const workspace = state.workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return state;

  let next = state;
  for (const documentId of workspace.documentIds) {
    next = removeDocumentFromState(next, documentId);
  }

  const workspaces = next.workspaces.filter((item) => item.id !== workspaceId);
  if (workspaces.length === 0) return state;

  return {
    ...next,
    workspaces,
    activeWorkspaceId: workspaces[0].id,
  };
}

export function renameWorkspaceInState(
  state: KnowledgeState,
  workspaceId: string,
  updates: { name: string; description: string },
): KnowledgeState {
  const name = updates.name.trim();
  if (!name) return state;
  return {
    ...state,
    workspaces: state.workspaces.map((workspace) =>
      workspace.id === workspaceId
        ? {
            ...workspace,
            name,
            description: updates.description.trim() || workspace.description,
          }
        : workspace,
    ),
  };
}

export function renameDocumentInState(
  state: KnowledgeState,
  documentId: string,
  title: string,
): KnowledgeState {
  const nextTitle = title.trim();
  if (!nextTitle) return state;
  return {
    ...state,
    documents: state.documents.map((document) =>
      document.id === documentId ? { ...document, title: nextTitle } : document,
    ),
  };
}
