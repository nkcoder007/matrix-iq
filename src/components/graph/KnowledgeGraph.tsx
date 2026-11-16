import { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  ClusterId,
  Concept,
  Connection,
  PositionedConcept,
  RelationType,
} from '../../types';
import {
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  clamp,
  curvedEdgePath,
  layoutConcepts,
  wrapLabel,
} from '../../lib/layout';
import { RELATION_TYPES } from '../../lib/relations';
import { useKnowledge } from '../../store/KnowledgeContext';
import { Icon } from '../icons';
import { GraphLegend } from './GraphLegend';
import { projectPath } from '../../lib/paths';

interface KnowledgeGraphProps {
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  activeClusters: ClusterId[];
  relationFilter: RelationType | 'all';
  query: string;
  onSelectEdge: (id: string | null) => void;
  onSelectNode: (id: string | null) => void;
}

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.6;
const ZOOM_STEP = 1.6;

export function KnowledgeGraph({
  selectedEdgeId,
  selectedNodeId,
  activeClusters,
  relationFilter,
  query,
  onSelectEdge,
  onSelectNode,
}: KnowledgeGraphProps) {
  const { concepts, connections, clusterById, prefs, workspace } = useKnowledge();

  const nodes = useMemo(() => layoutConcepts(concepts), [concepts]);
  const nodeMap = useMemo(
    () => new Map<string, PositionedConcept>(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const movedRef = useRef(false);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const activeClusterSet = useMemo(() => new Set(activeClusters), [activeClusters]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingIds = useMemo(() => {
    if (!normalizedQuery) return null;
    return new Set(
      concepts
        .filter(
          (concept) =>
            concept.label.toLowerCase().includes(normalizedQuery) ||
            concept.definition.toLowerCase().includes(normalizedQuery),
        )
        .map((concept) => concept.id),
    );
  }, [concepts, normalizedQuery]);

  const selectedEdge = useMemo(
    () => connections.find((edge) => edge.id === selectedEdgeId) ?? null,
    [connections, selectedEdgeId],
  );

  const focusIds = useMemo(() => {
    if (selectedEdge) return new Set([selectedEdge.from, selectedEdge.to]);
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    connections.forEach((edge) => {
      if (edge.from === selectedNodeId) ids.add(edge.to);
      if (edge.to === selectedNodeId) ids.add(edge.from);
    });
    return ids;
  }, [selectedEdge, selectedNodeId, connections]);

  const isNodeHidden = useCallback(
    (concept: Concept) => !activeClusterSet.has(concept.clusterId),
    [activeClusterSet],
  );

  const isNodeDimmed = useCallback(
    (concept: Concept) => {
      if (matchingIds && !matchingIds.has(concept.id)) return true;
      if (focusIds) return !focusIds.has(concept.id);
      return false;
    },
    [matchingIds, focusIds],
  );

  const isEdgeDimmed = useCallback(
    (edge: Connection, from: Concept, to: Concept) => {
      if (matchingIds && !matchingIds.has(from.id) && !matchingIds.has(to.id)) return true;
      if (selectedEdge) return edge.id !== selectedEdge.id;
      if (focusIds) return !focusIds.has(edge.from) && !focusIds.has(edge.to);
      return false;
    },
    [matchingIds, selectedEdge, focusIds],
  );

  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / GRAPH_WIDTH, rect.height / GRAPH_HEIGHT) || 1;
    const offsetX = (rect.width - GRAPH_WIDTH * scale) / 2;
    const offsetY = (rect.height - GRAPH_HEIGHT * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }, []);

  const zoomBy = (factor: number) => {
    setView((current) => {
      const nextZoom = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM);
      const cx = GRAPH_WIDTH / 2;
      const cy = GRAPH_HEIGHT / 2;
      return {
        k: nextZoom,
        x: cx - (nextZoom / current.k) * (cx - current.x),
        y: cy - (nextZoom / current.k) * (cy - current.y),
      };
    });
  };

  /**
   * Double-click zooms toward the pointer, then back out to the full view.
   * This lives on the SVG rather than the background rect: pointer capture and
   * node/edge clicks retarget the dblclick, so a rect-only handler misses real
   * gestures across much of the canvas.
   */
  const handleDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = toViewBox(event.clientX, event.clientY);

    setView((current) => {
      if (current.k > 1.05) return { x: 0, y: 0, k: 1 };
      const nextZoom = clamp(current.k * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
      return {
        k: nextZoom,
        x: point.x - (nextZoom / current.k) * (point.x - current.x),
        y: point.y - (nextZoom / current.k) * (point.y - current.y),
      };
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const point = toViewBox(event.clientX, event.clientY);
    movedRef.current = false;
    panRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: view.x,
      originY: view.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const point = toViewBox(event.clientX, event.clientY);
    if (Math.hypot(point.x - pan.startX, point.y - pan.startY) > 3) {
      movedRef.current = true;
    }
    setView((current) => ({
      ...current,
      x: clamp(pan.originX + point.x - pan.startX, -380, 380),
      y: clamp(pan.originY + point.y - pan.startY, -240, 240),
    }));
  };

  const endPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clearSelection = () => {
    onSelectEdge(null);
    onSelectNode(null);
  };

  const orderedEdges = useMemo(() => {
    return [...connections].sort((a, b) => {
      if (a.id === selectedEdgeId) return 1;
      if (b.id === selectedEdgeId) return -1;
      return 0;
    });
  }, [connections, selectedEdgeId]);

  const directionalTypes = useMemo(
    () => (Object.keys(RELATION_TYPES) as RelationType[]).filter(
      (type) => RELATION_TYPES[type].directional,
    ),
    [],
  );

  return (
    <div className="kg">
      <div className="kg-wrap">
        <svg
          ref={svgRef}
          className={`kg-svg${isPanning ? ' is-panning' : ''}${prefs.reduceMotion ? ' is-static' : ''}`}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          role="group"
          aria-label="Knowledge graph. Use Tab to move between concepts and connections."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onDoubleClick={handleDoubleClick}
        >
          <defs>
            <radialGradient id="kg-vignette" cx="50%" cy="45%" r="62%">
                              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>
            {directionalTypes.map((type) => (
              <marker
                key={type}
                id={`kg-arrow-${type}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="9"
                markerHeight="9"
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
              </marker>
            ))}
          </defs>

          <rect
            className="kg-bg"
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            fill="url(#kg-vignette)"
            onClick={() => {
              if (!movedRef.current) clearSelection();
            }}
          />

          <g className="kg-stage" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <g className="kg-edges">
              {orderedEdges.map((edge) => {
                if (relationFilter !== 'all' && edge.type !== relationFilter) return null;

                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                if (!activeClusterSet.has(from.clusterId) || !activeClusterSet.has(to.clusterId)) {
                  return null;
                }

                const meta = RELATION_TYPES[edge.type];
                const active = edge.id === selectedEdgeId;
                const dimmed = isEdgeDimmed(edge, from, to);
                const suggested = Boolean(edge.suggested) && prefs.highlightSuggested;
                const color = active || suggested ? 'var(--accent)' : '#94a3b8';
                const path = curvedEdgePath(
                  from,
                  to,
                  edge.id,
                  to.r + (meta.directional ? 12 : 4),
                  from.r + 4,
                );

                return (
                  <g
                    key={edge.id}
                    className={`kg-edge-group${active ? ' is-active' : ''}${dimmed ? ' is-dim' : ''}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${from.label} ${meta.label} ${to.label}: ${edge.title}. ${Math.round(edge.confidence * 100)} percent match.`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectNode(null);
                      onSelectEdge(active ? null : edge.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectNode(null);
                        onSelectEdge(active ? null : edge.id);
                      }
                    }}
                  >
                    <path className="kg-edge-hit" d={path} />
                    <path
                      className={`kg-edge${suggested ? ' kg-edge--suggested' : ''}`}
                      d={path}
                      style={{ stroke: color }}
                      markerEnd={meta.directional ? `url(#kg-arrow-${edge.type})` : undefined}
                    />
                    {active ? (
                      <path className="kg-edge-glow" d={path} style={{ stroke: color }} />
                    ) : null}
                  </g>
                );
              })}
            </g>

            <g className="kg-nodes">
              {nodes.map((node) => {
                if (isNodeHidden(node)) return null;
                const cluster = clusterById.get(node.clusterId);
                const color = cluster?.color ?? 'var(--mint)';
                const active = node.id === selectedNodeId;
                const dimmed = isNodeDimmed(node);
                const labelLines = wrapLabel(node.label);

                return (
                  <g
                    key={node.id}
                    className={`kg-node${active ? ' is-active' : ''}${dimmed ? ' is-dim' : ''}`}
                    transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.label}, ${cluster?.label ?? ''}. ${node.documentIds.length} sources, ${node.mentions} mentions.`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectEdge(null);
                      onSelectNode(active ? null : node.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectEdge(null);
                        onSelectNode(active ? null : node.id);
                      }
                    }}
                  >
                    <title>{node.label}</title>
                    <circle className="kg-node__halo" r={node.r + 13} fill={color} />
                    <circle
                      className="kg-node__disc"
                      r={node.r}
                      fill={color}
                      fillOpacity={0.14}
                      stroke={color}
                      strokeOpacity={0.55}
                      strokeWidth={1.4}
                    />
                    <circle className="kg-node__dot" r={3.4} fill={color} />
                    {prefs.showLabels
                      ? labelLines.map((line, index) => (
                          <text
                            key={line}
                            className="kg-label"
                            x={0}
                            y={node.r + 17 + index * 15}
                          >
                            {line}
                          </text>
                        ))
                      : null}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {concepts.length === 0 ? (
          <div className="kg-empty">
            <span className="kg-empty__icon">
              <Icon name="graph" size={20} />
            </span>
            <p className="kg-empty__title">No ideas in this project yet</p>
            <p className="kg-empty__text">
              This graph starts empty because sources are never shared between projects. Add a few
              sources and their ideas will appear here.
            </p>
            <Link
              to={projectPath(workspace.id, 'sources')}
              className="btn btn--sm btn--secondary"
            >
              Add sources
            </Link>
          </div>
        ) : null}

        <div className="kg-stats mono">
                      {concepts.length} ideas · {connections.length} connections
        </div>

        <div className="kg-controls">
          <button
            type="button"
            className="kg-control"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.2)}
          >
            <Icon name="zoomIn" size={16} />
          </button>
          <button
            type="button"
            className="kg-control"
            aria-label="Zoom out"
            onClick={() => zoomBy(0.83)}
          >
            <Icon name="zoomOut" size={16} />
          </button>
          <button
            type="button"
            className="kg-control"
            aria-label="Reset view"
            onClick={() => setView({ x: 0, y: 0, k: 1 })}
          >
            <Icon name="reset" size={16} />
          </button>
        </div>

        <p className="kg-hint">Double-click to zoom · drag to pan · click a line to read it</p>
      </div>

      {concepts.length > 0 ? <GraphLegend /> : null}
    </div>
  );
}
