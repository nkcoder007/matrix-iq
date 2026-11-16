import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { DocumentCard } from '../components/documents/DocumentCard';
import { SourceIntake } from '../components/sources/SourceIntake';
import { ProjectAnalysis } from '../components/sources/ProjectAnalysis';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/icons';
import { useKnowledge } from '../store/KnowledgeContext';
import type { DocumentKind } from '../types';

type SortKey = 'recent' | 'title' | 'links';
type KindFilter = 'all' | DocumentKind;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'PDF' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'notes', label: 'Notes' },
];

export function SourcesPage() {
  const { documents, workspace, connectionsForDocument, concepts } = useKnowledge();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  const normalized = query.trim().toLowerCase();
  const visible = documents
    .filter((document) => (kind === 'all' ? true : document.kind === kind))
    .filter(
      (document) =>
        !normalized ||
        document.title.toLowerCase().includes(normalized) ||
        document.subtitle.toLowerCase().includes(normalized) ||
        document.summary.toLowerCase().includes(normalized),
    )
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'links') {
        return connectionsForDocument(b.id).length - connectionsForDocument(a.id).length;
      }
      return b.addedAt.localeCompare(a.addedAt);
    });

  const totalConcepts = concepts.length;
  const queued = documents.filter((document) => document.status === 'queued').length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Sources"
        title={documents.length > 0 ? `${documents.length} sources in ${workspace.name}` : 'Sources'}
        description={
          documents.length > 0
            ? `${totalConcepts} ideas found across these documents. Sources never appear in another project.`
            : 'Upload a document or paste notes to start this project. Everything you add stays inside it.'
        }
        actions={queued > 0 ? <Badge tone="amber">{queued} waiting for analysis</Badge> : undefined}
      />

      <ProjectAnalysis />

      <SourceIntake />

      {documents.length > 0 ? (
        <div className="sources-toolbar">
          <div className="search library-search">
            <Icon name="search" size={14} />
            <input
              className="input"
              type="search"
              placeholder="Search titles and summaries…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search sources in this project"
            />
          </div>

          <div className="chip-row" role="group" aria-label="Filter by source type">
            {KIND_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="chip"
                aria-pressed={kind === filter.id}
                onClick={() => setKind(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="select-wrap">
            <span className="sr-only">Sort sources</span>
            <select
              className="select"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="recent">Newest first</option>
              <option value="title">Title A–Z</option>
              <option value="links">Most connected</option>
            </select>
          </label>
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="doc-grid">
          {visible.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon="library"
            title={documents.length === 0 ? 'No sources yet' : 'No sources match those filters'}
            text={
              documents.length === 0
                ? 'Add your first document above. It will appear here with its ideas once analysed.'
                : 'Try a broader search, or add another document to this project.'
            }
            action={
              documents.length > 0 ? (
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => {
                    setQuery('');
                    setKind('all');
                  }}
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
