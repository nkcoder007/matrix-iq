/* Server-side domain types mirroring the frontend contract in
   /src/types.ts. Session-scoped variants are added where needed. */

export type ClusterId =
  | 'colonies'
  | 'consensus'
  | 'fermentation'
  | 'resilience'
  | 'sleep'
  | 'traffic';

export type RelationType =
  | 'related'
  | 'causes'
  | 'leads'
  | 'partOf'
  | 'similar'
  | 'opposes'
  | 'depends'
  | 'influences';

export type DocumentKind = 'pdf' | 'markdown' | 'notes' | 'web';

export type DocumentStatus = 'queued' | 'extracted' | 'failed';

export type AnalysisStatus = 'queued' | 'running' | 'complete' | 'failed';

export type ProjectAnalysisStatus = 'idle' | 'running' | 'complete' | 'failed' | 'stale';

export type EvidenceLevel = 'direct' | 'inference' | 'speculative';

export interface EvidenceReference {
  documentId: string;
  excerpt: string;
  note?: string;
}

export type InsightKind = 'bridge' | 'gap' | 'tension' | 'pattern';

export interface Workspace {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  documentIds: string[];
}

export interface Cluster {
  id: ClusterId;
  label: string;
  short: string;
  color: string;
  description: string;
}

export interface Concept {
  id: string;
  sessionId: string;
  label: string;
  clusterId: ClusterId;
  definition: string;
  documentIds: string[];
  mentions: number;
  /** Supporting passages from the source documents. */
  evidence?: EvidenceReference[];
}

export interface KnowledgeDocument {
  id: string;
  sessionId: string;
  workspaceId: string;
  title: string;
  subtitle: string;
  kind: DocumentKind;
  clusterId?: ClusterId;
  source: string;
  addedAt: string;
  words: number;
  pages?: number;
  entries?: number;
  excerpt: string;
  summary: string;
  conceptIds: string[];
  content?: string;
  fileKey?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  originKey?: string;
  status?: DocumentStatus;
}

export interface Connection {
  id: string;
  sessionId: string;
  from: string;
  to: string;
  type: RelationType;
  strength: number;
  confidence: number;
  title: string;
  explanation: string;
  isBridge: boolean;
  suggested?: boolean;
  evidenceLevel?: EvidenceLevel;
  evidence?: EvidenceReference[];
}

export type Theme = 'light' | 'dark';

export interface Insight {
  id: string;
  sessionId: string;
  kind: InsightKind;
  title: string;
  summary: string;
  rationale: string;
  conceptIds: string[];
  confidence: number;
  edgeId?: string;
  createdAt: string;
}

export interface GraphPreferences {
  showLabels: boolean;
  highlightSuggested: boolean;
  reduceMotion: boolean;
  theme: Theme;
}

export interface PositionedConcept extends Concept {
  x: number;
  y: number;
  r: number;
}

/* Session-scoped state held in server memory */

export interface SessionData {
  sessionId: string;
  createdAt: number;
  lastAccessed: number;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  documents: KnowledgeDocument[];
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
  dismissedIds: string[];
  savedConnectionIds: string[];
  prefs: GraphPreferences;
  /* Temporary in-memory file buffers keyed by document id */
  fileBuffers: Map<string, { buffer: Buffer; fileName: string; mimeType: string }>;
  /* Analysis status per document */
  analysisStatus: Map<string, { status: AnalysisStatus; error?: string; updatedAt: string }>;
  /* One project-level analysis job/result per workspace. */
  projectAnalysis: Map<string, ProjectAnalysisRecord>;
}

export interface ProjectAnalysisRecord {
  status: ProjectAnalysisStatus;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  error?: string;
  documentIds: string[];
  conceptCount: number;
  connectionCount: number;
  model?: string;
}

export interface SessionStore {
  get(sessionId: string): SessionData | undefined;
  create(sessionId: string): SessionData;
  touch(sessionId: string): void;
  destroy(sessionId: string): void;
  sweep(maxAgeMs: number): number;
  size(): number;
  stopSweep(): void;
}

/* API response shapes matching src/services/api.ts */

export interface GraphResponse {
  concepts: Concept[];
  connections: Connection[];
}

export interface InsightsResponse {
  insights: Insight[];
}

export interface SourceAnalysis {
  sourceId: string;
  status: AnalysisStatus;
  error?: string;
  updatedAt: string;
}

export interface ProjectAnalysisStatusResponse {
  projectId: string;
  status: ProjectAnalysisStatus;
  documentCount: number;
  conceptCount: number;
  connectionCount: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  error?: string;
  model?: string;
}

export interface ProjectInput {
  name: string;
  description: string;
}

export interface SourceUploadInput {
  file?: Buffer;
  fileName?: string;
  mimeType?: string;
  content?: string;
  title?: string;
}
