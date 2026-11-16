import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';
import { NewProjectModal } from '../components/projects/NewProjectModal';
import { SiteHeader } from '../components/layout/SiteHeader';
import { useKnowledge } from '../store/KnowledgeContext';
import { projectPath } from '../lib/paths';
import { backendConfig } from '../services/api';

export function HomePage() {
  const { workspaces } = useKnowledge();
  const [creating, setCreating] = useState(false);

  return (
    <div className="home home--landing">
      <SiteHeader />

      <main className="home__main">
        <section className="home__hero">
          <p className="eyebrow">Connected reading</p>
          <h1 className="home__title">See what your documents have in common.</h1>
          <p className="home__lede">
            MatrixIQ turns your sources into a clear map of ideas. Add documents, notes or pasted
            text, and see where ideas connect, where sources disagree, and what still needs
            exploring.
          </p>
        </section>

        <section className="home__projects" id="projects" aria-labelledby="projects-title">
          <div className="home__section-head">
            <div>
              <h2 id="projects-title" className="home__h2">
                Your projects
              </h2>
              <p className="home__sub">
                Choose a project to open it. Sources never move between projects.
              </p>
            </div>
          </div>

          <div className="project-grid">
            {workspaces.map((project) => (
              <Link key={project.id} to={projectPath(project.id)} className="project-card">
                <span
                  className="project-card__badge"
                  style={{ background: project.color }}
                  aria-hidden="true"
                >
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="project-card__body">
                  <span className="project-card__name">{project.name}</span>
                  <span className="project-card__desc">{project.description}</span>
                  <span className="project-card__meta">
                    {project.id === 'ws-atlas' ? 'Sample project · ' : ''}
                    {project.documentIds.length}{' '}
                    {project.documentIds.length === 1 ? 'source' : 'sources'}
                  </span>
                </span>
                <span className="project-card__open">
                  Open
                  <Icon name="arrowRight" size={14} />
                </span>
              </Link>
            ))}

            <button
              type="button"
              className="project-card project-card--new"
              onClick={() => setCreating(true)}
            >
              <span className="project-card__plus">
                <Icon name="plus" size={18} />
              </span>
              <span className="project-card__body">
                <span className="project-card__name">New project</span>
                <span className="project-card__desc">
                  Start empty, or include the sample sources to see how a finished map looks.
                </span>
              </span>
            </button>
          </div>
        </section>

        <footer className="home__foot">
          <Icon name="info" size={14} />
          <span>
            {backendConfig.configured
              ? 'Local projects and preferences stay in this browser. Uploaded sources are sent only to the temporary backend session.'
              : 'Projects, sources and discoveries are saved in this browser. Nothing is sent to a server.'}
          </span>
        </footer>
      </main>

      <NewProjectModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
