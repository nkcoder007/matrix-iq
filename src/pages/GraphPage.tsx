import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { DetailPanel } from '../components/graph/DetailPanel';
import { Icon } from '../components/icons';
import { useKnowledge } from '../store/KnowledgeContext';
import { RELATION_ORDER, RELATION_TYPES } from '../lib/relations';
import type { ClusterId, RelationType } from '../types';

export function GraphPage() {
  const {
    clusters,
    concepts,
    connections,
    conceptById,
    workspace,
  } = useKnowledge();

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState<RelationType | 'all'>('all');
  const [activeClusters, setActiveClusters] = useState<ClusterId[]>(
    clusters.map((cluster) => cluster.id),
  );

  const selectedEdgeId = searchParams.get('edge');
  const selectedNodeId = searchParams.get('node');

  const setSelection = (key: 'edge' | 'node', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.delete('edge');
    next.delete('node');
    if (value) next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const toggleCluster = (id: ClusterId) => {
    setActiveClusters((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((clusterId) => clusterId !== id);
      }
      return [...current, id];
    });
  };

  const allActive = clusters.length > 0 && activeClusters.length === clusters.length;
  const crossDocument = connections.filter((connection) => {
    const from = conceptById.get(connection.from);
    const to = conceptById.get(connection.to);
    if (!from || !to) return false;
    return from.documentIds.every((documentId) => !to.documentIds.includes(documentId));
  }).length;

  return (
    <div className="page graph-page">
      <PageHeader
        eyebrow="Knowledge graph"
        title={
          concepts.length > 0 ? 'How your ideas connect' : 'Nothing mapped in this project yet'
        }
        description={
          concepts.length > 0
            ? `${concepts.length} ideas and ${connections.length} connections from ${workspace.name}, including ${crossDocument} links between different sources. Select any line to read why.`
            : `Sources from ${workspace.name} will appear here once they have been analysed.`
        }
      />

      {concepts.length > 0 ? (
      <div className="graph-toolbar">
        <div className="search graph-search">
          <Icon name="search" size={14} />
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an idea…"
            aria-label="Filter ideas in the graph"
          />
          {query ? (
            <button
              type="button"
              className="graph-search__clear"
              onClick={() => setQuery('')}
              aria-label="Clear idea filter"
            >
              <Icon name="close" size={12} />
            </button>
          ) : null}
        </div>

        {clusters.length > 0 ? (
          <div className="chip-row" role="group" aria-label="Filter topics">
            <button
              type="button"
              className="chip chip--sm"
              aria-pressed={allActive}
              onClick={() => setActiveClusters(clusters.map((cluster) => cluster.id))}
            >
              All topics
            </button>
            {clusters.map((cluster) => (
              <button
                key={cluster.id}
                type="button"
                className="chip chip--sm"
                aria-pressed={activeClusters.includes(cluster.id)}
                onClick={() => toggleCluster(cluster.id)}
              >
                <span className="chip__dot" style={{ background: cluster.color }} />
                {cluster.short}
              </button>
            ))}
          </div>
        ) : null}

        <label className="select-wrap graph-relation">
                        <span className="sr-only">Filter by connection type</span>
          <select
            className="select"
            value={relationFilter}
            onChange={(event) => setRelationFilter(event.target.value as RelationType | 'all')}
          >
            <option value="all">All connection types</option>
            {RELATION_ORDER.map((type) => (
              <option key={type} value={type}>
                {RELATION_TYPES[type].label}
                {RELATION_TYPES[type].directional ? ' →' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      ) : null}

      <div className="graph-layout">
        <KnowledgeGraph
          selectedEdgeId={selectedEdgeId}
          selectedNodeId={selectedNodeId}
          activeClusters={activeClusters}
          relationFilter={relationFilter}
          query={query}
          onSelectEdge={(id) => setSelection('edge', id)}
          onSelectNode={(id) => setSelection('node', id)}
        />
        <DetailPanel
          selectedEdgeId={selectedEdgeId}
          selectedNodeId={selectedNodeId}
          onSelectEdge={(id) => setSelection('edge', id)}
          onSelectNode={(id) => setSelection('node', id)}
          onClose={() => setSelection('edge', null)}
        />
      </div>
    </div>
  );
}
