import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONNECTIONS, DOCUMENTS, INSIGHTS, WORKSPACES } from '../data/seed';
import type { KnowledgeState } from '../types';
import {
  isPersistedSnapshot,
  snapshotVersion,
  withoutRemoteSources,
  type PersistedSnapshot,
} from './persistence';

const state: KnowledgeState = {
  workspaces: WORKSPACES,
  activeWorkspaceId: WORKSPACES[0].id,
  documents: DOCUMENTS,
  concepts: CONCEPTS,
  connections: CONNECTIONS,
  insights: INSIGHTS,
};

const snapshot: PersistedSnapshot = {
  version: snapshotVersion,
  savedAt: '2026-11-16T10:00:00.000Z',
  state,
  dismissedIds: ['i-1'],
  savedConnectionIds: ['c-1'],
  prefs: {
    showLabels: true,
    highlightSuggested: true,
    reduceMotion: false,
    theme: 'dark',
  },
};

describe('isPersistedSnapshot', () => {
  it('accepts a complete versioned snapshot', () => {
    expect(isPersistedSnapshot(snapshot)).toBe(true);
  });

  it('rejects unknown versions and malformed state', () => {
    expect(isPersistedSnapshot({ ...snapshot, version: 2 })).toBe(false);
    expect(
      isPersistedSnapshot({
        ...snapshot,
        state: { ...snapshot.state, workspaces: [] },
      }),
    ).toBe(false);
    expect(
      isPersistedSnapshot({
        ...snapshot,
        state: { ...snapshot.state, concepts: [{ id: 1 }] },
      }),
    ).toBe(false);
  });

  it('rejects missing preference and collection fields', () => {
    expect(isPersistedSnapshot({ ...snapshot, dismissedIds: 'i-1' })).toBe(false);
    expect(
      isPersistedSnapshot({
        ...snapshot,
        prefs: { ...snapshot.prefs, theme: 'sepia' },
      }),
    ).toBe(false);
  });
});

describe('withoutRemoteSources', () => {
  it('keeps local sources but removes session-only remote documents', () => {
    const remote = {
      ...DOCUMENTS[0],
      id: 'remote-doc',
      remoteProjectId: 'remote-project',
      content: 'temporary backend text',
      fileKey: 'remote-file',
    };
    const local = { ...DOCUMENTS[1], id: 'local-doc', content: 'browser text' };
    const prepared = withoutRemoteSources({
      ...snapshot,
      state: {
        ...snapshot.state,
        workspaces: [
          { ...WORKSPACES[0], id: 'ws-test', documentIds: ['remote-doc', 'local-doc'] },
        ],
        documents: [remote, local],
      },
    });

    expect(prepared.state.documents).toHaveLength(1);
    expect(prepared.state.documents[0]?.id).toBe('local-doc');
    expect(prepared.state.documents[0]?.content).toBe('browser text');
    expect(prepared.state.workspaces[0]?.documentIds).toEqual(['local-doc']);
  });
});
