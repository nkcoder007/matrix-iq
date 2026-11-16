import type { Concept, Connection, Insight, KnowledgeDocument } from '../types';
import { RELATION_TYPES } from './relations';

export interface WorkspaceSearchResults {
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
  documents: KnowledgeDocument[];
}

interface SearchInput {
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
  documents: KnowledgeDocument[];
  conceptById: Map<string, Concept>;
}

/**
 * Search deliberately covers every object the footer promises, including IDs.
 * Empty queries return everything so the overlay can offer a useful starting view.
 */
export function searchWorkspace(query: string, input: SearchInput): WorkspaceSearchResults {
  const needle = query.trim().toLowerCase();
  const matches = (...values: Array<string | undefined>) =>
    !needle || values.some((value) => value?.toLowerCase().includes(needle));

  const concepts = input.concepts.filter((concept) =>
    matches(concept.id, concept.label, concept.definition),
  );

  const connections = input.connections.filter((connection) => {
    const from = input.conceptById.get(connection.from)?.label;
    const to = input.conceptById.get(connection.to)?.label;
    return matches(
      connection.id,
      connection.title,
      connection.explanation,
      RELATION_TYPES[connection.type].label,
      from,
      to,
    );
  });

  const insights = input.insights.filter((insight) =>
    matches(
      insight.id,
      insight.title,
      insight.summary,
      insight.rationale,
      insight.kind,
    ),
  );

  const documents = input.documents.filter((document) =>
    matches(
      document.id,
      document.title,
      document.subtitle,
      document.summary,
      document.source,
      document.fileName,
      document.content,
    ),
  );

  return { concepts, connections, insights, documents };
}
