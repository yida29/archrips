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

/**
 * Compute node positions using dagre auto-layout.
 * Uses the `layer` field as dagre rank to control vertical positioning.
 */
export function computeLayout(data: ArchitectureData): LayoutResult {
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
