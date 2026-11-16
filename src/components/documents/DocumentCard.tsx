import { Link } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import type { KnowledgeDocument } from '../../types';
import { formatShortDate, pluralize } from '../../lib/format';
import { Icon } from '../icons';
import { Badge } from '../ui/Badge';
import { ConceptTag } from '../ui/ConceptTag';
import { DocumentGlyph } from './DocumentGlyph';
import { projectPath } from '../../lib/paths';

export function DocumentCard({ document }: { document: KnowledgeDocument }) {
  const { conceptsForDocument, connectionsForDocument, clusterById, workspace } = useKnowledge();
  const concepts = conceptsForDocument(document.id);
  const links = connectionsForDocument(document.id);
  const cluster = document.clusterId ? clusterById.get(document.clusterId) : undefined;
  const queued = document.status === 'queued';

  return (
    <Link
      to={projectPath(workspace.id, `sources/${document.id}`)}
      className="doc-card card card--interactive"
    >
      <div className="doc-card__top">
        <DocumentGlyph clusterId={document.clusterId} kind={document.kind} />
        {queued ? (
          <Badge tone="amber" dot>
            Queued
          </Badge>
        ) : (
          <span className="doc-card__cluster">
            <span className="dot" style={{ color: cluster?.color }} />
            {cluster?.short}
          </span>
        )}
      </div>

      <div className="doc-card__body">
        <h3 className="doc-card__title">{document.title}</h3>
        <p className="doc-card__sub">{document.subtitle}</p>
        {document.excerpt ? <p className="doc-card__excerpt">{document.excerpt}</p> : null}
      </div>

      <div className="doc-card__tags">
        {queued ? (
          <span className="tag">Waiting for analysis</span>
        ) : (
          <>
            {concepts.slice(0, 3).map((concept) => (
              <ConceptTag key={concept.id} conceptId={concept.id} />
            ))}
            {concepts.length > 3 ? (
              <span className="tag tag--more">+{concepts.length - 3}</span>
            ) : null}
          </>
        )}
      </div>

      <footer className="doc-card__foot">
        <span>
          {concepts.length} {pluralize(concepts.length, 'idea')}
        </span>
        <span className="doc-card__sep" />
        <span>{links.length} links</span>
        <span className="doc-card__date">{formatShortDate(document.addedAt)}</span>
        <Icon name="arrowUpRight" size={14} className="doc-card__arrow" />
      </footer>
    </Link>
  );
}
