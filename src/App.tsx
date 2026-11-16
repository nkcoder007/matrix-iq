import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { ProjectLayout } from './components/layout/ProjectLayout';
import { KnowledgeProvider, useKnowledge } from './store/KnowledgeContext';
import { Dashboard } from './pages/Dashboard';
import { DocumentPage } from './pages/DocumentPage';
import { AboutPage } from './pages/AboutPage';
import { GraphPage } from './pages/GraphPage';
import { HomePage } from './pages/HomePage';
import { InsightsPage } from './pages/InsightsPage';
import { NotFound } from './pages/NotFound';
import { SettingsPage } from './pages/SettingsPage';
import { SourcesPage } from './pages/SourcesPage';
import { projectPath } from './lib/paths';

/** Keeps old bookmarks working by resolving them inside the active project. */
function LegacyRedirect({ page }: { page: string }) {
  const { workspace } = useKnowledge();
  const { search } = useLocation();
  return <Navigate to={`${projectPath(workspace.id, page)}${search}`} replace />;
}

function LegacySourceRedirect() {
  const { workspace } = useKnowledge();
  return <Navigate to={projectPath(workspace.id, 'sources')} replace />;
}

function LegacyDocumentRedirect() {
  const { workspace } = useKnowledge();
  const { docId } = useParams();
  return <Navigate to={projectPath(workspace.id, `sources/${docId ?? ''}`)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <KnowledgeProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route path="/p/:projectId" element={<ProjectLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="insights/:category" element={<InsightsPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="sources/:docId" element={<DocumentPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/graph" element={<LegacyRedirect page="graph" />} />
          <Route path="/insights" element={<LegacyRedirect page="insights" />} />
          <Route path="/library" element={<LegacyRedirect page="sources" />} />
          <Route path="/library/:docId" element={<LegacyDocumentRedirect />} />
          <Route path="/sources/new" element={<LegacySourceRedirect />} />
          <Route path="/settings" element={<LegacyRedirect page="settings" />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </KnowledgeProvider>
    </BrowserRouter>
  );
}
