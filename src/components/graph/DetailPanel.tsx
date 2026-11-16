import { Link } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { RELATION_TYPES } from '../../lib/relations';
import { Icon } from '../icons';
import { Badge, RelationBadge } from '../ui/Badge';
import { ConceptTag } from '../ui/ConceptTag';
import { Meter } from '../ui/Progress';
import { DocumentRow } from '../documents/DocumentRow';
import { formatPercent } from '../../lib/format';
import { EVIDENCE_LEVELS } from '../../lib/evidence';
import { projectPath } from '../../lib/paths';

interface DetailPanelProps {
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  onSelectEdge: (id: string | null) => void;
  onSelectNode: (id: string | null) => void;
  onClose: () => void;
}

export function DetailPanel({
  selectedEdgeId,
  selectedNodeId,
  onSelectEdge,
  onSelectNode,
  onClose,
}: DetailPanelProps) {
  const {
    concepts,
    clusters,
    clusterById,
    conceptById,
    connections,
    connectionsForConcept,
    documentById,
    documentsForConcept,
    savedConnectionIds,
    toggleSavedConnection,
    workspace,
  } = useKnowledge();

  const edge = selectedEdgeId
    ? (connections.find((item) => item.id === selectedEdgeId) ?? null)
    : null;
  const node = selectedNodeId ? (conceptById.get(selectedNodeId) ?? null) : null;
  const hasSelection = Boolean(edge || node);

  const edgeFrom = edge ? conceptById.get(edge.from) : undefined;
  const edgeTo = edge ? conceptById.get(edge.to) : undefined;
  const edgeMeta = edge ? RELATION_TYPES[edge.type] : null;

  const crossesDocuments = Boolean(
    edge?.isBridge ||
      (edgeFrom &&
        edgeTo &&
        edgeFrom.documentIds.every((documentId) => !edgeTo.documentIds.includes(documentId))),
  );

  const edgeSources = edge
    ? Array.from(new Set([...(edgeFrom?.documentIds ?? []), ...(edgeTo?.documentIds ?? [])]))
    : [];
  const saved = edge ? savedConnectionIds.includes(edge.id) : false;

  const nodeCluster = node ? clusterById.get(node.clusterId) : undefined;
  const nodeSources = node ? documentsForConcept(node.id) : [];
  const nodeLinks = node
    ? [...connectionsForConcept(node.id)].sort((a, b) => b.confidence - a.confidence)
    : [];
  const nodeDocumentId = nodeSources[0]?.id;
  const edgeEvidence = edge?.evidence ?? [];
  const nodeEvidence = node?.evidence ?? [];

  const crossDocumentConnections = connections.filter((item) => {
    const a = conceptById.get(item.from);
    const b = conceptById.get(item.to);
    if (!a || !b) return false;
    return (
      item.isBridge ||
      a.documentIds.every((documentId) => !b.documentIds.includes(documentId))
    );
  });

  const bridgePool = crossDocumentConnections.length > 0 ? crossDocumentConnections : connections;
  const topBridges = [...bridgePool].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  const savedConnections = connections.filter((item) => savedConnectionIds.includes(item.id));

  return (
    <aside className="detail" aria-label="Graph details">
      <header className="detail__head">
        <span className="eyebrow">
          {edge ? 'Connection' : node ? 'Idea' : 'Details'}
        </span>
        {hasSelection ? (
          <button type="button" className="detail__close" onClick={onClose} aria-label="Close details">
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </header>

      <div className="detail__body">
        {edge && edgeFrom && edgeTo && edgeMeta ? (
          <div className="detail__section">
            <div className="detail__badges">
              <RelationBadge type={edge.type} />
              {edge.evidenceLevel ? (
                <Badge tone={EVIDENCE_LEVELS[edge.evidenceLevel].tone}>
                  {EVIDENCE_LEVELS[edge.evidenceLevel].label}
                </Badge>
              ) : null}
              {crossesDocuments ? <Badge tone="violet">Across sources</Badge> : null}
              {edge.suggested ? <Badge tone="mint">Suggested</Badge> : null}
            </div>

            <h2 className="detail__title">{edge.title}</h2>

            <div className="detail__endpoints">
              <button
                type="button"
                className="detail__endpoint"
                onClick={() => onSelectNode(edge.from)}
              >
                <span
                  className="dot"
                  style={{ color: clusterById.get(edgeFrom.clusterId)?.color }}
                />
                {edgeFrom.label}
              </button>
              <Icon name="arrowRight" size={14} className="detail__arrow" />
              <button
                type="button"
                className="detail__endpoint"
                onClick={() => onSelectNode(edge.to)}
              >
                <span
                  className="dot"
                  style={{ color: clusterById.get(edgeTo.clusterId)?.color }}
                />
                {edgeTo.label}
              </button>
            </div>

            <div className="detail__relation-card">
              <span className="detail__relation-icon">
                <Icon name={edgeMeta.directional ? 'arrowRight' : 'link'} size={15} />
              </span>
              <div>
                <p className="detail__relation-title">
                  {edgeMeta.directional
                    ? `${edgeFrom.label} → ${edgeTo.label}`
                    : `${edgeFrom.label} ↔ ${edgeTo.label}`}
                </p>
                <p className="detail__relation-desc">
                  {edgeMeta.directional
                    ? 'One direction only. '
                    : 'Reads the same both ways. '}
                  {edgeMeta.description}
                </p>
              </div>
            </div>

            <div className="detail__confidence">
              <div className="spread">
                <span className="detail__label">How sure we are</span>
                <span className="mono detail__value">{formatPercent(edge.confidence)}</span>
              </div>
              <Meter value={edge.confidence} showValue={false} label="How sure we are about this connection" />
              <div className="spread detail__sub">
                <span className="detail__label">How close they are</span>
                <span className="mono detail__value">{formatPercent(edge.strength)}</span>
              </div>
            </div>

            <div className="detail__block">
              <p className="eyebrow">Why these are connected</p>
              <p className="detail__prose">{edge.explanation}</p>
            </div>

            {edgeEvidence.length > 0 ? (
              <div className="detail__block">
                <p className="eyebrow">Evidence</p>
                <ul className="evidence-list">
                  {edgeEvidence.map((item, index) => {
                    const source = documentById.get(item.documentId);
                    return (
                      <li key={`${item.documentId}-${index}`} className="evidence-item">
                        <blockquote className="evidence-quote">{item.excerpt}</blockquote>
                        <Link
                          to={projectPath(workspace.id, `sources/${item.documentId}`)}
                          className="evidence-source"
                        >
                          {source?.title ?? 'Source document'}
                        </Link>
                        {item.note ? <p className="evidence-note">{item.note}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="detail__block">
              <p className="eyebrow">Sources for this connection</p>
              <div className="detail__sources">
                {edgeSources.map((documentId) => (
                  <DocumentRow key={documentId} documentId={documentId} />
                ))}
              </div>
            </div>

            <div className="detail__actions">
              <button
                type="button"
                className={`btn btn--sm ${saved ? 'btn--secondary' : 'btn--ghost'}`}
                onClick={() => toggleSavedConnection(edge.id)}
                aria-pressed={saved}
              >
                <span className="btn__icon">
                  <Icon name="bookmark" size={14} />
                </span>
                {saved ? 'Saved' : 'Save connection'}
              </button>
              <Link
                to={projectPath(
                  workspace.id,
                  `sources/${edgeSources[0] ?? nodeDocumentId ?? ''}`,
                )}
                className="btn btn--sm btn--ghost"
              >
                Read the source
                <span className="btn__icon">
                  <Icon name="arrowUpRight" size={13} />
                </span>
              </Link>
            </div>
          </div>
        ) : null}

        {node && !edge ? (
          <div className="detail__section">
            <div className="detail__badges">
              <Badge tone="neutral" dot>
                {nodeCluster?.short ?? 'Idea'}
              </Badge>
              <Badge tone="neutral">{node.mentions} mentions</Badge>
            </div>

            <h2 className="detail__title">{node.label}</h2>
            <p className="detail__prose">{node.definition}</p>

            <div className="detail__stats">
              <div>
                <span className="detail__stat-value mono">{node.documentIds.length}</span>
                <span className="detail__label">Sources</span>
              </div>
              <div>
                <span className="detail__stat-value mono">{nodeLinks.length}</span>
                <span className="detail__label">Connections</span>
              </div>
              <div>
                <span className="detail__stat-value mono">
                  {nodeLinks.filter((link) => link.isBridge).length}
                </span>
                <span className="detail__label">Across topics</span>
              </div>
            </div>

            <div className="detail__block">
              <p className="eyebrow">Found in</p>
              <div className="detail__sources">
                {nodeSources.map((document) => (
                  <DocumentRow key={document.id} documentId={document.id} />
                ))}
              </div>
            </div>

            {nodeEvidence.length > 0 ? (
              <div className="detail__block">
                <p className="eyebrow">Evidence</p>
                <ul className="evidence-list">
                  {nodeEvidence.map((item, index) => {
                    const source = documentById.get(item.documentId);
                    return (
                      <li key={`${item.documentId}-${index}`} className="evidence-item">
                        <blockquote className="evidence-quote">{item.excerpt}</blockquote>
                        <Link
                          to={projectPath(workspace.id, `sources/${item.documentId}`)}
                          className="evidence-source"
                        >
                          {source?.title ?? 'Source document'}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <div className="detail__block">
              <p className="eyebrow">Connected ideas</p>
              <ul className="detail__links">
                {nodeLinks.map((link) => {
                  const otherId = link.from === node.id ? link.to : link.from;
                  const other = conceptById.get(otherId);
                  if (!other) return null;
                  const outgoing = link.from === node.id;
                  return (
                    <li key={link.id}>
                      <button
                        type="button"
                        className="detail__link"
                        onClick={() => onSelectEdge(link.id)}
                      >
                        <span
                          className="dot"
                          style={{ color: clusterById.get(other.clusterId)?.color }}
                        />
                        <span className="detail__link-label">
                          {outgoing ? '' : '↳ '}
                          {other.label}
                        </span>
                        <RelationBadge type={link.type} dot={false} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="detail__actions">
              <Link
                to={projectPath(workspace.id, `sources/${nodeDocumentId ?? ''}`)}
                className="btn btn--sm btn--secondary"
              >
                Open source
                <span className="btn__icon">
                  <Icon name="arrowUpRight" size={13} />
                </span>
              </Link>
            </div>
          </div>
        ) : null}

        {!hasSelection ? (
          <div className="detail__section">
            <h2 className="detail__title">Find the strongest links</h2>
            <p className="detail__prose">
              The most useful lines join two different sources. Select one to see what it means and
              where it came from.
            </p>

            {savedConnections.length > 0 ? (
              <div className="detail__block">
                <div className="spread">
                  <p className="eyebrow">Saved connections</p>
                  <span className="mono detail__value">{savedConnections.length}</span>
                </div>
                <ul className="detail__saved">
                  {savedConnections.map((connection) => {
                    const from = conceptById.get(connection.from);
                    const to = conceptById.get(connection.to);
                    if (!from || !to) return null;
                    return (
                      <li key={connection.id} className="detail__saved-item">
                        <button
                          type="button"
                          className="detail__saved-open"
                          onClick={() => onSelectEdge(connection.id)}
                        >
                          <span className="detail__saved-title">{connection.title}</span>
                          <span className="detail__saved-meta">
                            {from.label} → {to.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="detail__saved-remove"
                          onClick={() => toggleSavedConnection(connection.id)}
                          aria-label={`Remove saved connection ${connection.title}`}
                        >
                          <Icon name="bookmark" size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="detail__saved-note">Saved here for quick return.</p>
              </div>
            ) : null}

            <div className="detail__block">
              <p className="eyebrow">Strongest links across sources</p>
              {topBridges.length > 0 ? (
                <ul className="detail__bridges">
                  {topBridges.map((bridge) => {
                    const from = conceptById.get(bridge.from);
                    const to = conceptById.get(bridge.to);
                    if (!from || !to) return null;
                    return (
                      <li key={bridge.id}>
                        <button
                          type="button"
                          className="detail__bridge"
                          onClick={() => onSelectEdge(bridge.id)}
                        >
                          <span className="detail__bridge-head">
                            <strong>{bridge.title}</strong>
                            <span className="mono">{formatPercent(bridge.confidence)}</span>
                          </span>
                          <span className="detail__bridge-meta">
                            {from.label} · {RELATION_TYPES[bridge.type].label} · {to.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="detail__prose">
                  No connections yet. Add two or more sources and MatrixIQ will look for links
                  between them.
                </p>
              )}
            </div>

            <div className="detail__block">
              <p className="eyebrow">How to explore</p>
              <ul className="detail__tips">
                <li>Select an idea to see its sources and neighbours.</li>
                <li>Select a line to read what it means.</li>
                <li>Filter by topic or connection type in the toolbar.</li>
                <li>Double-click the canvas to zoom in, and again to zoom out.</li>
              </ul>
            </div>

            <div className="detail__summary">
              <div>
                <span className="detail__stat-value mono">{concepts.length}</span>
                <span className="detail__label">Ideas</span>
              </div>
              <div>
                <span className="detail__stat-value mono">{connections.length}</span>
                <span className="detail__label">Connections</span>
              </div>
              <div>
                <span className="detail__stat-value mono">{clusters.length}</span>
                <span className="detail__label">Topics</span>
              </div>
            </div>

            {concepts.length > 0 ? (
              <div className="detail__block">
                <p className="eyebrow">Ideas in view</p>
                <div className="detail__concept-cloud">
                  {concepts.slice(0, 9).map((concept) => (
                    <ConceptTag key={concept.id} conceptId={concept.id} interactive />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
