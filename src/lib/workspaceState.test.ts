import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONNECTIONS, DOCUMENTS, INSIGHTS, WORKSPACES } from '../data/seed';
import type { KnowledgeState } from '../types';
import {
  removeDocumentFromState,
  removeWorkspaceFromState,
  renameDocumentInState,
  renameWorkspaceInState,
} from './workspaceState';

function seededState(): KnowledgeState {
  return {
    workspaces: WORKSPACES,
    activeWorkspaceId: WORKSPACES[0].id,
    documents: DOCUMENTS,
    concepts: CONCEPTS,
    connections: CONNECTIONS,
    insights: INSIGHTS,
  };
}

function expectNoDanglingReferences(state: KnowledgeState) {
  const conceptIds = new Set(state.concepts.map((concept) => concept.id));
  expect(state.connections.every((edge) => conceptIds.has(edge.from) && conceptIds.has(edge.to))).toBe(
    true,
  );
  expect(
    state.insights.every((insight) =>
      insight.conceptIds.every((conceptId) => conceptIds.has(conceptId)),
    ),
  ).toBe(true);
  expect(state.concepts.every((concept) => concept.documentIds.length > 0)).toBe(true);
  const documentIds = new Set(state.documents.map((document) => document.id));
  expect(state.concepts.every((concept) => concept.documentIds.every((id) => documentIds.has(id)))).toBe(
    true,
  );
}

describe('removeDocumentFromState', () => {
  it('removes a source, its exclusive concepts and every dangling record', () => {
    const next = removeDocumentFromState(seededState(), 'doc-bees');

    expect(next.documents.some((document) => document.id === 'doc-bees')).toBe(false);
    expect(next.concepts.some((concept) => concept.id === 'scout-recruitment')).toBe(false);
    expect(
      next.concepts.find((concept) => concept.id === 'colony-thermoregulation')?.documentIds,
    ).toEqual(['doc-systems']);
    expectNoDanglingReferences(next);
  });

  it('leaves unrelated projects and their findings intact', () => {
    const next = removeDocumentFromState(seededState(), 'doc-bees');
    expect(next.documents.some((document) => document.id === 'doc-sleep')).toBe(true);
    expect(next.workspaces.find((workspace) => workspace.id === 'ws-bookclub')?.documentIds).toEqual([
      'doc-sleep',
      'doc-traffic',
    ]);
  });
});

describe('removeWorkspaceFromState', () => {
  it('cascades project sources and selects a surviving project', () => {
    const next = removeWorkspaceFromState(seededState(), 'ws-bookclub');

    expect(next.workspaces.map((workspace) => workspace.id)).toEqual(['ws-atlas']);
    expect(next.activeWorkspaceId).toBe('ws-atlas');
    expect(next.documents.some((document) => document.id === 'doc-sleep')).toBe(false);
    expect(next.documents.some((document) => document.id === 'doc-bees')).toBe(true);
    expectNoDanglingReferences(next);
  });

  it('cascades the chosen project when another project remains', () => {
    const next = removeWorkspaceFromState(seededState(), 'ws-atlas');
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].id).toBe('ws-bookclub');
  });

  it('refuses to delete the only project by returning the unchanged state', () => {
    const state = seededState();
    const single = {
      ...state,
      workspaces: [state.workspaces[0]],
      activeWorkspaceId: state.workspaces[0].id,
    };
    expect(removeWorkspaceFromState(single, state.workspaces[0].id)).toBe(single);
  });
});

describe('rename helpers', () => {
  it('trims names and keeps the existing description when blank', () => {
    const next = renameWorkspaceInState(seededState(), 'ws-atlas', {
      name: '  Field Notes  ',
      description: '   ',
    });
    const workspace = next.workspaces.find((item) => item.id === 'ws-atlas');
    expect(workspace?.name).toBe('Field Notes');
    expect(workspace?.description).toBe(
      'Bees, computer science and one very old sourdough starter.',
    );
  });

  it('does not rename a source to an empty title', () => {
    const state = seededState();
    const next = renameDocumentInState(state, 'doc-bees', '   ');
    expect(next).toBe(state);
  });
});
