import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CLUSTERS,
  CONCEPTS,
  CONNECTIONS,
  DOCUMENTS,
  INSIGHTS,
  WORKSPACES,
} from '../data/seed';
import { cloneDemoSources } from '../data/clone';
import {
  deleteSourceFile,
  loadPersistedSnapshot,
  savePersistedSnapshot,
  saveSourceFile,
  snapshotVersion,
} from '../lib/persistence';
import {
  removeDocumentFromState,
  removeWorkspaceFromState,
  renameDocumentInState,
  renameWorkspaceInState,
} from '../lib/workspaceState';
import type {
  Cluster,
  ClusterId,
  Concept,
  Connection,
  DocumentKind,
  GraphPreferences,
  Insight,
  KnowledgeDocument,
  KnowledgeState,
  ProjectAnalysisStatus,
  Theme,
  Workspace,
} from '../types';
import { api, ApiError, backendConfig, subscribeToSessionChange } from '../services/api';
import { deleteRemoteProject, ensureRemoteProject } from '../services/remoteProjects';
import {
  clearRemoteSession,
  forgetRemoteDocument,
  getRemoteProject,
  getRemoteDocuments,
  hasRemoteSessionData,
  localProjectIdForRemoteProject,
  pruneRemoteSession,
  remoteProjectEntries,
  rememberRemoteDocuments,
  renameRemoteDocument,
} from '../services/remoteSession';
import { mergeRemoteGraph, removeRemoteSessionData } from '../lib/remoteGraph';

export interface NewWorkspaceInput {
  name: string;
  description: string;
  includeSamples: boolean;
}

export interface QueuedSourceInput {
  title: string;
  meta: string;
  words: number;
  kind?: DocumentKind;
  content?: string;
  file?: Blob;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

interface KnowledgeValue {
  workspaces: Workspace[];
  workspace: Workspace;
  switchWorkspace: (id: string) => void;
  createWorkspace: (input: NewWorkspaceInput) => string;
  updateWorkspace: (id: string, updates: { name: string; description: string }) => void;
  deleteWorkspace: (id: string) => Promise<boolean>;

  /** Sources for the active project only — never the whole app. */
  documents: KnowledgeDocument[];
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
  /** Clusters that actually appear in this project. */
  clusters: Cluster[];

  clusterById: Map<ClusterId, Cluster>;
  conceptById: Map<string, Concept>;
  documentById: Map<string, KnowledgeDocument>;

  activeInsights: Insight[];
  dismissedIds: string[];
  dismissInsight: (id: string) => void;
  restoreInsights: () => void;
  savedConnectionIds: string[];
  toggleSavedConnection: (id: string) => void;
  prefs: GraphPreferences;
  setPref: <K extends keyof GraphPreferences>(key: K, value: GraphPreferences[K]) => void;

  conceptsForDocument: (documentId: string) => Concept[];
  connectionsForDocument: (documentId: string) => Connection[];
  connectionsForConcept: (conceptId: string) => Connection[];
  documentsForConcept: (conceptId: string) => KnowledgeDocument[];

  hasDemoSources: boolean;
  importDemoSources: () => boolean;
  addQueuedSources: (sources: QueuedSourceInput[]) => Promise<void>;
  loadRemoteDocumentContent: (id: string) => Promise<void>;
  renameDocument: (id: string, title: string) => void;
  deleteDocument: (id: string) => Promise<boolean>;

  analysisStatus: ProjectAnalysisStatus | null;
  analysisError: string | null;
  analysisBusy: boolean;
  startAnalysis: () => Promise<void>;
  refreshAnalysis: () => Promise<void>;

