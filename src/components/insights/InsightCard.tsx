import { Link } from 'react-router-dom';
import type { Insight } from '../../types';
import type { BadgeTone } from '../ui/Badge';
import { Badge, RelationBadge } from '../ui/Badge';
import { ConceptTag } from '../ui/ConceptTag';
import { Icon } from '../icons';
import { useKnowledge } from '../../store/KnowledgeContext';
import { projectPath } from '../../lib/paths';
import { RELATION_TYPES } from '../../lib/relations';

const INSIGHT_META: Record<Insight['kind'], { label: string; tone: BadgeTone }> = {
  bridge: { label: 'Unexpected connection', tone: 'mint' },
  gap: { label: 'Knowledge gap', tone: 'amber' },
  tension: { label: 'Contradiction', tone: 'rose' },
  pattern: { label: 'Recurring pattern', tone: 'violet' },
};

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
}

/**
 * A discovery reads as a short claim first; opening it explains the reasoning,
 * the exact relationship and which sources support it.
 */
export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const { workspace, conceptById, documentById, connections } = useKnowledge();
  const meta = INSIGHT_META[insight.kind];
  const edge = insight.edgeId
    ? connections.find((connection) => connection.id === insight.edgeId)
    : undefined;
  const from = edge ? conceptById.get(edge.from) : undefined;
  const to = edge ? conceptById.get(edge.to) : undefined;

  const sourceIds = Array.from(
    new Set(
      insight.conceptIds.flatMap((conceptId) => conceptById.get(conceptId)?.documentIds ?? []),
    ),
  );
  const sources = sourceIds
    .map((id) => documentById.get(id))
    .filter((document): document is NonNullable<typeof document> => Boolean(document));

  const graphLink = insight.edgeId
    ? `${projectPath(workspace.id, 'graph')}?edge=${insight.edgeId}`
    : `${projectPath(workspace.id, 'graph')}?node=${insight.conceptIds[0] ?? ''}`;

  return (
    <details className={`discovery discovery--${insight.kind}`}>
      <summary className="discovery__summary">
        <span className="discovery__head">
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
          <span className="mono discovery__confidence">
            {Math.round(insight.confidence * 100)}% match
          </span>
        </span>
        <span className="discovery__title">{insight.title}</span>
        <span className="discovery__lede">{insight.summary}</span>
        <span className="discovery__toggle">
          Why this was flagged
          <Icon name="chevronDown" size={14} className="discovery__chevron" />
        </span>
      </summary>

      <div className="discovery__body">
        <p className="discovery__rationale">{insight.rationale}</p>

        {edge && from && to ? (
          <div className="discovery__edge">
            <div className="discovery__edge-head">
              <RelationBadge type={edge.type} dot={false} />
              <span className="discovery__edge-title">{edge.title}</span>
            </div>
            <p className="discovery__edge-pair">
              {from.label}
              <Icon
                name={RELATION_TYPES[edge.type].directional ? 'arrowRight' : 'link'}
                size={12}
              />
              {to.label}
            </p>
            <p className="discovery__rationale">{edge.explanation}</p>
          </div>
        ) : null}

        {sources.length > 0 ? (
          <div className="discovery__block">
            <p className="discovery__label">Supporting sources</p>
            <ul className="discovery__sources">
              {sources.map((document) => (
                <li key={document.id}>
                  <Link to={projectPath(workspace.id, `sources/${document.id}`)}>
                    <Icon name="file" size={13} />
                    <span>{document.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="discovery__block">
          <p className="discovery__label">Ideas involved</p>
          <div className="discovery__concepts">
            {insight.conceptIds.map((conceptId) => (
              <ConceptTag key={conceptId} conceptId={conceptId} interactive />
            ))}
          </div>
        </div>

        <footer className="discovery__actions">
          <Link to={graphLink} className="btn btn--sm btn--secondary">
            <span className="btn__icon">
              <Icon name={edge ? 'link' : 'graph'} size={14} />
            </span>
            {edge ? 'Open this connection' : 'Explore in graph'}
          </Link>
          {onDismiss ? (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => onDismiss(insight.id)}
            >
              Dismiss
            </button>
          ) : null}
        </footer>
      </div>
    </details>
  );
}
