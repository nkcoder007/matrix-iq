import { Link, useParams } from 'react-router-dom';
import { useKnowledge } from '../store/KnowledgeContext';
import { DocumentGlyph, KIND_LABEL } from '../components/documents/DocumentGlyph';
import { DocumentRow } from '../components/documents/DocumentRow';
import { SourceActions } from '../components/documents/SourceActions';
import { StoredFileButton } from '../components/documents/StoredFileButton';
import { RelationBadge } from '../components/ui/Badge';
import { Badge } from '../components/ui/Badge';
import { Meter } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/icons';
import { RELATION_TYPES } from '../lib/relations';
import { formatDate, formatWords, pluralize } from '../lib/format';
import { projectPath } from '../lib/paths';

export function DocumentPage() {
  const { docId } = useParams();
  const {
    documentById,
    documents,
    conceptsForDocument,
    connectionsForDocument,
    clusterById,
    conceptById,
    workspace,
  } = useKnowledge();

  const document = docId ? documentById.get(docId) : undefined;

  if (!document) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState
            icon="file"
            title="Source not found in this project"
            text={`This document is not part of ${workspace.name}. Sources never appear across projects, so open the right project from the home page.`}
            action={
              <Link
                to={projectPath(workspace.id, 'sources')}
                className="btn btn--sm btn--secondary"
              >
                Back to sources
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const concepts = conceptsForDocument(document.id);
  const connections = connectionsForDocument(document.id).sort(
    (a, b) => b.confidence - a.confidence,
  );
  const cluster = document.clusterId ? clusterById.get(document.clusterId) : undefined;
  const bridgeCount = connections.filter((connection) => connection.isBridge).length;
  const queued = document.status === 'queued';

  const related = documents
    .filter((candidate) => candidate.id !== document.id)
    .map((candidate) => ({
      document: candidate,
      shared: candidate.conceptIds.filter((id) => document.conceptIds.includes(id)).length,
    }))
    .filter((item) => item.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3);

  return (
    <div className="page">
      <Link to={projectPath(workspace.id, 'sources')} className="back-link">
        <Icon name="arrowRight" size={13} style={{ transform: 'rotate(180deg)' }} />
        All sources in {workspace.name}
      </Link>

      <header className="doc-header card">
        <DocumentGlyph clusterId={document.clusterId} kind={document.kind} size="lg" />
        <div className="doc-header__main">
          <div className="doc-header__meta">
            <span className="mono">{KIND_LABEL[document.kind]}</span>
            <span className="doc-header__sep" />
            {cluster ? (
              <span className="doc-header__cluster">
                <span className="dot" style={{ color: cluster.color }} />
                {cluster.label}
              </span>
            ) : (
              <span className="doc-header__cluster">Unsorted</span>
            )}
            <span className="doc-header__sep" />
            <span>{formatDate(document.addedAt)}</span>
            {queued ? (
              <>
                <span className="doc-header__sep" />
                <Badge tone="amber">Queued</Badge>
              </>
            ) : null}
          </div>
          <h1 className="doc-header__title">{document.title}</h1>
          <p className="doc-header__sub">{document.subtitle}</p>
        </div>
        <div className="doc-header__actions">
          {!queued ? (
            <Link
              to={`${projectPath(workspace.id, 'graph')}?node=${document.conceptIds[0] ?? ''}`}
              className="btn btn--secondary btn--sm"
            >
              <span className="btn__icon">
                <Icon name="graph" size={14} />
              </span>
              Open in graph
            </Link>
          ) : null}
          <SourceActions document={document} />
        </div>
      </header>

      <div className="doc-layout">
        <div className="doc-main">
          {queued ? (
            <>
              <section className="card doc-queued">
                <span className="doc-queued__icon">
                  <Icon name="clock" size={18} />
                </span>
                <div>
                  <p className="doc-queued__title">Waiting for analysis</p>
                  <p className="doc-queued__text">
                    This source belongs to {workspace.name} and is visible only here. Automatic
                    analysis is not connected in this build, so it has no ideas or connections yet.
                  </p>
                </div>
              </section>

              <section className="doc-section card doc-stored">
                <div className="spread">
                  <p className="eyebrow">Stored source</p>
                  {document.fileName ? (
                    <span className="mono doc-count">{document.fileName}</span>
                  ) : null}
                </div>
                <p className="doc-muted">
                  The original content is saved in this browser so a future analysis service can
                  read it. Nothing is sent anywhere today.
                </p>
                {document.content ? (
                  <pre className="doc-source-text">{document.content}</pre>
                ) : null}
                <StoredFileButton document={document} />
              </section>
            </>
          ) : (
            <section className="doc-section card">
              <p className="eyebrow">What this source says</p>
              <p className="doc-summary">{document.summary}</p>
              {document.excerpt ? <blockquote className="reader">{document.excerpt}</blockquote> : null}
            </section>
          )}

          {concepts.length > 0 ? (
            <section className="doc-section card">
              <div className="spread">
                <p className="eyebrow">Ideas found</p>
                <span className="mono doc-count">{concepts.length} ideas</span>
              </div>
              <ul className="concept-list">
                {concepts.map((concept) => (
                  <li key={concept.id}>
                    <Link
                      to={`${projectPath(workspace.id, 'graph')}?node=${concept.id}`}
                      className="concept-item"
                    >
                      <span className="concept-item__head">
                        <span className="concept-item__label">{concept.label}</span>
                        <span className="concept-item__mentions mono">
                          {concept.mentions} mentions
                        </span>
                        <Icon name="chevronRight" size={14} className="dim" />
                      </span>
                      <span className="concept-item__def">{concept.definition}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {connections.length > 0 ? (
            <section className="doc-section card">
              <div className="spread">
                <p className="eyebrow">Connections</p>
                <span className="mono doc-count">
                  {connections.length} connections · {bridgeCount} across topics
                </span>
              </div>
              <ul className="edge-list">
                {connections.map((connection) => {
                  const from = conceptById.get(connection.from);
                  const to = conceptById.get(connection.to);
                  if (!from || !to) return null;
                  const fromHere = from.documentIds.includes(document.id);
                  const anchor = fromHere ? from : to;
                  const other = fromHere ? to : from;
                  const meta = RELATION_TYPES[connection.type];
                  const pointsForward = !fromHere || !meta.directional;
                  return (
                    <li key={connection.id}>
                      <Link
                        to={`${projectPath(workspace.id, 'graph')}?edge=${connection.id}`}
                        className="edge-row"
                      >
                        <span className="edge-row__top">
                          <span className="edge-row__title">{connection.title}</span>
                          <RelationBadge type={connection.type} dot={false} />
                        </span>
                        <span className="edge-row__meta">
                          {anchor.label}
                          <Icon
                            name={meta.directional ? 'arrowRight' : 'link'}
                            size={12}
                            style={pointsForward ? undefined : { transform: 'rotate(180deg)' }}
                          />
                          {other.label}
                          {connection.isBridge ? (
                            <span className="edge-row__bridge">across topics</span>
                          ) : null}
                        </span>
                        <span className="edge-row__confidence">
                          <Meter value={connection.confidence} showValue={false} />
                          <span className="mono edge-row__value">
                            {Math.round(connection.confidence * 100)}%
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="doc-side">
          <section className="doc-section card">
            <p className="eyebrow">Source details</p>
            <dl className="detail-pairs">
              <div>
                <dt>Format</dt>
                <dd>{KIND_LABEL[document.kind]}</dd>
              </div>
              {document.pages ? (
                <div>
                  <dt>Length</dt>
                  <dd>{document.pages} pages</dd>
                </div>
              ) : null}
              {document.entries ? (
                <div>
                  <dt>Entries</dt>
                  <dd>{document.entries}</dd>
                </div>
              ) : null}
              <div>
                <dt>Words</dt>
                <dd>{formatWords(document.words)}</dd>
              </div>
              {document.fileName ? (
                <div>
                  <dt>Original file</dt>
                  <dd>{document.fileName}</dd>
                </div>
              ) : null}
              <div>
                <dt>Added</dt>
                <dd>{formatDate(document.addedAt)}</dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>{workspace.name}</dd>
              </div>
              <div>
                <dt>Ideas</dt>
                <dd>{concepts.length}</dd>
              </div>
              <div>
                <dt>Connections</dt>
                <dd>{connections.length}</dd>
              </div>
            </dl>
          </section>

          <section className="doc-section card">
            <p className="eyebrow">Related sources</p>
            {related.length > 0 ? (
              <div className="related-list">
                {related.map((item) => (
                  <div key={item.document.id}>
                    <DocumentRow documentId={item.document.id} />
                    <p className="related-note">
                      {item.shared} shared {pluralize(item.shared, 'idea')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="doc-muted">No shared ideas in this project yet.</p>
            )}
          </section>

          <section className="doc-section card doc-section--note">
            <p className="eyebrow">Where this source lives</p>
            <p className="doc-muted">
              This source and its ideas belong to {workspace.name}. Other projects cannot see or
              link to it.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
