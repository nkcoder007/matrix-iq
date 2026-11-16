import type { Concept, Connection, SessionData } from '../types';

/**
 * Removes every analysis artifact that can no longer be supported after the
 * given source documents are deleted. Evidence links are filtered first, then
 * concepts without support and connections without evidence are dropped.
 */
export function pruneAnalysisForRemovedDocuments(
  session: SessionData,
  removedDocumentIds: Set<string>,
): void {
  if (removedDocumentIds.size === 0) return;

  const removedConceptIds = new Set<string>();

  session.concepts = session.concepts.flatMap((concept: Concept) => {
    if (!concept.documentIds.some((id) => removedDocumentIds.has(id))) return [concept];

    const documentIds = concept.documentIds.filter((id) => !removedDocumentIds.has(id));
    if (documentIds.length === 0) {
      removedConceptIds.add(concept.id);
      return [];
    }

    if (!concept.evidence) {
      return [{ ...concept, documentIds }];
    }

    const evidence = concept.evidence.filter(
      (entry) => !removedDocumentIds.has(entry.documentId),
    );
    if (evidence.length === 0) {
      removedConceptIds.add(concept.id);
      return [];
    }

    return [{ ...concept, documentIds, evidence, mentions: evidence.length }];
  });

  session.connections = session.connections.flatMap((connection: Connection) => {
    if (removedConceptIds.has(connection.from) || removedConceptIds.has(connection.to)) {
      return [];
    }
    if (!connection.evidence) return [connection];

    const evidence = connection.evidence.filter(
      (entry) => !removedDocumentIds.has(entry.documentId),
    );
    if (evidence.length === 0) return [];
    return [{ ...connection, evidence }];
  });

  session.insights = session.insights.filter(
    (insight) => !insight.conceptIds.some((id) => removedConceptIds.has(id)),
  );
  session.dismissedIds = session.dismissedIds.filter((id) =>
    session.insights.some((insight) => insight.id === id),
  );
  session.savedConnectionIds = session.savedConnectionIds.filter((id) =>
    session.connections.some((connection) => connection.id === id),
  );
}
