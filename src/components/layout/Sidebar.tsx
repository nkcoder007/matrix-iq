import { Link, NavLink } from 'react-router-dom';
import { useKnowledge } from '../../store/KnowledgeContext';
import { WORKSPACE } from '../../data/seed';
import { projectPath } from '../../lib/paths';
import { BrandMark, Icon } from '../icons';
import type { IconName } from '../icons';

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { documents, activeInsights, connections, workspace } = useKnowledge();
  const base = projectPath(workspace.id);

  const items: { to: string; label: string; icon: IconName; end?: boolean; count?: number }[] = [
    { to: base, label: 'Overview', icon: 'overview', end: true },
    { to: projectPath(workspace.id, 'graph'), label: 'Knowledge graph', icon: 'graph', count: connections.length },
    {
      to: projectPath(workspace.id, 'insights'),
      label: 'Insights',
      icon: 'sparkles',
      count: activeInsights.length,
    },
    { to: projectPath(workspace.id, 'sources'), label: 'Sources', icon: 'library', count: documents.length },
    { to: projectPath(workspace.id, 'settings'), label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className={`side${open ? ' is-open' : ''}`}>
      <Link to="/" className="side__brand" onClick={onNavigate} aria-label="MatrixIQ home">
        <span className="side__brandmark">
          <BrandMark />
        </span>
        <span>
          <span className="side__name">MatrixIQ</span>
          <span className="side__tagline"> Knowledge, connected</span>
        </span>
      </Link>

      <div className="side__project">
        <span className="side__project-badge" style={{ background: workspace.color }}>
          {workspace.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="side__project-text">
          <span className="side__project-name">{workspace.name}</span>
          <span className="side__project-meta">
            {workspace.documentIds.length}{' '}
            {workspace.documentIds.length === 1 ? 'source' : 'sources'}
          </span>
        </span>
      </div>

      <nav className="side__nav" aria-label="Project">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `side__link${isActive ? ' is-active' : ''}`}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
            {typeof item.count === 'number' && item.count > 0 ? (
              <span className="side__count">{item.count}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="side__foot">
        <div className="side__account">
          <span className="avatar">{WORKSPACE.initials}</span>
          <span className="side__account-text">
            <span className="side__account-name">{WORKSPACE.owner}</span>
            <span className="side__account-plan">Local workspace</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
