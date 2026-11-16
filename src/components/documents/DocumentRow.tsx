import { Link } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { formatShortDate } from '../../lib/format';
import { Icon } from '../icons';
import { DocumentGlyph } from './DocumentGlyph';
import { KIND_LABEL } from './DocumentGlyph';
import { projectPath } from '../../lib/paths';

interface DocumentRowProps {
  documentId: string;
  active?: boolean;
}

export function DocumentRow({ documentId, active = false }: DocumentRowProps) {
  const { documentById, conceptsForDocument, clusterById, workspace } = useKnowledge();
  const document = documentById.get(documentId);
  if (!document) return null;

  const concepts = conceptsForDocument(document.id);
  const cluster = document.clusterId ? clusterById.get(document.clusterId) : undefined;
  const queued = document.status === 'queued';

  return (
    <Link
      to={projectPath(workspace.id, `sources/${document.id}`)}
      className={`doc-row${active ? ' is-active' : ''}`}
    >
      <DocumentGlyph clusterId={document.clusterId} kind={document.kind} size="sm" />
      <span className="doc-row__text">
        <span className="doc-row__title">{document.title}</span>
        <span className="doc-row__meta">
          {KIND_LABEL[document.kind]} ·{' '}
          {queued ? 'Waiting for analysis' : `${concepts.length} ideas`} ·{' '}
          {cluster?.short ?? 'Unsorted'} · {formatShortDate(document.addedAt)}
        </span>
      </span>
      <Icon name="chevronRight" size={15} className="doc-row__chevron" />
    </Link>
  );
}
