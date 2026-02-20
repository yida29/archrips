import dagre from '@dagrejs/dagre';
import type { ArchitectureData } from './validate.js';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const RANK_SEP = 160;
const NODE_SEP = 40;

// Concentric layout constants
const RING_SPACING = 250;
const MIN_ARC_SPACING = 200;

/**
 * Compute node positions using the layout algorithm specified by project.layout.
 * Defaults to dagre (top-to-bottom) if not specified.
 */
export function computeLayout(data: ArchitectureData): LayoutResult {
  if (data.project.layout === 'concentric') {
    return computeConcentricLayout(data);
  }
  return computeDagreLayout(data);
}

/**
 * Dagre auto-layout (top-to-bottom).
 * Uses the `layer` field as dagre rank to control vertical positioning.
 */
function computeDagreLayout(data: ArchitectureData): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with layer as rank
  for (const node of data.nodes) {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      rank: node.layer,
    });
  }

  // Add edges
  for (const edge of data.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const nodes: LayoutNode[] = [];
  for (const nodeId of g.nodes()) {
    const n = g.node(nodeId);
    if (n) {
      nodes.push({
        id: nodeId,
        x: n.x - NODE_WIDTH / 2,
        y: n.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }

  return { nodes };
}

/**
 * Build a bidirectional adjacency map from edges.
 * Returns a Map where each node ID maps to the set of IDs it's connected to.
 */
function buildAdjacencyMap(
  edges: ArchitectureData['edges'],
): Map<string, Set<string>> {
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

/**
 * Compute the circular mean of a set of angles (in radians).
 * Uses atan2-based averaging to handle wrap-around correctly.
 */
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
 * This ensures correct ring placement even when LLMs assign incorrect layer numbers.
 */
const CATEGORY_RING_PRIORITY: Record<string, number> = {
  entity: 0,
  service: 1,
  dto: 2,
  port: 3,
  controller: 4,
  adapter: 5,
  database: 6,
  infrastructure: 7,
  job: 8,
  external: 9,
};

const DEFAULT_RING_PRIORITY = 4; // unknown categories treated as controller-level

/**
 * Compute the ring key for a node. Combines category priority (primary)
 * with inverted layer (secondary) so that within the same category priority,
 * higher layers are still placed closer to center.
 */
function computeRingKey(category: string, layer: number): number {
  const priority = CATEGORY_RING_PRIORITY[category] ?? DEFAULT_RING_PRIORITY;
  // Encode: priority * 1000 - layer (so higher layers within same priority → lower key → closer to center)
  return priority * 1000 - layer;
}

/**
 * Concentric (onion) layout for DDD/Clean Architecture.
 * Uses category semantics as the primary ring assignment:
 * entity/domain at center, external/adapter on outer rings.
 * Layer values serve as secondary sort within the same category ring.
 *
 * Nodes within each ring are ordered using barycenter heuristic:
 * each node is assigned a target angle based on the circular mean
 * of its already-placed neighbors' angles, then sorted by that angle.
 * This reduces edge crossings by placing connected nodes closer together.
 */
function computeConcentricLayout(data: ArchitectureData): LayoutResult {
  if (data.nodes.length === 0) {
    return { nodes: [] };
  }

  // Group nodes by ring key (category-aware)
  const ringGroups = new Map<number, string[]>();
  const nodeRingKeys = new Map<string, number>();
  for (const node of data.nodes) {
    const ringKey = computeRingKey(node.category, node.layer);
    nodeRingKeys.set(node.id, ringKey);
    const group = ringGroups.get(ringKey);
    if (group) {
      group.push(node.id);
    } else {
      ringGroups.set(ringKey, [node.id]);
    }
  }

  // Sort ring keys ascending: lowest key = ring 0 (center)
  const sortedRingKeys = [...ringGroups.keys()].sort((a, b) => a - b);

  // Build adjacency map for edge-aware ordering
  const adjacency = buildAdjacencyMap(data.edges);

  const nodes: LayoutNode[] = [];
  const placedAngles = new Map<string, number>();
  let prevRingRadius = 0;

  for (let ringIndex = 0; ringIndex < sortedRingKeys.length; ringIndex++) {
    const ringKey = sortedRingKeys[ringIndex]!;
    const nodeIds = ringGroups.get(ringKey)!;
    const count = nodeIds.length;

    if (ringIndex === 0 && count === 1) {
      // Single center node at origin
      placedAngles.set(nodeIds[0]!, 0);
      nodes.push({
        id: nodeIds[0]!,
        x: -NODE_WIDTH / 2,
        y: -NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      continue;
    }

    // Compute target angle for each node based on placed neighbors
    const withAngle: { id: string; targetAngle: number }[] = [];
    const withoutAngle: { id: string }[] = [];

    for (const id of nodeIds) {
      const neighbors = adjacency.get(id);
      if (!neighbors) {
        withoutAngle.push({ id });
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
        withoutAngle.push({ id });
      } else {
        withAngle.push({
          id,
          targetAngle: circularMean(placedNeighborAngles),
        });
      }
    }

    // Sort by target angle, then append nodes without connections
    withAngle.sort((a, b) => a.targetAngle - b.targetAngle);
    const sorted = [
      ...withAngle.map((n) => n.id),
      ...withoutAngle.map((n) => n.id),
    ];

    // Dynamic radius: ensure nodes don't overlap
    // Ring 0 uses RING_SPACING / 2 as minimum to avoid origin clustering
    const baseRadius = Math.max(ringIndex * RING_SPACING, RING_SPACING / 2);
    const circumference = count * MIN_ARC_SPACING;
    const minRadius = circumference / (2 * Math.PI);
    // Ensure monotonically increasing: each ring must be outside the previous one
    const ringRadius = Math.max(minRadius, baseRadius, prevRingRadius + RING_SPACING / 2);
    prevRingRadius = ringRadius;

    const angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
      // Start from top (-PI/2) and distribute evenly
      const angle = i * angleStep - Math.PI / 2;
      const id = sorted[i]!;
      placedAngles.set(id, angle);

      const x = ringRadius * Math.cos(angle);
      const y = ringRadius * Math.sin(angle);

      nodes.push({
        id,
        x: x - NODE_WIDTH / 2,
        y: y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    }
  }

  return { nodes };
}
