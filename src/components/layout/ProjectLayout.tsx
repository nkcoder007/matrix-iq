import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SearchOverlay } from '../search/SearchOverlay';
import { useKnowledge } from '../../store/KnowledgeContext';

/**
 * The project workspace. The URL owns the project id, so two tabs can sit in
 * different projects and every link stays inside its own sources.
 */
export function ProjectLayout() {
  const { projectId } = useParams();
  const { pathname } = useLocation();
  const { workspace, workspaces, switchWorkspace } = useKnowledge();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const projectExists = workspaces.some((item) => item.id === projectId);

  // Adopt the URL's project before the browser paints, so no other project's
  // sources are ever visible for a frame.
  useLayoutEffect(() => {
    if (projectId && projectExists && workspace.id !== projectId) {
      switchWorkspace(projectId);
    }
  }, [projectId, projectExists, workspace.id, switchWorkspace]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  if (!projectExists) return <Navigate to="/" replace />;

  // Wait for the provider to adopt this URL's project before rendering its data.
  if (workspace.id !== projectId) return null;

  const wide = pathname.endsWith('/graph');

  return (
    <div className="app">
      <Sidebar open={menuOpen} onNavigate={closeMenu} />
      {menuOpen ? (
        <button
          type="button"
          className="scrim"
          onClick={closeMenu}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="app__main">
        <Topbar onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main className={`app__content${wide ? ' app__content--wide' : ''}`}>
          <Outlet />
        </main>
      </div>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
