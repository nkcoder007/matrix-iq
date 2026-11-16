/* Copies the three sample sources — and only their concepts and links — into a
   new workspace. Ids are prefixed with the workspace id so records from two
   projects can never collide or leak into each other. */

import { CONCEPTS, CONNECTIONS, DOCUMENTS, INSIGHTS } from './seed';
import type { Concept, Connection, Insight, KnowledgeDocument } from '../types';

const DEMO_ORIGIN_KEYS = ['bees', 'raft', 'sourdough'];

export interface ClonedCorpus {
  documents: KnowledgeDocument[];
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
  documentIds: string[];
}

export function cloneDemoSources(workspaceId: string): ClonedCorpus {
  const documents = DOCUMENTS.filter(
    (document) => document.originKey && DEMO_ORIGIN_KEYS.includes(document.originKey),
  );

  const documentMap = new Map(documents.map((document) => [document.id, `${workspaceId}-${document.id}`]));

  const sourceConcepts = CONCEPTS.filter((concept) =>
    concept.documentIds.some((documentId) => documentMap.has(documentId)),
  );
  const conceptMap = new Map(
    sourceConcepts.map((concept) => [concept.id, `${workspaceId}-${concept.id}`]),
  );

  const concepts: Concept[] = sourceConcepts.map((concept) => ({
    ...concept,
    id: conceptMap.get(concept.id) as string,
    documentIds: concept.documentIds
      .filter((documentId) => documentMap.has(documentId))
      .map((documentId) => documentMap.get(documentId) as string),
  }));

  const edgeMap = new Map<string, string>();
  const connections: Connection[] = CONNECTIONS.filter(
    (connection) => conceptMap.has(connection.from) && conceptMap.has(connection.to),
  ).map((connection) => {
    const id = `${workspaceId}-${connection.id}`;
    edgeMap.set(connection.id, id);
    return {
      ...connection,
      id,
      from: conceptMap.get(connection.from) as string,
      to: conceptMap.get(connection.to) as string,
    };
  });

  const insights: Insight[] = INSIGHTS.filter((insight) =>
    insight.conceptIds.some((conceptId) => conceptMap.has(conceptId)),
  ).map((insight) => {
    const remappedEdge = insight.edgeId ? edgeMap.get(insight.edgeId) : undefined;
    return {
      ...insight,
      id: `${workspaceId}-${insight.id}`,
      conceptIds: insight.conceptIds
        .filter((conceptId) => conceptMap.has(conceptId))
        .map((conceptId) => conceptMap.get(conceptId) as string),
      edgeId: remappedEdge,
    };
  });

  const clonedDocuments: KnowledgeDocument[] = documents.map((document) => ({
    ...document,
    id: documentMap.get(document.id) as string,
    conceptIds: document.conceptIds
      .filter((conceptId) => conceptMap.has(conceptId))
      .map((conceptId) => conceptMap.get(conceptId) as string),
  }));

  return {
    documents: clonedDocuments,
    concepts,
    connections,
    insights,
    documentIds: clonedDocuments.map((document) => document.id),
  };
}
