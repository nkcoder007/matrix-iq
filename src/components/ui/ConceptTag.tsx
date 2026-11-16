import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { projectPath } from '../../lib/paths';

interface ConceptTagProps {
  conceptId: string;
  interactive?: boolean;
}

export function ConceptTag({ conceptId, interactive = false }: ConceptTagProps) {
  const { conceptById, clusterById, workspace } = useKnowledge();
  const concept = conceptById.get(conceptId);
  if (!concept) return null;

  const color = clusterById.get(concept.clusterId)?.color ?? 'var(--text-3)';
  const style = { '--tag-color': color } as CSSProperties;

  if (interactive) {
    return (
      <Link
        to={`${projectPath(workspace.id, 'graph')}?node=${concept.id}`}
        className="tag tag--link"
        style={style}
        title={concept.definition}
      >
        {concept.label}
      </Link>
    );
  }

  return (
    <span className="tag" style={style} title={concept.definition}>
      {concept.label}
    </span>
  );
}
