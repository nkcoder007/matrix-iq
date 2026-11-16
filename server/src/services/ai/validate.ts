import { createHash } from 'node:crypto';
import type {
  ClusterId,
  Concept,
  Connection,
  EvidenceLevel,
  EvidenceReference,
  Insight,
  InsightKind,
  RelationType,
} from '../../types';
import type { AiDocument } from './types';

export const CLUSTER_IDS: ClusterId[] = [
  'colonies',
  'consensus',
  'fermentation',
  'resilience',
  'sleep',
  'traffic',
];

export const RELATION_IDS: RelationType[] = [
  'related',
  'causes',
  'leads',
  'partOf',
  'similar',
  'opposes',
  'depends',
  'influences',
];

export const EVIDENCE_LEVEL_IDS: EvidenceLevel[] = ['direct', 'inference', 'speculative'];

export const INSIGHT_KINDS: InsightKind[] = ['bridge', 'pattern', 'tension', 'gap'];

export type GeneratedConcept = Omit<Concept, 'sessionId'>;
export type GeneratedConnection = Omit<Connection, 'sessionId'>;
export type GeneratedInsight = Omit<Insight, 'sessionId' | 'createdAt'>;

export interface ValidatedAnalysis {
  concepts: GeneratedConcept[];
  connections: GeneratedConnection[];
  insights: GeneratedInsight[];
}

export class AnalysisValidationError extends Error {
  readonly status = 502;

