import { describe, expect, it } from 'vitest';
import { CONCEPTS, CONNECTIONS, DOCUMENTS, INSIGHTS, WORKSPACES } from '../data/seed';
import type { KnowledgeState } from '../types';
import {
  isPersistedSnapshot,
  snapshotVersion,
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
