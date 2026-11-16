import type { IconName } from '../components/icons';
import type { Insight, InsightKind } from '../types';

export type InsightCategoryId =
  | 'recurring-patterns'
  | 'unexpected-connections'
  | 'contradictions'
  | 'knowledge-gaps'
  | 'broader-insights';

export interface InsightCategory {
  id: InsightCategoryId;
  title: string;
  short: string;
  icon: IconName;
  color: string;
  kind?: InsightKind;
  blurb: string;
  detail: string;
  empty: string;
}

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  {
    id: 'recurring-patterns',
    title: 'Recurring Patterns',
    short: 'Patterns',
    icon: 'layers',
    color: '#2563eb',
    kind: 'pattern',
    blurb: 'Ideas that surface again and again across different sources.',
    detail: 'The strongest repeated ideas in this project, with the sources that support them.',
    empty: 'No recurring patterns have been identified yet.',
  },
  {
    id: 'unexpected-connections',
    title: 'Unexpected Bridges',
    short: 'Bridges',
    icon: 'link',
    color: '#0f9f7f',
    kind: 'bridge',
    blurb: 'Connections between ideas that usually live apart.',
    detail: 'Cross-topic connections worth a closer look, ranked by confidence.',
    empty: 'No cross-topic bridges have been identified yet.',
  },
  {
    id: 'contradictions',
    title: 'Tensions & Contradictions',
    short: 'Tensions',
    icon: 'alert',
    color: '#c2410c',
    kind: 'tension',
    blurb: 'Places where your sources disagree or pull in different directions.',
    detail: 'Ideas that qualify, complicate or push against each other across the collection.',
    empty: 'No tensions have been identified in these sources.',
  },
  {
    id: 'knowledge-gaps',
    title: 'Gaps & Open Questions',
    short: 'Gaps',
    icon: 'target',
    color: '#7c3aed',
    kind: 'gap',
    blurb: 'Threads that stop early, or questions your sources leave open.',
    detail: 'Questions raised by the collection that no current source fully answers.',
    empty: 'No open questions have been identified yet.',
  },
  {
    id: 'broader-insights',
    title: 'Broader Insights',
    short: 'Broader',
    icon: 'sparkles',
    color: '#b45309',
    blurb: 'The strongest single finding from each category, gathered into one digest.',
    detail:
      'A cross-category digest, not new synthesis: the highest-confidence finding from each category, gathered in one place. AI-extracted concepts and connections appear in the project graph; generated insight categories are not part of this phase.',
    empty: 'There are no findings to gather into a digest yet.',
  },
];

const categoryByKind = new Map<InsightKind, InsightCategoryId>(
  INSIGHT_CATEGORIES.flatMap((category) =>
    category.kind ? [[category.kind, category.id] as const] : [],
  ),
);

export function categoryForInsightKind(kind: InsightKind): InsightCategoryId {
  return categoryByKind.get(kind) ?? 'broader-insights';
}

export function categoryById(id: InsightCategoryId): InsightCategory {
  return INSIGHT_CATEGORIES.find((category) => category.id === id) ?? INSIGHT_CATEGORIES[0];
}

/** One strongest finding per kind keeps Broader Insights a digest, not a duplicate list. */
export function broaderDigest(insights: Insight[]): Insight[] {
  const strongest = new Map<InsightKind, Insight>();
  for (const insight of insights) {
    const current = strongest.get(insight.kind);
    if (!current || insight.confidence > current.confidence) {
      strongest.set(insight.kind, insight);
    }
  }
  return Array.from(strongest.values()).sort((a, b) => b.confidence - a.confidence);
}

export function insightsForCategory(
  category: InsightCategory,
  insights: Insight[],
): Insight[] {
  if (category.id === 'broader-insights') return broaderDigest(insights);
  if (!category.kind) return [];
  return insights
    .filter((insight) => insight.kind === category.kind)
    .sort((a, b) => b.confidence - a.confidence);
}
