import type { RelationType } from '../types';

export interface RelationMeta {
  label: string;
  color: string;
  /** False for categories that read the same in both directions. */
  directional: boolean;
  description: string;
}

export const RELATION_TYPES: Record<RelationType, RelationMeta> = {
  related: {
    label: 'Related To',
    color: 'var(--text-3)',
    directional: false,
    description:
      'The ideas belong together but neither one produces the other. Reads the same in both directions.',
  },
  causes: {
    label: 'Causes',
    color: 'var(--danger)',
    directional: true,
    description: 'The first idea makes the second one happen.',
  },
  leads: {
    label: 'Leads To',
    color: 'var(--blue)',
    directional: true,
    description: 'The first idea makes the second one more likely over time.',
  },
  partOf: {
    label: 'Part Of',
    color: 'var(--blue)',
    directional: true,
    description: 'The first idea is one piece of the larger second idea.',
  },
  similar: {
    label: 'Similar To',
    color: 'var(--violet)',
    directional: false,
    description:
      'Two different settings showing the same pattern. Reads the same in both directions.',
  },
  opposes: {
    label: 'Opposes',
    color: 'var(--amber)',
    directional: true,
    description: 'The first idea works against the second one.',
  },
  depends: {
    label: 'Depends On',
    color: 'var(--blue)',
    directional: true,
    description: 'The first idea only works if the second one exists.',
  },
  influences: {
    label: 'Influences',
    color: 'var(--blue)',
    directional: true,
    description: 'The first idea changes how the second one behaves.',
  },
};

export const RELATION_ORDER: RelationType[] = [
  'related',
  'causes',
  'leads',
  'partOf',
  'similar',
  'opposes',
  'depends',
  'influences',
];
