import { Link, NavLink, useLocation } from 'react-router-dom';
import { BrandMark, Icon } from '../icons';
import { WORKSPACE } from '../../data/seed';
import { useKnowledge } from '../../store/KnowledgeContext';

interface TopbarProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onOpenMenu, onOpenSearch }: TopbarProps) {
  const { pathname } = useLocation();
  const { workspace } = useKnowledge();

  const label = pathname.endsWith('/graph')
    ? 'Knowledge graph'
    : pathname.includes('/insights')
      ? 'Insights'
      : pathname.includes('/sources/')
        ? 'Source'
        : pathname.endsWith('/sources')
          ? 'Sources'
          : pathname.endsWith('/settings')
            ? 'Settings'
            : 'Overview';

  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn--ghost btn--icon topbar__menu"
        onClick={onOpenMenu}
        aria-label="Open navigation"
      >
        <Icon name="menu" size={18} />
      </button>

      <Link to="/" className="topbar__brand" aria-label="MatrixIQ home">
        <BrandMark size={20} />
        <span>MatrixIQ</span>
      </Link>

      <div className="topbar__crumb" aria-label="Breadcrumb">
        <span>{workspace.name}</span>
        <span className="topbar__crumb-sep">/</span>
        <strong>{label}</strong>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="searchbtn"
          onClick={onOpenSearch}
          aria-label="Search this project"
        >
          <Icon name="search" size={14} />
          <span className="searchbtn__text">Search</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="topbar__site-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `topbar__site-link${isActive ? ' is-active' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `topbar__site-link${isActive ? ' is-active' : ''}`
            }
          >
            About
          </NavLink>
        </nav>

        <span className="avatar topbar__avatar" title={WORKSPACE.owner}>
          {WORKSPACE.initials}
        </span>
      </div>
    </header>
  );
}
