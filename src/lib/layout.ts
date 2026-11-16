/* Deterministic placement for the knowledge graph. */

import type { ClusterId, PositionedConcept, Concept } from '../types';

export const GRAPH_WIDTH = 1040;
export const GRAPH_HEIGHT = 700;

const CLUSTER_ANCHORS: Record<ClusterId, { x: number; y: number; angle: number }> = {
  colonies: { x: 292, y: 198, angle: -90 },
  consensus: { x: 752, y: 190, angle: 90 },
  fermentation: { x: 332, y: 498, angle: -90 },
  resilience: { x: 762, y: 492, angle: 90 },
  sleep: { x: 292, y: 198, angle: -90 },
  traffic: { x: 752, y: 190, angle: 90 },
};

const CLUSTER_RADIUS = 118;

export function nodeRadius(mentions: number): number {
  return Math.round(17 + Math.min(mentions, 16) * 0.95);
}

/** Anchor positions for a given set of clusters, spread across the canvas. */
function anchorsFor(clusterIds: ClusterId[]): Record<string, { x: number; y: number; angle: number }> {
  if (clusterIds.length <= 2) {
    const left = { x: 330, y: 330, angle: -90 };
    const right = { x: 720, y: 330, angle: 90 };
    return Object.fromEntries(clusterIds.map((id, index) => [id, index === 0 ? left : right]));
  }
  return CLUSTER_ANCHORS;
}

export function layoutConcepts(concepts: Concept[]): PositionedConcept[] {
  const groups = new Map<ClusterId, Concept[]>();
  for (const concept of concepts) {
    const group = groups.get(concept.clusterId) ?? [];
    group.push(concept);
    groups.set(concept.clusterId, group);
  }

  const anchors = anchorsFor(Array.from(groups.keys()));
  const positioned: PositionedConcept[] = [];
  const radius = groups.size <= 2 ? 150 : CLUSTER_RADIUS;

  for (const [clusterId, members] of groups) {
    const anchor = anchors[clusterId] ?? { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2, angle: -90 };

    members.forEach((concept, index) => {
      const angle = ((anchor.angle + index * (360 / members.length)) * Math.PI) / 180;
      const distance = radius - (index % 2 === 0 ? 0 : 14);
      positioned.push({
        ...concept,
        x: anchor.x + Math.cos(angle) * distance,
        y: anchor.y + Math.sin(angle) * distance,
        r: nodeRadius(concept.mentions),
      });
    });
  }

  relax(positioned);

  return positioned.map((node) => ({
    ...node,
    x: clamp(node.x, 74, GRAPH_WIDTH - 74),
    y: clamp(node.y, 62, GRAPH_HEIGHT - 62),
  }));
}

function relax(nodes: PositionedConcept[]): void {
  const padding = 38;
  const origins = nodes.map((node) => ({ x: node.x, y: node.y }));

  for (let pass = 0; pass < 90; pass += 1) {
    nodes.forEach((node, index) => {
      node.x += (origins[index].x - node.x) * 0.08;
      node.y += (origins[index].y - node.y) * 0.08;
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        if (distance === 0) {
          dx = 0.01;
          dy = 0.01;
          distance = 0.01;
        }
        const min = a.r + b.r + padding;
        if (distance < min) {
          const push = (min - distance) / 2;
          const nx = dx / distance;
          const ny = dy / distance;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Stable pseudo-random number for deterministic curve direction. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Curved edge between two nodes. Start and end are pulled back by the node
 * radii so arrowheads land on the rim of the target instead of under it.
 */
export function curvedEdgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  id: string,
  endPadding = 0,
  startPadding = 0,
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  const startX = a.x + ux * startPadding;
  const startY = a.y + uy * startPadding;
  const endX = b.x - ux * endPadding;
  const endY = b.y - uy * endPadding;

  const span = Math.hypot(endX - startX, endY - startY) || 1;
  const direction = hashString(id) % 2 === 0 ? 1 : -1;
  const bend = Math.min(46, span * 0.14) * direction;
  const mx = (startX + endX) / 2 - ((endY - startY) / span) * bend;
  const my = (startY + endY) / 2 + ((endX - startX) / span) * bend;

  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

/** Split a label into at most two lines so graph labels stay compact. */
export function wrapLabel(label: string, maxChars = 15): string[] {
  if (label.length <= maxChars) return [label];
  const words = label.split(' ');
  if (words.length === 1) return [label];

  let first = words[0];
  let index = 1;
  while (index < words.length && `${first} ${words[index]}`.length <= maxChars) {
    first += ` ${words[index]}`;
    index += 1;
  }
  const rest = words.slice(index).join(' ');
  return rest ? [first, rest] : [first];
}
