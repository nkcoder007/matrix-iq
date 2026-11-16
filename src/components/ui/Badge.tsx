import type { CSSProperties, ReactNode } from 'react';
import type { RelationType } from '../../types';
import { RELATION_TYPES } from '../../lib/relations';

export type BadgeTone = 'mint' | 'violet' | 'amber' | 'rose' | 'blue' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`badge badge--${tone}${dot ? ' badge--dot' : ''} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/**
 * Relationship category pill. Colour comes from the category metadata so the
 * graph, badges and legend always agree.
 */
export function RelationBadge({ type, dot = true }: { type: RelationType; dot?: boolean }) {
  const meta = RELATION_TYPES[type];
  const style = { '--rel-color': meta.color } as CSSProperties;

  return (
    <span
      className={`badge badge--relation${dot ? ' badge--dot' : ''}`}
      style={style}
      title={meta.description}
    >
      {meta.label}
      {meta.directional ? (
        <span className="badge__dir" aria-hidden="true">
          →
        </span>
      ) : null}
    </span>
  );
}
