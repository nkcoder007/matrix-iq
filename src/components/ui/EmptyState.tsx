import type { ReactNode } from 'react';
import { Icon } from '../icons';
import type { IconName } from '../icons';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'search', title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={18} />
      </span>
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action}
    </div>
  );
}
