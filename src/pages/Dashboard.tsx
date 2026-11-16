import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { DocumentRow } from '../components/documents/DocumentRow';
import { RelationBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/icons';
import { useKnowledge } from '../store/KnowledgeContext';
import { projectPath } from '../lib/paths';
import { RELATION_TYPES } from '../lib/relations';

export function Dashboard() {
  const {
    workspace,
    documents,
    concepts,
    connections,
    clusters,
    conceptById,
    documentById,
  } = useKnowledge();

  const recent = [...documents]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 4);

  const clusterCounts = clusters
    .map((cluster) => ({
      cluster,
      count: concepts.filter((concept) => concept.clusterId === cluster.id).length,
    }))
    .sort((a, b) => b.count - a.count);

  const keyConnections = [...connections]
    .sort((a, b) => {
      if (a.isBridge !== b.isBridge) return a.isBridge ? -1 : 1;
      return b.confidence - a.confidence;
    })
    .slice(0, 3);

  return (
    <div className="page overview">
      <PageHeader
        eyebrow="Overview"
        title={workspace.name}
        description={workspace.description}
        actions={
          <>
            <Link to={projectPath(workspace.id, 'graph')} className="btn btn--secondary">
              <span className="btn__icon">
                <Icon name="graph" size={15} />
              </span>
              Knowledge graph
            </Link>
            <Link to={projectPath(workspace.id, 'sources')} className="btn btn--primary">
              <span className="btn__icon">
                <Icon name="plus" size={15} />
              </span>
              Add sources
            </Link>
          </>
        }
      />

      <section className="stat-strip" aria-label="Project totals">
        <div className="stat">
          <span className="stat__value">{documents.length}</span>
          <span className="stat__label">Sources</span>
        </div>
        <div className="stat">
          <span className="stat__value">{concepts.length}</span>
          <span className="stat__label">Ideas</span>
        </div>
        <div className="stat">
          <span className="stat__value">{connections.length}</span>
          <span className="stat__label">Connections</span>
        </div>
      </section>

      {documents.length === 0 ? (
        <>
          <section className="card">
            <EmptyState
              icon="upload"
              title="This project has no sources yet"
              text="Upload a document or paste some notes, and MatrixIQ will start mapping what is inside them. Nothing is shared with your other projects."
              action={
                <Link to={projectPath(workspace.id, 'sources')} className="btn btn--sm btn--primary">
                  Add your first sources
                </Link>
              }
            />
          </section>

          <section className="onboarding card" aria-labelledby="onboarding-title">
            <div>
              <h2 id="onboarding-title" className="onboarding__title">
                How this project will come together
              </h2>
              <p className="onboarding__sub">
                Add at least two sources so MatrixIQ has something to compare.
              </p>
            </div>
            <ol className="onboarding__steps">
              <li className="onboarding__step">
                <span className="onboarding__num">1</span>
                <div>
                  <h3>Upload sources</h3>
                  <p>Add PDFs, notes or pasted text to this project.</p>
                </div>
              </li>
              <li className="onboarding__step">
                <span className="onboarding__num">2</span>
                <div>
                  <h3>Discover connections</h3>
                  <p>MatrixIQ finds ideas that appear in more than one place.</p>
                </div>
              </li>
              <li className="onboarding__step">
                <span className="onboarding__num">3</span>
                <div>
                  <h3>Explore insights</h3>
                  <p>Open the surprising links, contradictions and gaps.</p>
                </div>
              </li>
            </ol>
          </section>
        </>
      ) : (
        <>
          <section className="summary-card card" aria-labelledby="summary-title">
            <h2 id="summary-title" className="summary-card__title">
              What this project explores
            </h2>
            <p className="summary-card__text">
              {concepts.length === 0
                ? `${documents.length} ${documents.length === 1 ? 'source is' : 'sources are'} waiting to be analysed. The ideas and connections will appear here once that finishes.`
                : `${documents.length} ${documents.length === 1 ? 'source' : 'sources'} produced ${concepts.length} ideas and ${connections.length} connections. The strongest threads run through ${clusterCounts
                    .slice(0, 3)
                    .map((item) => item.cluster.short.toLowerCase())
                    .join(', ')}.`}
            </p>
            {clusterCounts.length > 0 ? (
              <ul className="summary-card__themes">
                {clusterCounts.map(({ cluster, count }) => (
                  <li key={cluster.id}>
                    <span className="dot" style={{ color: cluster.color }} />
                    {cluster.short}
                    <span className="summary-card__count">{count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="overview__cols">
            <section aria-labelledby="recent-title">
              <div className="section-head">
                <h2 id="recent-title" className="section-head__title">
                  Recently added
                </h2>
                <Link to={projectPath(workspace.id, 'sources')} className="link-quiet">
                  All sources
                  <Icon name="arrowRight" size={13} />
                </Link>
              </div>
              <div className="card overview__list">
                {recent.map((document) => (
                  <DocumentRow key={document.id} documentId={document.id} />
                ))}
              </div>
            </section>

            <section aria-labelledby="connections-title">
              <div className="section-head">
                <h2 id="connections-title" className="section-head__title">
                  Key discoveries
                </h2>
                <Link to={projectPath(workspace.id, 'insights')} className="link-quiet">
                  All insights
                  <Icon name="arrowRight" size={13} />
                </Link>
              </div>

              {keyConnections.length > 0 ? (
                <ul className="key-links">
                  {keyConnections.map((connection) => {
                    const from = conceptById.get(connection.from);
                    const to = conceptById.get(connection.to);
                    if (!from || !to) return null;
                    const sourceIds = Array.from(
                      new Set([...from.documentIds, ...to.documentIds]),
                    ).slice(0, 3);

                    return (
                      <li key={connection.id}>
                        <Link
                          to={`${projectPath(workspace.id, 'graph')}?edge=${connection.id}`}
                          className="key-link"
                        >
                          <span className="key-link__top">
                            <span className="key-link__title">{connection.title}</span>
                            <RelationBadge type={connection.type} dot={false} />
                          </span>
                          <span className="key-link__pair">
                            {from.label}
                            <Icon
                              name={
                                RELATION_TYPES[connection.type].directional ? 'arrowRight' : 'link'
                              }
                              size={12}
                            />
                            {to.label}
                          </span>
                          <span className="key-link__why">{connection.explanation}</span>
                          <span className="key-link__sources">
                            {sourceIds
                              .map((id) => documentById.get(id)?.title)
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="card">
                  <EmptyState
                    icon="link"
                    title="No connections yet"
                    text="Connections appear once this project has at least two analysed sources."
                  />
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