  constructor(message: string) {
    super(message);
    this.name = 'AnalysisValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new AnalysisValidationError(`The AI response is missing the "${field}" list.`);
  }
  if (value.length > max) {
    throw new AnalysisValidationError(`The AI returned too many ${field}.`);
  }
  return value;
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw new AnalysisValidationError(`The AI returned an invalid ${field}.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new AnalysisValidationError(`The AI returned an invalid ${field}.`);
  }
  return trimmed;
}

function optionalText(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return text(value, field, 1, max);
}

function score(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new AnalysisValidationError(`The AI returned an invalid ${field}.`);
  }
  return value;
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

function normalizeLabel(value: string): string {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function stableId(prefix: string, projectId: string, key: string): string {
  const digest = createHash('sha1').update(`${projectId}:${key}`).digest('hex').slice(0, 12);
  return `${prefix}-${digest}`;
}

function uniqueEvidence(evidence: EvidenceReference[]): EvidenceReference[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.documentId}\u0000${normalizeText(item.excerpt)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readEvidence(
  raw: unknown,
  field: string,
  documentMap: Map<string, AiDocument>,
): EvidenceReference[] {
  const items = asArray(raw, field, 8);
  if (items.length === 0) {
    throw new AnalysisValidationError(`The AI returned ${field} without any supporting evidence.`);
  }

  const evidence: EvidenceReference[] = [];
  for (const item of items) {
    if (!isRecord(item)) {
      throw new AnalysisValidationError(`The AI returned malformed evidence for ${field}.`);
    }
    const documentId = text(item.documentId, 'evidence document ID', 1, 200);
    const document = documentMap.get(documentId);
    if (!document) {
      throw new AnalysisValidationError(
        'The AI referenced a document that is not part of this project.',
      );
    }

    let excerpt = text(item.excerpt, 'evidence excerpt', 3, 600);
    if (
      (excerpt.startsWith('"') && excerpt.endsWith('"')) ||
      (excerpt.startsWith('“') && excerpt.endsWith('”'))
    ) {
      excerpt = excerpt.slice(1, -1).trim();
    }
    if (!normalizeText(document.text).includes(normalizeText(excerpt))) {
      throw new AnalysisValidationError(
        'The AI returned an evidence excerpt that was not found in its source document.',
      );
    }

    const note = optionalText(item.note, 'evidence note', 240);
    evidence.push({
      documentId,
      excerpt,
      ...(note ? { note } : {}),
    });
  }

  return uniqueEvidence(evidence);
}

function readClusterId(value: unknown): ClusterId {
  if (typeof value !== 'string' || !CLUSTER_IDS.includes(value as ClusterId)) {
    throw new AnalysisValidationError('The AI returned an unsupported topic.');
  }
  return value as ClusterId;
}

function readLevel(value: unknown): EvidenceLevel {
  if (typeof value !== 'string' || !EVIDENCE_LEVEL_IDS.includes(value as EvidenceLevel)) {
    throw new AnalysisValidationError('The AI returned an unsupported evidence level.');
  }
  return value as EvidenceLevel;
}

export function validateAnalysis(
  raw: unknown,
  documents: AiDocument[],
  projectId: string,
): ValidatedAnalysis {
  if (!isRecord(raw)) {
    throw new AnalysisValidationError('The AI response was not a JSON object.');
  }

  const documentMap = new Map(documents.map((document) => [document.id, document]));
  const rawConcepts = asArray(raw.concepts, 'concepts', 40);
  if (rawConcepts.length === 0) {
    throw new AnalysisValidationError('The AI did not extract any concepts.');
  }

  const conceptByKey = new Map<string, GeneratedConcept>();
  for (const item of rawConcepts) {
    if (!isRecord(item)) {
      throw new AnalysisValidationError('The AI returned a malformed concept.');
    }
    const label = text(item.label, 'concept label', 2, 120);
    const key = normalizeLabel(label);
    if (!key) {
      throw new AnalysisValidationError('The AI returned an empty concept label.');
    }
    const definition = text(item.definition, 'concept definition', 3, 1000);
    const clusterId = readClusterId(item.clusterId);
    const evidence = readEvidence(item.evidence, 'concept evidence', documentMap);
    const documentIds = Array.from(new Set(evidence.map((entry) => entry.documentId)));

    const existing = conceptByKey.get(key);
    if (existing) {
      existing.documentIds = Array.from(new Set([...existing.documentIds, ...documentIds]));
      existing.evidence = uniqueEvidence([...(existing.evidence ?? []), ...evidence]);
      existing.mentions = existing.evidence.length;
      continue;
    }

    conceptByKey.set(key, {
      id: stableId('concept', projectId, key),
      label,
      clusterId,
      definition,
      documentIds,
      mentions: evidence.length,
      evidence,
    });
  }

  const concepts = [...conceptByKey.values()];
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  const byLabel = new Map(
    concepts.map((concept) => [normalizeLabel(concept.label), concept]),
  );

  const rawConnections = asArray(raw.connections, 'connections', 80);
  const connectionByKey = new Map<string, GeneratedConnection>();
  for (const item of rawConnections) {
    if (!isRecord(item)) {
      throw new AnalysisValidationError('The AI returned a malformed connection.');
    }

    const fromValue = text(item.from, 'connection source concept', 1, 160);
    const toValue = text(item.to, 'connection target concept', 1, 160);
    const from = byLabel.get(normalizeLabel(fromValue)) ?? byId.get(fromValue);
    const to = byLabel.get(normalizeLabel(toValue)) ?? byId.get(toValue);
    if (!from || !to) {
      throw new AnalysisValidationError(
        'The AI connected a concept that was not in its concept list.',
      );
    }
    if (from.id === to.id) continue;

    if (typeof item.type !== 'string' || !RELATION_IDS.includes(item.type as RelationType)) {
      throw new AnalysisValidationError('The AI returned an unsupported relationship type.');
    }
    const type = item.type as RelationType;
    const evidenceLevel = readLevel(item.evidenceLevel);
    const evidence = readEvidence(item.evidence, 'connection evidence', documentMap);
    if (evidenceLevel === 'inference' && evidence.length < 2) {
      throw new AnalysisValidationError(
        'An inferred connection needs at least two pieces of evidence.',
      );
    }

    const explanation = text(item.explanation, 'connection explanation', 5, 1200);
    const title = optionalText(item.title, 'connection title', 200) ?? `${from.label} / ${to.label}`;
    const strength = score(item.strength, 'connection strength');
    const rawConfidence = score(item.confidence, 'connection confidence');
    const confidence =
      evidenceLevel === 'direct'
        ? Math.min(rawConfidence, 0.95)
        : evidenceLevel === 'inference'
          ? Math.min(rawConfidence, 0.7)
          : Math.min(rawConfidence, 0.4);

    const evidenceDocuments = new Set(evidence.map((entry) => entry.documentId));
    const toDocuments = new Set(to.documentIds);
    const isBridge =
      from.documentIds.every((documentId) => !toDocuments.has(documentId)) ||
      evidenceDocuments.size > 1;

    const keyParts = [from.id, to.id, type];
    if (type === 'related' || type === 'similar') keyParts.sort();
    const key = keyParts.join('|');
    if (connectionByKey.has(key)) continue;

    connectionByKey.set(key, {
      id: stableId('connection', projectId, key),
      from: from.id,
      to: to.id,
      type,
      strength,
      confidence,
      title,
      explanation,
      isBridge,
      suggested: evidenceLevel === 'speculative',
      evidenceLevel,
      evidence,
    });
  }

  const rawInsights = raw.insights === undefined ? [] : asArray(raw.insights, 'insights', 6);
  const insightByKey = new Map<string, GeneratedInsight>();
  const connectionList = [...connectionByKey.values()];

  for (const item of rawInsights) {
    if (!isRecord(item)) {
      throw new AnalysisValidationError('The AI returned a malformed insight.');
    }
    if (typeof item.kind !== 'string' || !INSIGHT_KINDS.includes(item.kind as InsightKind)) {
      throw new AnalysisValidationError('The AI returned an unsupported insight kind.');
    }
    const kind = item.kind as InsightKind;
    const title = text(item.title, 'insight title', 5, 200);
    const summary = text(item.summary, 'insight summary', 10, 500);
    const rationale = text(item.rationale, 'insight rationale', 10, 1200);
    const evidenceLevel = readLevel(item.evidenceLevel);
    const evidence = readEvidence(item.evidence, 'insight evidence', documentMap);
    if (evidenceLevel === 'inference' && evidence.length < 2) {
      throw new AnalysisValidationError(
        'An inferred insight needs at least two pieces of evidence.',
      );
    }

    const evidenceDocuments = new Set(evidence.map((entry) => entry.documentId));
    if ((kind === 'bridge' || kind === 'pattern') && evidenceDocuments.size < 2) {
      throw new AnalysisValidationError(
        `A ${kind} insight needs evidence from at least two documents.`,
      );
    }

    const rawLabels = asArray(item.conceptLabels, 'insight concept labels', 8);
    if (rawLabels.length === 0) {
      throw new AnalysisValidationError('An insight did not reference any concepts.');
    }
    const insightConcepts = rawLabels.map((value) => {
      const label = text(value, 'insight concept label', 1, 160);
      const concept = byLabel.get(normalizeLabel(label)) ?? byId.get(label);
      if (!concept) {
        throw new AnalysisValidationError(
          'An insight referenced a concept that was not in the concept list.',
        );
      }
      return concept;
    });
    const conceptIds = Array.from(new Set(insightConcepts.map((concept) => concept.id)));
    if (kind === 'bridge' && conceptIds.length < 2) {
      throw new AnalysisValidationError('A bridge insight needs at least two concepts.');
    }

    let edgeId: string | undefined;
    if (item.connection !== undefined && item.connection !== null) {
      if (!isRecord(item.connection)) {
        throw new AnalysisValidationError('An insight contained a malformed connection.');
      }
      const fromLabel = text(item.connection.from, 'insight connection source', 1, 160);
      const toLabel = text(item.connection.to, 'insight connection target', 1, 160);
      const type = text(item.connection.type, 'insight connection type', 1, 40);
      const from = byLabel.get(normalizeLabel(fromLabel)) ?? byId.get(fromLabel);
      const to = byLabel.get(normalizeLabel(toLabel)) ?? byId.get(toLabel);
      const match = connectionList.find(
        (connection) =>
          connection.type === type &&
          ((connection.from === from?.id && connection.to === to?.id) ||
            ((type === 'related' || type === 'similar') &&
              connection.from === to?.id &&
              connection.to === from?.id)),
      );
      if (!from || !to) {
        throw new AnalysisValidationError(
          'An insight referenced a concept that was not in the concept list.',
        );
      }
      edgeId = match?.id;
    }

    const rawConfidence = score(item.confidence, 'insight confidence');
    const confidence =
      evidenceLevel === 'direct'
        ? Math.min(rawConfidence, 0.95)
        : evidenceLevel === 'inference'
          ? Math.min(rawConfidence, 0.7)
          : Math.min(rawConfidence, 0.4);
    const key = `${kind}|${normalizeText(title)}`;
    if (insightByKey.has(key)) continue;
    insightByKey.set(key, {
      id: stableId('insight', projectId, key),
      kind,
      title,
      summary,
      rationale,
      conceptIds,
      confidence,
      ...(edgeId ? { edgeId } : {}),
      evidenceLevel,
      evidence,
      documentIds: [...evidenceDocuments],
    });
  }

  return {
    concepts,
    connections: connectionList,
    insights: [...insightByKey.values()],
  };
}
