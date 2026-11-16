import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { Icon } from '../icons';
import { projectPath } from '../../lib/paths';
import { searchWorkspace } from '../../lib/search';
import { categoryById, categoryForInsightKind } from '../../lib/insightCategories';
import { RELATION_TYPES } from '../../lib/relations';
import { useDialogBehavior } from '../../lib/useDialogBehavior';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const {
    concepts,
    documents,
    connections,
    insights,
    conceptById,
    clusterById,
    workspace,
  } = useKnowledge();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const results = searchWorkspace(normalized, {
    concepts,
    connections,
    insights,
    documents,
    conceptById,
  });

  const conceptResults = results.concepts.slice(0, 5);
  const connectionResults = normalized ? results.connections.slice(0, 4) : [];
  const insightResults = normalized ? results.insights.slice(0, 3) : [];
  const documentResults = results.documents.slice(0, 4);
  const hasResults =
    conceptResults.length + connectionResults.length + insightResults.length + documentResults.length >
    0;

  const firstTarget = conceptResults[0]
    ? `${projectPath(workspace.id, 'graph')}?node=${conceptResults[0].id}`
    : connectionResults[0]
      ? `${projectPath(workspace.id, 'graph')}?edge=${connectionResults[0].id}`
      : insightResults[0]
        ? projectPath(
            workspace.id,
            `insights/${categoryForInsightKind(insightResults[0].kind)}`,
          )
        : documentResults[0]
          ? projectPath(workspace.id, `sources/${documentResults[0].id}`)
          : null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  useDialogBehavior({
    open,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  if (!open) return null;

  return (
    <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search workspace">
      <button type="button" className="cmdk__scrim" onClick={onClose} aria-label="Close search" />
      <div ref={dialogRef} className="cmdk__dialog" tabIndex={-1}>
        <div className="cmdk__input-row">
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Search ideas, connections, insights and sources…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && firstTarget) go(firstTarget);
            }}
            aria-label="Search query"
          />
          <kbd>esc</kbd>
        </div>

        <div className="cmdk__body">
          {!hasResults ? (
            <div className="cmdk__empty">
              No matches for “{query}”. Try an idea like “quorum”, a connection title or a source
              name.
            </div>
          ) : null}

          {conceptResults.length > 0 ? (
            <div className="cmdk__group">
              <p className="eyebrow">Ideas</p>
              {conceptResults.map((concept) => (
                <button
                  key={concept.id}
                  type="button"
                  className="cmdk__item"
                  onClick={() => go(`${projectPath(workspace.id, 'graph')}?node=${concept.id}`)}
                >
                  <span
                    className="cmdk__icon"
                    style={{
                      color: clusterById.get(concept.clusterId)?.color,
                      borderColor: `${clusterById.get(concept.clusterId)?.color}55`,
                    }}
                  >
                    <Icon name="graph" size={14} />
                  </span>
                  <span className="cmdk__text">
                    <span className="cmdk__label">{concept.label}</span>
                    <span className="cmdk__meta">
                      {clusterById.get(concept.clusterId)?.short} · {concept.mentions} mentions
                    </span>
                  </span>
                  <Icon name="arrowUpRight" size={14} className="dim" />
                </button>
              ))}
            </div>
          ) : null}

          {connectionResults.length > 0 ? (
            <div className="cmdk__group">
              <p className="eyebrow">Connections</p>
              {connectionResults.map((connection) => {
                const from = conceptById.get(connection.from);
                const to = conceptById.get(connection.to);
                return (
                  <button
                    key={connection.id}
                    type="button"
                    className="cmdk__item"
                    onClick={() =>
                      go(`${projectPath(workspace.id, 'graph')}?edge=${connection.id}`)
                    }
                  >
                    <span className="cmdk__icon">
                      <Icon name="link" size={14} />
                    </span>
                    <span className="cmdk__text">
                      <span className="cmdk__label">{connection.title}</span>
                      <span className="cmdk__meta">
                        {from?.label ?? 'Idea'} → {to?.label ?? 'Idea'} ·{' '}
                        {RELATION_TYPES[connection.type].label}
                      </span>
                    </span>
                    <Icon name="arrowUpRight" size={14} className="dim" />
                  </button>
                );
              })}
            </div>
          ) : null}

          {insightResults.length > 0 ? (
            <div className="cmdk__group">
              <p className="eyebrow">Insights</p>
              {insightResults.map((insight) => {
                const category = categoryById(categoryForInsightKind(insight.kind));
                return (
                  <button
                    key={insight.id}
                    type="button"
                    className="cmdk__item"
                    onClick={() => go(projectPath(workspace.id, `insights/${category.id}`))}
                  >
                    <span className="cmdk__icon">
                      <Icon name={category.icon} size={14} />
                    </span>
                    <span className="cmdk__text">
                      <span className="cmdk__label">{insight.title}</span>
                      <span className="cmdk__meta">
                        {category.short} · {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </span>
                    <Icon name="arrowUpRight" size={14} className="dim" />
                  </button>
                );
              })}
            </div>
          ) : null}

          {documentResults.length > 0 ? (
            <div className="cmdk__group">
              <p className="eyebrow">Sources</p>
              {documentResults.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  className="cmdk__item"
                  onClick={() => go(projectPath(workspace.id, `sources/${document.id}`))}
                >
                  <span className="cmdk__icon">
                    <Icon name="file" size={14} />
                  </span>
                  <span className="cmdk__text">
                    <span className="cmdk__label">{document.title}</span>
                    <span className="cmdk__meta">
                      {document.status === 'queued'
                        ? 'Waiting for analysis'
                        : document.subtitle}
                    </span>
                  </span>
                  <Icon name="arrowUpRight" size={14} className="dim" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="cmdk__foot">
          <span>
            <kbd>↵</kbd> open first result
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <span className="cmdk__foot-note">
            Searches ideas, connections, insights and sources
          </span>
        </footer>
      </div>
    </div>
  );
}
