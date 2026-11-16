import { PageHeader } from '../components/ui/PageHeader';
import { Switch } from '../components/ui/Switch';
import { Badge, RelationBadge } from '../components/ui/Badge';
import { Icon } from '../components/icons';
import { useKnowledge } from '../store/KnowledgeContext';
import { ProjectActions } from '../components/projects/ProjectActions';
import { RELATION_ORDER } from '../lib/relations';
import { downloadJson } from '../lib/format';
import { backendConfig } from '../services/api';

export function SettingsPage() {
  const {
    prefs,
    setPref,
    documents,
    concepts,
    connections,
    insights,
    dismissedIds,
    savedConnectionIds,
    workspace,
    workspaces,
  } = useKnowledge();

  const exportWorkspace = () => {
    downloadJson('matrixiq-project.json', {
      project: { id: workspace.id, name: workspace.name, description: workspace.description },
      exportedAt: new Date().toISOString(),
      documents,
      concepts,
      connections,
      insights,
      dismissedInsightIds: dismissedIds,
      savedConnectionIds,
      preferences: prefs,
    });
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Settings"
        title="Project settings"
        description="These settings apply to the current project. Projects, sources and preferences are saved in this browser. Nothing is sent to a server."
        actions={<Badge tone="neutral">Version 0.1.0</Badge>}
      />

      <div className="settings-grid">
        <section className="settings-card settings-card--wide card">
          <div>
            <h2 className="settings-title">Appearance</h2>
            <p className="settings-sub">Choose how MatrixIQ looks across every page.</p>
          </div>
          <div className="settings-row">
            <Switch
              checked={prefs.theme === 'dark'}
              onChange={(value) => setPref('theme', value ? 'dark' : 'light')}
              label="Dark mode"
              description="Use a darker palette. Your choice is saved in this browser between visits."
            />
          </div>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Graph</h2>
            <p className="settings-sub">How the knowledge graph looks and moves.</p>
          </div>

          <div className="settings-row">
            <Switch
              checked={prefs.showLabels}
              onChange={(value) => setPref('showLabels', value)}
              label="Show idea labels"
              description="Turn off to see the shape of the map without text."
            />
          </div>
          <div className="settings-row">
            <Switch
              checked={prefs.highlightSuggested}
              onChange={(value) => setPref('highlightSuggested', value)}
              label="Highlight suggested connections"
              description="Shows possible links as dashed blue lines."
            />
          </div>
          <div className="settings-row">
            <Switch
              checked={prefs.reduceMotion}
              onChange={(value) => setPref('reduceMotion', value)}
              label="Reduce motion"
              description="Stops the moving dashes on suggested links."
            />
          </div>
          <p className="field__hint">
            Zoom with a double-click on the canvas, or use the controls in the corner.
          </p>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Analysis</h2>
            <p className="settings-sub">What is and is not connected in this build.</p>
          </div>

          <dl className="detail-pairs">
            <div>
              <dt>Source analysis</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Saved source text</dt>
              <dd>This browser</dd>
            </div>
            <div>
              <dt>Cross-project reading</dt>
              <dd>Never</dd>
            </div>
          </dl>

          <div className="settings-note">
            <Icon name="info" size={15} />
            <p>
              New sources keep their original text or file locally and stay queued. Generated
              ideas, connections and insights will appear only when the future analysis service is
              connected.
            </p>
          </div>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Backend connection</h2>
            <p className="settings-sub">Reserved for the future analysis service.</p>
          </div>

          <dl className="detail-pairs">
            <div>
              <dt>Mode</dt>
              <dd>{backendConfig.configured ? 'Remote API configured' : 'Local browser only'}</dd>
            </div>
            <div>
              <dt>API base URL</dt>
              <dd className="mono settings-url">{backendConfig.baseUrl}</dd>
            </div>
            <div>
              <dt>Requests sent</dt>
              <dd>None in this build</dd>
            </div>
          </dl>

          <p className="field__hint">
            Set <code>VITE_API_MODE=remote</code> and <code>VITE_API_BASE_URL</code> to point at a
            backend. The typed client and endpoint contract live in <code>src/services/api.ts</code>{' '}
            and the README.
          </p>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Connection types</h2>
            <p className="settings-sub">Every connection has one type and a direction.</p>
          </div>
          <div className="settings-relations">
            {RELATION_ORDER.map((type) => (
              <RelationBadge key={type} type={type} dot={false} />
            ))}
          </div>
          <p className="field__hint">
            Related To and Similar To read the same both ways. The rest point one way only: “A
            depends on B” does not mean “B depends on A”.
          </p>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Project</h2>
            <p className="settings-sub">The current project. Each one has its own sources and graph.</p>
          </div>

          <dl className="detail-pairs">
            <div>
              <dt>Name</dt>
              <dd>{workspace.name}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{workspace.description}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{documents.length}</dd>
            </div>
            <div>
              <dt>Ideas</dt>
              <dd>{concepts.length}</dd>
            </div>
            <div>
              <dt>Connections</dt>
              <dd>{connections.length}</dd>
            </div>
            <div>
              <dt>Discoveries</dt>
              <dd>{insights.length}</dd>
            </div>
            <div>
              <dt>Projects</dt>
              <dd>{workspaces.length}</dd>
            </div>
          </dl>

          <p className="field__hint">
            Open a different project, or start a new one, from the home page. Sources are never
            shared between projects.
          </p>
          <ProjectActions />
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Data</h2>
            <p className="settings-sub">Export the active project only.</p>
          </div>

          <div className="data-actions">
            <button type="button" className="btn btn--secondary" onClick={exportWorkspace}>
              <span className="btn__icon">
                <Icon name="download" size={15} />
              </span>
              Export project as JSON
            </button>
          </div>
          <p className="field__hint">
            The export contains this project’s sources, ideas, connections, saved links and
            preferences. Rename or delete the project in the Project card above.
          </p>
        </section>

        <section className="settings-card card">
          <div>
            <h2 className="settings-title">Account</h2>
            <p className="settings-sub">Local preview of this build.</p>
          </div>

          <dl className="detail-pairs">
            <div>
              <dt>Owner</dt>
              <dd>Local workspace</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>Private · this browser</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>IndexedDB · saved between visits</dd>
            </div>
          </dl>

          <div className="settings-note">
            <Icon name="info" size={15} />
            <p>
              Projects, sources, dismissals and saved links survive reloads in this browser.
              Accounts, server sync and document analysis are not connected yet.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
