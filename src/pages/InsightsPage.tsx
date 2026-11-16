import { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { InsightCard } from '../components/insights/InsightCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/icons';
import { AnalysisNotice } from '../components/sources/AnalysisNotice';
import { useKnowledge } from '../store/KnowledgeContext';
import { projectPath } from '../lib/paths';
import {
  INSIGHT_CATEGORIES,
  insightsForCategory,
} from '../lib/insightCategories';

export function InsightsPage() {
  const {
    activeInsights,
    dismissedIds,
    dismissInsight,
    restoreInsights,
    workspace,
    refreshAnalysis,
  } = useKnowledge();
  const { category: categorySlug } = useParams();

  useEffect(() => {
    void refreshAnalysis();
  }, [refreshAnalysis]);

  const category = categorySlug
    ? INSIGHT_CATEGORIES.find((item) => item.id === categorySlug)
    : undefined;

  const insightsByCategory = useMemo(() => {
    const entries = INSIGHT_CATEGORIES.map(
      (item) => [item.id, insightsForCategory(item, activeInsights)] as const,
    );
    return new Map(entries);
  }, [activeInsights]);

  const restoreAction =
    dismissedIds.length > 0 ? (
      <button type="button" className="btn btn--ghost btn--sm" onClick={restoreInsights}>
        <span className="btn__icon">
          <Icon name="reset" size={14} />
        </span>
        Restore dismissed ({dismissedIds.length})
      </button>
    ) : undefined;

  if (categorySlug && !category) {
    return <Navigate to={projectPath(workspace.id, 'insights')} replace />;
  }

  if (!category) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Insights"
          title="What the sources reveal"
          description={`Every finding comes from the sources in ${workspace.name}. Broader Insights gathers the strongest finding from each category rather than claiming a new conclusion.`}
          actions={restoreAction}
        />

        <AnalysisNotice />

        {activeInsights.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="sparkles"
              title="No open discoveries"
              text={
                dismissedIds.length > 0
                  ? 'Everything here has been dismissed. Restore the discoveries to review them again.'
                  : 'Add at least two analysed sources and discoveries from across them will appear here.'
              }
              action={
                dismissedIds.length === 0 ? (
                  <Link to={projectPath(workspace.id, 'sources')} className="btn btn--sm btn--primary">
                    Add sources
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="insight-categories">
            {INSIGHT_CATEGORIES.map((item) => {
              const count = insightsByCategory.get(item.id)?.length ?? 0;
              return (
                <Link
                  key={item.id}
                  to={projectPath(workspace.id, `insights/${item.id}`)}
                  className={`insight-category insight-category--${item.id}`}
                >
                  <span className="insight-category__top">
                    <span className="insight-category__icon">
                      <Icon name={item.icon} size={18} />
                    </span>
                    <span className="insight-category__count">
                      {count} {count === 1 ? 'finding' : 'findings'}
                    </span>
                  </span>
                  <span className="insight-category__title">{item.title}</span>
                  <span className="insight-category__blurb">{item.blurb}</span>
                  <span className="insight-category__open">
                    Explore
                    <Icon name="arrowRight" size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const items = insightsByCategory.get(category.id) ?? [];

  return (
    <div className="page">
      <Link
        to={projectPath(workspace.id, 'insights')}
        className="back-link insight-detail__back"
      >
        <Icon name="arrowLeft" size={14} />
        All insight categories
      </Link>

      <PageHeader
        eyebrow={`Insights · ${workspace.name}`}
        title={category.title}
        description={category.detail}
        actions={restoreAction}
      />

      <AnalysisNotice />

      {category.id === 'broader-insights' && items.length > 0 ? (
        <p className="insight-detail__note">
          This is a digest, not a new synthesis: one highest-confidence finding from each category.
          The findings are generated from the analysed sources and keep their evidence excerpts.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="insight-detail__list">
          {items.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={category.icon}
            title={`No ${category.title.toLowerCase()} yet`}
            text={
              category.empty +
              ' Run cross-document analysis on the Sources screen; only supported findings are shown.'
            }
            action={
              <Link
                to={projectPath(workspace.id, 'insights')}
                className="btn btn--sm btn--secondary"
              >
                All insight categories
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
