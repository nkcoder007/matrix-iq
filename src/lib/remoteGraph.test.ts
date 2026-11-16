import { describe, expect, it } from 'vitest';
import type { Concept, KnowledgeDocument, KnowledgeState } from '../types';
import { mergeRemoteGraph, removeRemoteSessionData, stripRemoteAnalysis } from './remoteGraph';

function document(id: string, remoteProjectId?: string): KnowledgeDocument {
  return {
    id,
    title: id,
    subtitle: 'Source',
    kind: 'notes',
    source: 'Pasted text',
    addedAt: '2026-11-16',
    words: 10,
    excerpt: 'Excerpt',
    summary: 'Summary',
    conceptIds: [],
    ...(remoteProjectId ? { remoteProjectId } : {}),
  };
}

function concept(
  id: string,
  documentIds: string[],
  label = id,
  evidence = documentIds.map((documentId) => ({ documentId, excerpt: `${documentId} quote` })),
): Concept {
  return {
    id,
    label,
    clusterId: 'consensus',
    definition: 'Definition',
    documentIds,
    mentions: evidence.length,
    evidence,
  };
}

const localDocument = document('doc-local');
const remoteOne = document('doc-r1', 'remote-1');
const remoteTwo = document('doc-r2', 'remote-1');
const localConcept = concept('concept-local', ['doc-local']);
const oldRemoteConcept = concept('concept-old', ['doc-r1']);

const state: KnowledgeState = {
  workspaces: [
    {
      id: 'ws-local',
      name: 'Local',
      description: 'Test',
      color: '#2563eb',
      createdAt: '2026-11-16',
      documentIds: ['doc-local', 'doc-r1', 'doc-r2'],
    },
  ],
  activeWorkspaceId: 'ws-local',
  documents: [localDocument, remoteOne, remoteTwo],
  concepts: [localConcept, oldRemoteConcept],
  connections: [
    {
      id: 'connection-old',
      from: 'concept-old',
      to: 'concept-local',
      type: 'related',
      strength: 0.4,
      confidence: 0.4,
      title: 'Old',
      explanation: 'Old remote relation',
      isBridge: false,
    },
  ],
  insights: [
    {
      id: 'insight-old',
      kind: 'pattern',
      title: 'Old insight',
      summary: 'Summary',
      rationale: 'Rationale',
      conceptIds: ['concept-old'],
      confidence: 0.4,
      createdAt: '2026-11-16',
    },
  ],
};

describe('remote graph merging', () => {
  it('replaces only the remote project graph and updates source concept IDs', () => {
    const next = mergeRemoteGraph(state, 'remote-1', {
      concepts: [concept('concept-new', ['doc-r1', 'doc-r2'])],
      connections: [
        {
          id: 'connection-new',
          from: 'concept-new',
          to: 'concept-new',
          type: 'similar',
          strength: 0.5,
          confidence: 0.5,
          title: 'New',
          explanation: 'New relation',
          isBridge: true,
          evidenceLevel: 'inference',
          evidence: [
            { documentId: 'doc-r1', excerpt: 'r1 quote' },
            { documentId: 'doc-r2', excerpt: 'r2 quote' },
          ],
        },
      ],
    });

    expect(next.concepts.map((item) => item.id)).toContain('concept-local');
    expect(next.concepts.map((item) => item.id)).toContain('concept-new');
    expect(next.concepts.map((item) => item.id)).not.toContain('concept-old');
    expect(next.insights).toHaveLength(0);
    expect(next.documents.find((item) => item.id === 'doc-r1')?.conceptIds).toEqual([
      'concept-new',
    ]);
    expect(next.documents.find((item) => item.id === 'doc-local')?.conceptIds).toEqual([]);
  });

  it('drops connection evidence that belongs to a deleted remote source', () => {
    const stripped = stripRemoteAnalysis(state, new Set(['doc-r1']));
    expect(stripped.concepts.map((item) => item.id)).toEqual(['concept-local']);
    expect(stripped.connections).toHaveLength(0);
  });

  it('removes remote sources and their analysis on session replacement', () => {
    const next = removeRemoteSessionData(state);
    expect(next.documents.map((item) => item.id)).toEqual(['doc-local']);
    expect(next.workspaces[0]?.documentIds).toEqual(['doc-local']);
    expect(next.concepts.map((item) => item.id)).toEqual(['concept-local']);
  });
});
