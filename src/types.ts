/* Domain types for the MatrixIQ knowledge graph. */

export type ClusterId =
  | 'colonies'
  | 'consensus'
  | 'fermentation'
  | 'resilience'
  | 'sleep'
  | 'traffic';

/**
 * Relationship categories shown to the user. Everything except `related` and
 * `similar` is directional: "A causes B" does not imply "B causes A".
 */
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

export type DocumentStatus = 'extracted' | 'queued';

export type EvidenceLevel = 'direct' | 'inference' | 'speculative';

export interface EvidenceReference {
  documentId: string;
  excerpt: string;
  note?: string;
}

export type ProjectAnalysisRunStatus = 'idle' | 'running' | 'complete' | 'failed' | 'stale';

export interface ProjectAnalysisStatus {
  projectId: string;
  status: ProjectAnalysisRunStatus;
  documentCount: number;
  conceptCount: number;
  connectionCount: number;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  error?: string;
  model?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  /** Documents belonging to this project. Nothing is shared across projects. */
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
  label: string;
  clusterId: ClusterId;
  definition: string;
  /** Documents this concept was extracted from. */
  documentIds: string[];
  /** How often the concept appears across the corpus. */
  mentions: number;
  /** Supporting passages for AI-extracted concepts. */
  evidence?: EvidenceReference[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  subtitle: string;
  kind: DocumentKind;
  /** Absent for sources that have not been through extraction yet. */
  clusterId?: ClusterId;
  source: string;
  addedAt: string;
  words: number;
  pages?: number;
  entries?: number;
  excerpt: string;
  summary: string;
  conceptIds: string[];
  /** Full pasted or text-file content, retained locally until analysis runs. */
  content?: string;
  /** Key used to retrieve the original uploaded file from IndexedDB. */
  fileKey?: string;
  /** Backend project that temporarily holds this source in remote mode. */
  remoteProjectId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  /** Identifies the bundled demo documents so a project can avoid duplicates. */
  originKey?: string;
  status?: DocumentStatus;
}

export interface KnowledgeState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  documents: KnowledgeDocument[];
  concepts: Concept[];
  connections: Connection[];
  insights: Insight[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  /** 0–1 semantic strength of the relationship. */
  strength: number;
  confidence: number;
  title: string;
  /** Why this connection exists, in plain language. */
  explanation: string;
  /** True when the link crosses two clusters. */
  isBridge: boolean;
  /** Surfaced by the discovery engine but not yet confirmed by the user. */
  suggested?: boolean;
  evidenceLevel?: EvidenceLevel;
  evidence?: EvidenceReference[];
}

export type InsightKind = 'bridge' | 'gap' | 'tension' | 'pattern';

export type Theme = 'light' | 'dark';

export interface Insight {
  id: string;
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
  /** App-wide appearance preference, persisted in localStorage. */
  theme: Theme;
}

export interface PositionedConcept extends Concept {
  x: number;
  y: number;
  r: number;
}