  storageError: string | null;
  dismissStorageError: () => void;
}

const KnowledgeContext = createContext<KnowledgeValue | null>(null);

const THEME_STORAGE_KEY = 'matrixiq-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

const INITIAL_PREFS: GraphPreferences = {
  showLabels: true,
  highlightSuggested: true,
  reduceMotion: false,
  theme: readStoredTheme(),
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function createSeedState(): KnowledgeState {
  return {
    workspaces: WORKSPACES,
    activeWorkspaceId: WORKSPACES[0].id,
    documents: DOCUMENTS,
    concepts: CONCEPTS,
    connections: CONNECTIONS,
    insights: INSIGHTS,
  };
}

function mergeRemoteDocuments(
  state: KnowledgeState,
  remoteDocuments: KnowledgeDocument[],
): KnowledgeState {
  if (remoteDocuments.length === 0) return state;

  const byWorkspace = new Map<string, KnowledgeDocument[]>();
  const mappedDocuments: KnowledgeDocument[] = [];
  for (const document of remoteDocuments) {
    if (!document.remoteProjectId) continue;
    const workspaceId = localProjectIdForRemoteProject(document.remoteProjectId);
    if (!workspaceId || !state.workspaces.some((workspace) => workspace.id === workspaceId)) {
      continue;
    }
    mappedDocuments.push(document);
    byWorkspace.set(workspaceId, [...(byWorkspace.get(workspaceId) ?? []), document]);
  }
  if (byWorkspace.size === 0) return state;

  const remoteIds = new Set(mappedDocuments.map((document) => document.id));

  return {
    ...state,
    documents: [
      ...mappedDocuments,
      ...state.documents.filter((document) => !remoteIds.has(document.id)),
    ],
    workspaces: state.workspaces.map((workspace) => {
      const documents = byWorkspace.get(workspace.id);
      if (!documents) return workspace;
      const documentIds = documents.map((document) => document.id);
      return {
        ...workspace,
        documentIds: [
          ...new Set([
            ...documentIds,
            ...workspace.documentIds.filter((id) => !remoteIds.has(id)),
          ]),
        ],
      };
    }),
  };
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KnowledgeState>(createSeedState);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [savedConnectionIds, setSavedConnectionIds] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<GraphPreferences>(INITIAL_PREFS);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<ProjectAnalysisStatus | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const analysisRunToken = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const snapshot = await loadPersistedSnapshot();
        if (cancelled) return;

        let nextState = createSeedState();
        if (snapshot) {
          const activeWorkspaceId = snapshot.state.workspaces.some(
            (workspace) => workspace.id === snapshot.state.activeWorkspaceId,
          )
            ? snapshot.state.activeWorkspaceId
            : snapshot.state.workspaces[0].id;
          nextState = { ...snapshot.state, activeWorkspaceId };
          setDismissedIds(snapshot.dismissedIds);
          setSavedConnectionIds(snapshot.savedConnectionIds);
          setPrefs({ ...snapshot.prefs, theme: readStoredTheme() });
        }

        if (backendConfig.configured) {
          if (hasRemoteSessionData()) {
            try {
              const remoteProjects = await api.projects.list();
              if (cancelled) return;
              pruneRemoteSession(new Set(remoteProjects.map((project) => project.id)));
            } catch {
              if (cancelled) return;
              clearRemoteSession();
            }
          }
          nextState = mergeRemoteDocuments(nextState, getRemoteDocuments());

          const entries = remoteProjectEntries();
          const graphs = await Promise.all(
            entries.map(async (entry) => {
              try {
                const [graph, insights] = await Promise.all([
                  api.projects.graph(entry.remoteProjectId),
                  api.projects.insights(entry.remoteProjectId),
                ]);
                return {
                  entry,
                  graph: { ...graph, insights: insights.insights },
                };
              } catch {
                return null;
              }
            }),
          );
          if (cancelled) return;
          for (const item of graphs) {
            if (!item) continue;
            if (getRemoteProject(item.entry.localProjectId) !== item.entry.remoteProjectId) {
              continue;
            }
            nextState = mergeRemoteGraph(
              nextState,
              item.entry.remoteProjectId,
              item.graph,
            );
          }
          if (!hasRemoteSessionData()) {
            nextState = removeRemoteSessionData(nextState);
          }
        } else {
          clearRemoteSession();
        }

        if (!cancelled) setState(nextState);
      } catch {
        if (!cancelled) {
          setStorageError('Saved work could not be loaded. This session is using the demo data.');
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeToSessionChange(() => {
      clearRemoteSession();
      setState((current) => removeRemoteSessionData(current));
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.style.colorScheme = prefs.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', prefs.theme === 'dark' ? '#0b1220' : '#f6f7f9');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, prefs.theme);
    } catch {
      // Private browsing can block storage; the theme still applies for this visit.
    }
  }, [prefs.theme]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void savePersistedSnapshot({
        version: snapshotVersion,
        savedAt: new Date().toISOString(),
        state,
        dismissedIds,
        savedConnectionIds,
        prefs,
      }).catch(() => {
        setStorageError(
          'Changes could not be saved to this browser. They remain available for this session.',
        );
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [ready, state, dismissedIds, savedConnectionIds, prefs]);

  const workspace = useMemo(
    () =>
      state.workspaces.find((item) => item.id === state.activeWorkspaceId) ??
      state.workspaces[0],
    [state.workspaces, state.activeWorkspaceId],
  );

  const documents = useMemo(() => {
    const ids = new Set(workspace.documentIds);
    return state.documents.filter((document) => ids.has(document.id));
  }, [state.documents, workspace.documentIds]);

  const documentIdSet = useMemo(
    () => new Set(documents.map((document) => document.id)),
    [documents],
  );

  const concepts = useMemo(
    () =>
      state.concepts.filter((concept) =>
        concept.documentIds.some((documentId) => documentIdSet.has(documentId)),
      ),
    [state.concepts, documentIdSet],
  );

  const conceptIdSet = useMemo(() => new Set(concepts.map((concept) => concept.id)), [concepts]);

  const connections = useMemo(
    () =>
      state.connections.filter(
        (connection) => conceptIdSet.has(connection.from) && conceptIdSet.has(connection.to),
      ),
    [state.connections, conceptIdSet],
  );

  const insights = useMemo(
    () =>
      state.insights.filter((insight) =>
        insight.conceptIds.some((conceptId) => conceptIdSet.has(conceptId)),
      ),
    [state.insights, conceptIdSet],
  );

  const clusters = useMemo(
    () => CLUSTERS.filter((cluster) => concepts.some((concept) => concept.clusterId === cluster.id)),
    [concepts],
  );

  const clusterById = useMemo(() => new Map(CLUSTERS.map((cluster) => [cluster.id, cluster])), []);
  const conceptById = useMemo(() => new Map(concepts.map((concept) => [concept.id, concept])), [concepts]);
  const documentById = useMemo(
    () => new Map(documents.map((document) => [document.id, document])),
    [documents],
  );

  const loadRemoteGraph = useCallback(
    async (localProjectId: string, remoteProjectId: string) => {
      if (getRemoteProject(localProjectId) !== remoteProjectId) return;
      try {
        const [graph, insights] = await Promise.all([
          api.projects.graph(remoteProjectId),
          api.projects.insights(remoteProjectId),
        ]);
        if (getRemoteProject(localProjectId) !== remoteProjectId) return;
        setState((current) =>
          mergeRemoteGraph(current, remoteProjectId, { ...graph, insights: insights.insights }),
        );
      } catch {
        // Source metadata remains visible if the temporary session disappeared.
      }
    },
    [],
  );

  const refreshAnalysis = useCallback(async () => {
    if (!backendConfig.configured) return;
    const remoteProjectId = getRemoteProject(workspace.id);
    if (!remoteProjectId) {
      setAnalysisStatus(null);
      return;
    }

    try {
      const status = await api.analysis.status(remoteProjectId);
      setAnalysisStatus(status);
      setAnalysisError(status.status === 'failed' ? (status.error ?? null) : null);
      if (status.status === 'complete') {
        await loadRemoteGraph(workspace.id, remoteProjectId);
      }
    } catch (cause) {
      setAnalysisError(
        cause instanceof ApiError
          ? cause.message
          : 'The analysis status could not be loaded.',
      );
    }
  }, [loadRemoteGraph, workspace.id]);

  const pollAnalysis = useCallback(
    async (remoteProjectId: string, localProjectId: string, token: number) => {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        if (analysisRunToken.current !== token) return;

        let status: ProjectAnalysisStatus;
        try {
          status = await api.analysis.status(remoteProjectId);
        } catch (cause) {
          if (analysisRunToken.current !== token) return;
          setAnalysisError(
            cause instanceof ApiError
              ? cause.message
              : 'The analysis status could not be loaded.',
          );
          return;
        }
        if (analysisRunToken.current !== token) return;

        setAnalysisStatus(status);
        if (status.status === 'complete') {
          setAnalysisError(null);
          await loadRemoteGraph(localProjectId, remoteProjectId);
          return;
        }
        if (status.status === 'failed' || status.status === 'stale' || status.status === 'idle') {
          setAnalysisError(status.error ?? null);
          return;
        }
      }

      if (analysisRunToken.current === token) {
        setAnalysisError('Analysis is still running. Refresh in a moment to see the result.');
      }
    },
    [loadRemoteGraph],
  );

  const startAnalysis = useCallback(async () => {
    if (!backendConfig.configured) {
      setAnalysisError('Cross-document analysis requires the backend in remote mode.');
      return;
    }
    if (analysisBusy || analysisStatus?.status === 'running') return;
    if (documents.length === 0) {
      setAnalysisError('Add at least one source before running analysis.');
      return;
    }

    setAnalysisBusy(true);
    setAnalysisError(null);
    const token = analysisRunToken.current + 1;
    analysisRunToken.current = token;

    try {
      const remoteProjectId = await ensureRemoteProject(workspace);
      const status = await api.analysis.start(remoteProjectId);
      if (analysisRunToken.current !== token) return;
      setAnalysisStatus(status);
      if (status.status === 'running') {
        void pollAnalysis(remoteProjectId, workspace.id, token);
      }
    } catch (cause) {
      if (analysisRunToken.current === token) {
        setAnalysisError(
          cause instanceof ApiError ? cause.message : 'The analysis could not be started.',
        );
      }
    } finally {
      setAnalysisBusy(false);
    }
  }, [analysisBusy, analysisStatus?.status, documents.length, pollAnalysis, workspace]);

  const documentIdsKey = workspace.documentIds.join('|');

  useEffect(() => {
    analysisRunToken.current += 1;
    const token = analysisRunToken.current;
    setAnalysisBusy(false);
    setAnalysisError(null);
    setAnalysisStatus(null);

    if (!backendConfig.configured) return;
    const remoteProjectId = getRemoteProject(workspace.id);
    if (!remoteProjectId) return;

    let cancelled = false;
    void api.analysis
      .status(remoteProjectId)
      .then((status) => {
        if (cancelled) return;
        setAnalysisStatus(status);
        setAnalysisError(status.status === 'failed' ? (status.error ?? null) : null);
        if (status.status === 'complete') {
          void loadRemoteGraph(workspace.id, remoteProjectId);
        } else if (status.status === 'running') {
          void pollAnalysis(remoteProjectId, workspace.id, token);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setAnalysisError(
            cause instanceof ApiError
              ? cause.message
              : 'The analysis status could not be loaded.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentIdsKey, loadRemoteGraph, pollAnalysis, workspace.id]);

  const switchWorkspace = useCallback((id: string) => {
    setState((current) =>
      current.workspaces.some((item) => item.id === id)
        ? { ...current, activeWorkspaceId: id }
        : current,
    );
  }, []);

  const createWorkspace = useCallback(({ name, description, includeSamples }: NewWorkspaceInput) => {
    const id = `ws-${Date.now().toString(36)}`;
    const clone = includeSamples ? cloneDemoSources(id) : null;
    const newWorkspace: Workspace = {
      id,
      name: name.trim(),
      description: description.trim() || 'A new project with its own sources.',
      color: '#2563eb',
      createdAt: today(),
      documentIds: clone?.documentIds ?? [],
    };
    setState((current) => ({
      ...current,
      activeWorkspaceId: id,
      workspaces: [...current.workspaces, newWorkspace],
      documents: [...current.documents, ...(clone?.documents ?? [])],
      concepts: [...current.concepts, ...(clone?.concepts ?? [])],
      connections: [...current.connections, ...(clone?.connections ?? [])],
      insights: [...current.insights, ...(clone?.insights ?? [])],
    }));

    return id;
  }, []);

  const updateWorkspace = useCallback(
    (id: string, updates: { name: string; description: string }) => {
      setState((current) => renameWorkspaceInState(current, id, updates));
    },
    [],
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<boolean> => {
      const target = state.workspaces.find((item) => item.id === id);
      if (!target || state.workspaces.length <= 1) return false;

      const next = removeWorkspaceFromState(state, id);
      setState(next);
      setDismissedIds((current) =>
        current.filter((insightId) => next.insights.some((insight) => insight.id === insightId)),
      );
      setSavedConnectionIds((current) =>
        current.filter((edgeId) => next.connections.some((edge) => edge.id === edgeId)),
      );
      for (const documentId of target.documentIds) {
        const document = state.documents.find((item) => item.id === documentId);
        if (document?.remoteProjectId) forgetRemoteDocument(documentId);
      }
      await Promise.all(target.documentIds.map((documentId) => deleteSourceFile(documentId)));
      if (backendConfig.configured) {
        try {
          await deleteRemoteProject(id);
        } catch {
          setStorageError(
            'The project was removed here, but its temporary backend copy could not be removed. It will expire with the server session.',
          );
        }
      }
      return true;
    },
    [state],
  );

  const hasDemoSources = documents.some((document) => Boolean(document.originKey));

  const importDemoSources = useCallback((): boolean => {
    if (hasDemoSources) return false;
    const clone = cloneDemoSources(workspace.id);

    setState((current) => ({
      ...current,
      documents: [...current.documents, ...clone.documents],
      concepts: [...current.concepts, ...clone.concepts],
      connections: [...current.connections, ...clone.connections],
      insights: [...current.insights, ...clone.insights],
      workspaces: current.workspaces.map((item) =>
        item.id === workspace.id
          ? { ...item, documentIds: [...clone.documentIds, ...item.documentIds] }
          : item,
      ),
    }));

    return true;
  }, [hasDemoSources, workspace.id]);

  const addQueuedSources = useCallback(
    async (sources: QueuedSourceInput[]) => {
      if (sources.length === 0) return;

      if (backendConfig.configured) {
        const remoteProjectId = await ensureRemoteProject(workspace);
        const uploaded = await Promise.all(
          sources.map((source) =>
            api.sources.upload(remoteProjectId, {
              file: source.file,
              fileName: source.fileName,
              content: source.file ? undefined : source.content,
              title: source.title,
            }),
          ),
        );
        const remoteDocuments: KnowledgeDocument[] = uploaded.map((document) => ({
          ...document,
          remoteProjectId,
          status: document.status === 'queued' ? 'queued' : 'extracted',
        }));
        rememberRemoteDocuments(remoteProjectId, remoteDocuments);

        setState((current) => ({
          ...current,
          documents: [...remoteDocuments, ...current.documents],
          workspaces: current.workspaces.map((item) =>
            item.id === workspace.id
              ? {
                  ...item,
                  documentIds: [
                    ...remoteDocuments.map((document) => document.id),
                    ...item.documentIds,
                  ],
                }
              : item,
          ),
        }));
        return;
      }

      const stamp = Date.now();
      const queued: KnowledgeDocument[] = sources.map((source, index) => ({
        id: `doc-${stamp}-${index}`,
        title: source.title,
        subtitle: 'Waiting for analysis',
        kind: source.kind ?? 'pdf',
        source: source.meta,
        addedAt: today(),
        words: source.words,
        excerpt: source.content?.slice(0, 280) ?? '',
        summary:
          'This source is stored in this project. Local mode does not run AI analysis; connect the backend and use remote mode to analyse it.',
        content: source.content,
        fileName: source.fileName,
        mimeType: source.mimeType,
        fileSize: source.fileSize,
        conceptIds: [],
        status: 'queued',
      }));

      const persisted = await Promise.all(
        queued.map(async (document, index) => {
          const file = sources[index].file;
          if (!file) return document;
          try {
            await saveSourceFile(document.id, file);
            return { ...document, fileKey: document.id };
          } catch {
            setStorageError(
              'A source was added, but its original file could not be stored in this browser.',
            );
            return document;
          }
        }),
      );

      setState((current) => ({
        ...current,
        documents: [...persisted, ...current.documents],
        workspaces: current.workspaces.map((item) =>
          item.id === workspace.id
            ? { ...item, documentIds: [...persisted.map((document) => document.id), ...item.documentIds] }
            : item,
        ),
      }));
    },
    [workspace],
  );

  const renameDocument = useCallback((id: string, title: string) => {
    renameRemoteDocument(id, title);
    setState((current) => renameDocumentInState(current, id, title));
  }, []);

  const loadRemoteDocumentContent = useCallback(
    async (id: string) => {
      const document = state.documents.find((item) => item.id === id);
      if (!document?.remoteProjectId || document.content || !backendConfig.configured) return;
      const remoteProjectId = document.remoteProjectId;

      try {
        const remote = await api.sources.get(remoteProjectId, id);
        if (remote.content === undefined) return;
        setState((current) => ({
          ...current,
          documents: current.documents.map((item) =>
            item.id === id
              ? {
                  ...item,
                  content: remote.content,
                  excerpt: remote.excerpt,
                  summary: remote.summary,
                  words: remote.words,
                  pages: remote.pages,
                  status: remote.status === 'queued' ? 'queued' : 'extracted',
                }
              : item,
          ),
        }));
      } catch {
        // Keep the session-scoped metadata visible if the temporary backend session expired.
      }
    },
    [state.documents],
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      const document = state.documents.find((item) => item.id === id);
      if (!document) return false;
      if (document.remoteProjectId && backendConfig.configured) {
        try {
          await api.sources.remove(document.remoteProjectId, id);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
      }
      if (document.remoteProjectId) forgetRemoteDocument(id);
      const next = removeDocumentFromState(state, id);
      setState(next);
      setDismissedIds((current) =>
        current.filter((insightId) => next.insights.some((insight) => insight.id === insightId)),
      );
      setSavedConnectionIds((current) =>
        current.filter((edgeId) => next.connections.some((edge) => edge.id === edgeId)),
      );
      await deleteSourceFile(id);
      return true;
    },
    [state],
  );

  const dismissInsight = useCallback((id: string) => {
    setDismissedIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const restoreInsights = useCallback(() => setDismissedIds([]), []);

  const toggleSavedConnection = useCallback((id: string) => {
    setSavedConnectionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const setPref = useCallback(
    <K extends keyof GraphPreferences>(key: K, value: GraphPreferences[K]) => {
      setPrefs((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const connectionsForConcept = useCallback(
    (conceptId: string) =>
      connections.filter((edge) => edge.from === conceptId || edge.to === conceptId),
    [connections],
  );

  const conceptsForDocument = useCallback(
    (documentId: string) => concepts.filter((concept) => concept.documentIds.includes(documentId)),
    [concepts],
  );

  const connectionsForDocument = useCallback(
    (documentId: string) => {
      const ids = new Set(
        concepts
          .filter((concept) => concept.documentIds.includes(documentId))
          .map((concept) => concept.id),
      );
      return connections.filter((edge) => ids.has(edge.from) || ids.has(edge.to));
    },
    [concepts, connections],
  );

  const documentsForConcept = useCallback(
    (conceptId: string) => {
      const concept = conceptById.get(conceptId);
      if (!concept) return [];
      return concept.documentIds
        .map((id) => documentById.get(id))
        .filter((document): document is KnowledgeDocument => Boolean(document));
    },
    [conceptById, documentById],
  );

  const activeInsights = useMemo(
    () => insights.filter((insight) => !dismissedIds.includes(insight.id)),
    [insights, dismissedIds],
  );

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  const value: KnowledgeValue = {
    workspaces: state.workspaces,
    workspace,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    documents,
    concepts,
    connections,
    insights,
    clusters,
    clusterById,
    conceptById,
    documentById,
    activeInsights,
    dismissedIds,
    dismissInsight,
    restoreInsights,
    savedConnectionIds,
    toggleSavedConnection,
    prefs,
    setPref,
    conceptsForDocument,
    connectionsForDocument,
    connectionsForConcept,
    documentsForConcept,
    hasDemoSources,
    importDemoSources,
    addQueuedSources,
    loadRemoteDocumentContent,
    renameDocument,
    deleteDocument,
    analysisStatus,
    analysisError,
    analysisBusy,
    startAnalysis,
    refreshAnalysis,
    storageError,
    dismissStorageError,
  };

  if (!ready) {
    return (
      <div className="boot" role="status">
        <span className="boot__mark" aria-hidden="true" />
        <span className="boot__text">Opening your workspace…</span>
      </div>
    );
  }

  return (
    <KnowledgeContext.Provider value={value}>
      {storageError ? (
        <div className="storage-alert" role="alert">
          <span>{storageError}</span>
          <button
            type="button"
            className="storage-alert__close"
            onClick={dismissStorageError}
            aria-label="Dismiss storage warning"
          >
            ×
          </button>
        </div>
      ) : null}
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge(): KnowledgeValue {
  const context = useContext(KnowledgeContext);
  if (!context) {
    throw new Error('useKnowledge must be used inside a KnowledgeProvider');
  }
  return context;
}
