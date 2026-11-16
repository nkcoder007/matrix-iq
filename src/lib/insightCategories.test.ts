import { describe, expect, it } from 'vitest';
import { INSIGHTS } from '../data/seed';
import {
  broaderDigest,
  categoryForInsightKind,
  INSIGHT_CATEGORIES,
  insightsForCategory,
} from './insightCategories';

describe('insight categories', () => {
  it('maps every finding kind to one category', () => {
    expect(categoryForInsightKind('bridge')).toBe('unexpected-connections');
    expect(categoryForInsightKind('pattern')).toBe('recurring-patterns');
    expect(categoryForInsightKind('tension')).toBe('contradictions');
    expect(categoryForInsightKind('gap')).toBe('knowledge-gaps');
  });

  it('builds a digest with only the strongest finding from each kind', () => {
    const digest = broaderDigest(INSIGHTS);
    const kinds = new Set(INSIGHTS.map((insight) => insight.kind));

    expect(digest).toHaveLength(kinds.size);
    for (const kind of kinds) {
      const strongest = INSIGHTS.filter((insight) => insight.kind === kind).sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      expect(digest.some((insight) => insight.id === strongest.id)).toBe(true);
    }
    expect(new Set(digest.map((insight) => insight.kind)).size).toBe(digest.length);
  });

  it('returns a category without duplicating its findings', () => {
    const category = INSIGHT_CATEGORIES.find(
      (item) => item.id === 'recurring-patterns',
    );
    expect(category).toBeDefined();
    if (!category) return;
    const results = insightsForCategory(category, INSIGHTS);
    expect(results.every((insight) => insight.kind === 'pattern')).toBe(true);
    expect(results).toHaveLength(INSIGHTS.filter((insight) => insight.kind === 'pattern').length);
  });

  it('has a broader category that is explicitly a digest', () => {
    const broader = INSIGHT_CATEGORIES.find((item) => item.id === 'broader-insights');
    expect(broader?.detail).toMatch(/digest, not new synthesis/i);
  });
});
