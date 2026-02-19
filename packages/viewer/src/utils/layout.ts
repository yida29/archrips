import dagre from '@dagrejs/dagre';

interface LayoutNode {
  id: string;
  width: number;
  height: number;
  layer?: number;
  category?: string;
}

interface LayoutEdge {
  source: string;
  target: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const GROUP_NODE_WIDTH = 200;
const GROUP_NODE_HEIGHT = 90;
const RANK_SEP = 160;
const NODE_SEP = 40;

// Concentric layout constants
const RING_SPACING = 250;
const MIN_ARC_SPACING = 200;

/**
 * Compute layout positions for a set of nodes and edges.
 * Ported from packages/cli/src/utils/layout.ts for use in the viewer
 * when depth-filtered graphs need re-layout after merging.
 */
export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  layoutType: 'dagre' | 'concentric',
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  if (layoutType === 'concentric') {
    return computeConcentricLayout(nodes, edges);
  }
  return computeDagreLayout(nodes, edges);
}

function computeDagreLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width,
      height: node.height,
      rank: node.layer,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const result = new Map<string, { x: number; y: number }>();
  for (const nodeId of g.nodes()) {
    const n = g.node(nodeId);
    if (n) {
      const layoutNode = nodes.find((ln) => ln.id === nodeId);
      const w = layoutNode?.width ?? NODE_WIDTH;
      const h = layoutNode?.height ?? NODE_HEIGHT;
      result.set(nodeId, { x: n.x - w / 2, y: n.y - h / 2 });
    }
  }

  return result;
}

function buildAdjacencyMap(edges: LayoutEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    let srcSet = adj.get(edge.source);
    if (!srcSet) {
      srcSet = new Set();
      adj.set(edge.source, srcSet);
    }
    srcSet.add(edge.target);

    let tgtSet = adj.get(edge.target);
    if (!tgtSet) {
      tgtSet = new Set();
      adj.set(edge.target, tgtSet);
    }
    tgtSet.add(edge.source);
  }
  return adj;
}

function circularMean(angles: number[]): number {
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    sinSum += Math.sin(a);
    cosSum += Math.cos(a);
  }
  return Math.atan2(sinSum / angles.length, cosSum / angles.length);
}

/**
 * Category-based ring priority for concentric layout.
 * Lower number = closer to center (domain core).
 */
const CATEGORY_RING_PRIORITY: Record<string, number> = {
  model: 0,
  service: 1,
  dto: 2,
  port: 3,
  controller: 4,
  adapter: 5,
  database: 6,
  job: 7,
  external: 8,
};

const DEFAULT_RING_PRIORITY = 4;

function computeRingKey(category: string, layer: number): number {
  const priority = CATEGORY_RING_PRIORITY[category] ?? DEFAULT_RING_PRIORITY;
  return priority * 1000 - layer;
}

function computeConcentricLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  // Group nodes by ring key (category-aware)
  const ringGroups = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const ringKey = computeRingKey(node.category ?? '', node.layer ?? 0);
    const group = ringGroups.get(ringKey);
    if (group) {
      group.push(node);
    } else {
      ringGroups.set(ringKey, [node]);
    }
  }

  // Sort ring keys ascending: lowest key = ring 0 (center)
  const sortedRingKeys = [...ringGroups.keys()].sort((a, b) => a - b);

  const adjacency = buildAdjacencyMap(edges);
  const placedAngles = new Map<string, number>();
  let prevRingRadius = 0;

  for (let ringIndex = 0; ringIndex < sortedRingKeys.length; ringIndex++) {
    const ringKey = sortedRingKeys[ringIndex]!;
    const ringNodes = ringGroups.get(ringKey)!;
    const count = ringNodes.length;

    if (ringIndex === 0 && count === 1) {
      const node = ringNodes[0]!;
      placedAngles.set(node.id, 0);
      result.set(node.id, { x: -node.width / 2, y: -node.height / 2 });
      continue;
    }

    // Compute target angle for each node based on placed neighbors
    const withAngle: { node: LayoutNode; targetAngle: number }[] = [];
    const withoutAngle: LayoutNode[] = [];

    for (const node of ringNodes) {
      const neighbors = adjacency.get(node.id);
      if (!neighbors) {
        withoutAngle.push(node);
        continue;
      }

      const placedNeighborAngles: number[] = [];
      for (const n of neighbors) {
        const angle = placedAngles.get(n);
        if (angle !== undefined) {
          placedNeighborAngles.push(angle);
        }
      }

      if (placedNeighborAngles.length === 0) {
        withoutAngle.push(node);
      } else {
        withAngle.push({ node, targetAngle: circularMean(placedNeighborAngles) });
      }
    }

    withAngle.sort((a, b) => a.targetAngle - b.targetAngle);
    const sorted = [...withAngle.map((n) => n.node), ...withoutAngle];

    const baseRadius = Math.max(ringIndex * RING_SPACING, RING_SPACING / 2);
    const circumference = count * MIN_ARC_SPACING;
    const minRadius = circumference / (2 * Math.PI);
    // Ensure monotonically increasing: each ring must be outside the previous one
    const ringRadius = Math.max(minRadius, baseRadius, prevRingRadius + RING_SPACING / 2);
    prevRingRadius = ringRadius;

    const angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const node = sorted[i]!;
      placedAngles.set(node.id, angle);

      const x = ringRadius * Math.cos(angle);
      const y = ringRadius * Math.sin(angle);

      result.set(node.id, { x: x - node.width / 2, y: y - node.height / 2 });
    }
  }

  return result;
}

export { NODE_WIDTH, NODE_HEIGHT, GROUP_NODE_WIDTH, GROUP_NODE_HEIGHT };
