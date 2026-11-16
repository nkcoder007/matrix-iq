import type { EvidenceLevel } from '../types';

export interface EvidenceLevelMeta {
  label: string;
  short: string;
  tone: 'mint' | 'blue' | 'amber';
  description: string;
}

export const EVIDENCE_LEVELS: Record<EvidenceLevel, EvidenceLevelMeta> = {
  direct: {
    label: 'Direct evidence',
    short: 'Direct',
    tone: 'mint',
    description: 'The source explicitly states this connection.',
  },
  inference: {
    label: 'Reasonable inference',
    short: 'Inferred',
    tone: 'blue',
    description: 'A logical connection supported by more than one piece of evidence.',
  },
  speculative: {
    label: 'Speculative connection',
    short: 'Speculative',
    tone: 'amber',
    description: 'A possible analogy or hypothesis. Treat it as a question, not a fact.',
  },
};
