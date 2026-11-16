import type { CSSProperties } from 'react';
import { useKnowledge } from '../../store/KnowledgeContext';
import type { ClusterId, DocumentKind } from '../../types';

const KIND_LABEL: Record<DocumentKind, string> = {
  pdf: 'PDF',
  markdown: 'Markdown',
  notes: 'Notes',
  web: 'Web',
};

interface DocumentGlyphProps {
  clusterId?: ClusterId;
  kind: DocumentKind;
  size?: 'sm' | 'md' | 'lg';
}

export function DocumentGlyph({ clusterId, kind, size = 'md' }: DocumentGlyphProps) {
  const { clusterById } = useKnowledge();
  const color = clusterId
    ? (clusterById.get(clusterId)?.color ?? 'var(--text-3)')
    : 'var(--text-3)';
  const style = { '--glyph-color': color } as CSSProperties;

  return (
    <span className={`glyph glyph--${size}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="glyph__art">
        <g stroke="currentColor" fill="none">
          <circle cx="24" cy="24" r="15.5" opacity="0.22" />
          <circle cx="24" cy="24" r="9" opacity="0.4" />
          <path d="M24 8.5v31M8.5 24h31" opacity="0.1" strokeWidth="0.8" />
          <path d="M15 15l18 18" opacity="0.13" strokeWidth="0.8" />
        </g>
        <circle cx="24" cy="24" r="2.6" fill="currentColor" opacity="0.9" />
        <circle cx="35" cy="17" r="1.8" fill="currentColor" opacity="0.6" />
        <circle cx="17" cy="33" r="1.4" fill="currentColor" opacity="0.45" />
      </svg>
      <span className="glyph__kind">{KIND_LABEL[kind]}</span>
    </span>
  );
}

export { KIND_LABEL };
