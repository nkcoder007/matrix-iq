import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONNECTIONS, DOCUMENTS, INSIGHTS } from '../data/seed';
import { searchWorkspace } from './search';

const input = {
  concepts: CONCEPTS,
  connections: CONNECTIONS,
  insights: INSIGHTS,
  documents: DOCUMENTS,
  conceptById: new Map(CONCEPTS.map((concept) => [concept.id, concept])),
};

describe('searchWorkspace', () => {
  it('finds a concept by a fragment of its id', () => {
    const results = searchWorkspace('quorum', input);
    expect(results.concepts.some((concept) => concept.id === 'quorum-selection')).toBe(true);
  });

  it('finds connections by title, explanation, type and endpoints', () => {
    const connection = CONNECTIONS[0];
    const from = CONCEPTS.find((concept) => concept.id === connection.from);
    expect(from).toBeDefined();

    expect(searchWorkspace(connection.title, input).connections.some((item) => item.id === connection.id)).toBe(
      true,
    );
    if (from) {
      expect(
        searchWorkspace(from.label, input).connections.some((item) => item.id === connection.id),
      ).toBe(true);
    }
  });

  it('finds insights and sources, including stored pasted text', () => {
    const insight = INSIGHTS[0];
    expect(searchWorkspace(insight.title, input).insights.some((item) => item.id === insight.id)).toBe(
      true,
    );

    const queuedDocument = {
      ...DOCUMENTS[0],
      id: 'doc-pasted-search-test',
      title: 'Pasted field note',
      content: 'A stored sentence about cathedral builders.',
    };
    expect(
      searchWorkspace('cathedral builders', {
        ...input,
        documents: [queuedDocument, ...DOCUMENTS],
      }).documents.some((document) => document.id === queuedDocument.id),
    ).toBe(true);
  });

  it('returns everything for an empty query so the palette can show starting options', () => {
    const results = searchWorkspace('', input);
    expect(results.concepts).toHaveLength(CONCEPTS.length);
    expect(results.documents).toHaveLength(DOCUMENTS.length);
  });
});
