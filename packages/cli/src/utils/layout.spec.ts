import { describe, it, expect } from 'vitest';
import { computeLayout } from './layout.js';
import type { ArchitectureData } from './validate.js';

function makeData(overrides: Partial<ArchitectureData> = {}): ArchitectureData {
  const { project, ...rest } = overrides;
  return {
    version: '1.0',
    project: { name: 'test', ...project },
    nodes: [
      { id: 'a', category: 'service', label: 'A', layer: 0 },
      { id: 'b', category: 'entity', label: 'B', layer: 1 },
    ],
    edges: [{ source: 'a', target: 'b' }],
    ...rest,
  };
}

describe('computeLayout', () => {
  it('should return a layout node for each input node', () => {
    const result = computeLayout(makeData());
    expect(result.nodes).toHaveLength(2);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('should assign finite coordinates to all nodes', () => {
    const result = computeLayout(makeData());
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('should set width and height to node constants', () => {
    const result = computeLayout(makeData());
    for (const node of result.nodes) {
      expect(node.width).toBe(180);
      expect(node.height).toBe(80);
    }
  });

  it('should place higher-layer nodes below lower-layer nodes (TB layout)', () => {
    const result = computeLayout(makeData());
    const nodeA = result.nodes.find((n) => n.id === 'a');
    const nodeB = result.nodes.find((n) => n.id === 'b');
    expect(nodeA).toBeDefined();
    expect(nodeB).toBeDefined();
    // layer 0 should be above layer 1 in top-to-bottom layout
    expect(nodeA!.y).toBeLessThan(nodeB!.y);
  });

  it('should handle empty nodes and edges', () => {
    const result = computeLayout(makeData({ nodes: [], edges: [] }));
    expect(result.nodes).toHaveLength(0);
  });

  it('should handle nodes without edges', () => {
    const data = makeData({
      nodes: [
        { id: 'x', category: 'service', label: 'X', layer: 0 },
        { id: 'y', category: 'entity', label: 'Y', layer: 0 },
      ],
      edges: [],
    });
    const result = computeLayout(data);
    expect(result.nodes).toHaveLength(2);
  });

  it('should handle many nodes at same layer', () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      category: 'service',
      label: `N${i}`,
      layer: 0,
    }));
    const result = computeLayout(makeData({ nodes, edges: [] }));
    expect(result.nodes).toHaveLength(5);
    // All should have similar y values (same rank)
    const ys = result.nodes.map((n) => n.y);
    const uniqueYs = new Set(ys.map((y) => Math.round(y)));
    expect(uniqueYs.size).toBe(1);
  });

  it('should use dagre layout when layout is not specified', () => {
    const result = computeLayout(makeData());
    const nodeA = result.nodes.find((n) => n.id === 'a');
    const nodeB = result.nodes.find((n) => n.id === 'b');
    // dagre TB: lower layer on top
    expect(nodeA!.y).toBeLessThan(nodeB!.y);
  });
});

describe('computeLayout (concentric)', () => {
  it('should return a layout node for each input node', () => {
    const result = computeLayout(makeData({
      project: { name: 'test', layout: 'concentric' },
    }));
    expect(result.nodes).toHaveLength(2);
    const ids = result.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('should place high-layer nodes closer to center than low-layer nodes', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'ext', category: 'external', label: 'External', layer: 0 },
        { id: 'ctrl', category: 'controller', label: 'Controller', layer: 1 },
        { id: 'svc', category: 'service', label: 'Service', layer: 2 },
        { id: 'entity', category: 'entity', label: 'Entity', layer: 5 },
      ],
      edges: [
        { source: 'ext', target: 'ctrl' },
        { source: 'ctrl', target: 'svc' },
        { source: 'svc', target: 'entity' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const entityNode = result.nodes.find((n) => n.id === 'entity')!;
    const extNode = result.nodes.find((n) => n.id === 'ext')!;
    expect(dist(entityNode)).toBeLessThan(dist(extNode));
  });

  it('should place a single center node at (0, 0)', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'entity', category: 'entity', label: 'Entity', layer: 5 },
      ],
      edges: [],
    });
    const result = computeLayout(data);
    expect(result.nodes).toHaveLength(1);
    const node = result.nodes[0]!;
    // Center of node should be at (0, 0)
    expect(node.x + node.width / 2).toBe(0);
    expect(node.y + node.height / 2).toBe(0);
  });

  it('should place nodes on the same ring at equal distance from center', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'a', category: 'service', label: 'A', layer: 3 },
        { id: 'b', category: 'service', label: 'B', layer: 3 },
        { id: 'c', category: 'service', label: 'C', layer: 3 },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const distances = result.nodes.map(dist);
    // All should be approximately equal
    for (const d of distances) {
      expect(d).toBeCloseTo(distances[0]!, 1);
    }
  });

  it('should handle empty nodes', () => {
    const result = computeLayout(makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [],
      edges: [],
    }));
    expect(result.nodes).toHaveLength(0);
  });

  it('should assign finite coordinates to all nodes', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
    });
    const result = computeLayout(data);
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('should place connected nodes closer together within a ring', () => {
    // Center node connects to A and B but not C.
    // A and B should be placed closer to each other (near center's angle)
    // than to C which has no connection to any placed node.
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'center', category: 'entity', label: 'Center', layer: 5 },
        { id: 'a', category: 'service', label: 'A', layer: 3 },
        { id: 'b', category: 'service', label: 'B', layer: 3 },
        { id: 'c', category: 'service', label: 'C', layer: 3 },
        { id: 'd', category: 'service', label: 'D', layer: 3 },
      ],
      edges: [
        { source: 'center', target: 'a' },
        { source: 'center', target: 'b' },
        // c and d have no edges to center
      ],
    });
    const result = computeLayout(data);

    const nodeCenter = (n: { x: number; y: number; width: number; height: number }) => ({
      cx: n.x + n.width / 2,
      cy: n.y + n.height / 2,
    });

    const nodeA = result.nodes.find((n) => n.id === 'a')!;
    const nodeB = result.nodes.find((n) => n.id === 'b')!;
    const nodeC = result.nodes.find((n) => n.id === 'c')!;

    const posA = nodeCenter(nodeA);
    const posB = nodeCenter(nodeB);
    const posC = nodeCenter(nodeC);

    // Distance between connected nodes A and B
    const distAB = Math.sqrt((posA.cx - posB.cx) ** 2 + (posA.cy - posB.cy) ** 2);
    // Distance between A (connected) and C (unconnected)
    const distAC = Math.sqrt((posA.cx - posC.cx) ** 2 + (posA.cy - posC.cy) ** 2);

    // A and B should be adjacent (closer) since they both connect to center
    expect(distAB).toBeLessThan(distAC);
  });

  it('should handle nodes with no connections to placed rings', () => {
    // All nodes on the same ring, no edges — should still place all nodes
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'a', category: 'service', label: 'A', layer: 3 },
        { id: 'b', category: 'service', label: 'B', layer: 3 },
        { id: 'c', category: 'service', label: 'C', layer: 3 },
      ],
      edges: [],
    });
    const result = computeLayout(data);
    expect(result.nodes).toHaveLength(3);
    for (const node of result.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('should order outer ring nodes near their connected inner ring nodes', () => {
    // Two inner nodes at opposite sides, outer nodes should cluster near their connections
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'inner1', category: 'entity', label: 'Inner1', layer: 5 },
        { id: 'inner2', category: 'entity', label: 'Inner2', layer: 5 },
        { id: 'outer1', category: 'service', label: 'Outer1', layer: 3 },
        { id: 'outer2', category: 'service', label: 'Outer2', layer: 3 },
        { id: 'outer3', category: 'service', label: 'Outer3', layer: 3 },
        { id: 'outer4', category: 'service', label: 'Outer4', layer: 3 },
      ],
      edges: [
        { source: 'inner1', target: 'outer1' },
        { source: 'inner1', target: 'outer2' },
        { source: 'inner2', target: 'outer3' },
        { source: 'inner2', target: 'outer4' },
      ],
    });
    const result = computeLayout(data);

    const nodeCenter = (n: { x: number; y: number; width: number; height: number }) => ({
      cx: n.x + n.width / 2,
      cy: n.y + n.height / 2,
    });

    const pos = (id: string) => nodeCenter(result.nodes.find((n) => n.id === id)!);
    const dist = (a: { cx: number; cy: number }, b: { cx: number; cy: number }) =>
      Math.sqrt((a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2);

    // outer1 and outer2 (both connected to inner1) should be closer to each other
    // than outer1 and outer3 (connected to different inner nodes)
    const d_o1_o2 = dist(pos('outer1'), pos('outer2'));
    const d_o1_o3 = dist(pos('outer1'), pos('outer3'));
    expect(d_o1_o2).toBeLessThan(d_o1_o3);
  });

  it('should place entities at center and adapters/external on outer rings even with wrong layer numbers', () => {
    // Simulate an LLM assigning high layer to adapters and low layer to entities
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'entity', category: 'entity', label: 'Domain Entity', layer: 1 },
        { id: 'svc', category: 'service', label: 'Service', layer: 2 },
        { id: 'adpt', category: 'adapter', label: 'Adapter', layer: 4 },
        { id: 'ext', category: 'external', label: 'External DB', layer: 5 },
      ],
      edges: [
        { source: 'ext', target: 'adpt' },
        { source: 'adpt', target: 'svc' },
        { source: 'svc', target: 'entity' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const entityNode = result.nodes.find((n) => n.id === 'entity')!;
    const adptNode = result.nodes.find((n) => n.id === 'adpt')!;
    const extNode = result.nodes.find((n) => n.id === 'ext')!;

    // Entity should be closer to center than adapter
    expect(dist(entityNode)).toBeLessThan(dist(adptNode));
    // Adapter should be closer to center than external
    expect(dist(adptNode)).toBeLessThan(dist(extNode));
  });

  it('should place ports between services and adapters (Port & Adapter pattern)', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'entity', category: 'entity', label: 'Entity', layer: 5 },
        { id: 'svc', category: 'service', label: 'Service', layer: 2 },
        { id: 'port', category: 'port', label: 'Port', layer: 3 },
        { id: 'adpt', category: 'adapter', label: 'Adapter', layer: 4 },
      ],
      edges: [
        { source: 'svc', target: 'port' },
        { source: 'adpt', target: 'port' },
        { source: 'port', target: 'entity' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const svcNode = result.nodes.find((n) => n.id === 'svc')!;
    const portNode = result.nodes.find((n) => n.id === 'port')!;
    const adptNode = result.nodes.find((n) => n.id === 'adpt')!;

    // Port should be between service and adapter
    expect(dist(svcNode)).toBeLessThan(dist(portNode));
    expect(dist(portNode)).toBeLessThan(dist(adptNode));
  });

  it('should enforce monotonically increasing ring radii even when inner rings have more nodes', () => {
    // 9 entity nodes (large ring) vs 3 port nodes (small ring)
    // Without monotonic enforcement, entity ring radius could exceed port ring radius
    const entityNodes = Array.from({ length: 9 }, (_, i) => ({
      id: `entity${i}`,
      category: 'entity',
      label: `Entity ${i}`,
      layer: 5,
    }));
    const portNodes = Array.from({ length: 3 }, (_, i) => ({
      id: `port${i}`,
      category: 'port',
      label: `Port ${i}`,
      layer: 3,
    }));
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [...entityNodes, ...portNodes],
      edges: portNodes.map((p, i) => ({ source: p.id, target: entityNodes[i]!.id })),
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const entityDists = result.nodes.filter((n) => n.id.startsWith('entity')).map(dist);
    const portDists = result.nodes.filter((n) => n.id.startsWith('port')).map(dist);

    const maxEntityDist = Math.max(...entityDists);
    const minPortDist = Math.min(...portDists);

    // All port nodes should be further from center than all entity nodes
    expect(minPortDist).toBeGreaterThan(maxEntityDist);
  });

  it('should place infrastructure between database and external', () => {
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'entity', category: 'entity', label: 'Entity', layer: 5 },
        { id: 'db', category: 'database', label: 'Database', layer: 1 },
        { id: 'infra', category: 'infrastructure', label: 'Infra', layer: 0 },
        { id: 'ext', category: 'external', label: 'External', layer: 0 },
      ],
      edges: [
        { source: 'entity', target: 'db' },
        { source: 'db', target: 'infra' },
        { source: 'infra', target: 'ext' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const dbNode = result.nodes.find((n) => n.id === 'db')!;
    const infraNode = result.nodes.find((n) => n.id === 'infra')!;
    const extNode = result.nodes.find((n) => n.id === 'ext')!;

    // Infrastructure should be between database and external
    expect(dist(dbNode)).toBeLessThan(dist(infraNode));
    expect(dist(infraNode)).toBeLessThan(dist(extNode));
  });

  it('should use category priority as primary sort and layer as secondary', () => {
    // Two services with different layers should be on the same ring
    const data = makeData({
      project: { name: 'test', layout: 'concentric' },
      nodes: [
        { id: 'entity', category: 'entity', label: 'Entity', layer: 3 },
        { id: 'svc1', category: 'service', label: 'Service A', layer: 2 },
        { id: 'svc2', category: 'service', label: 'Service B', layer: 2 },
        { id: 'ext', category: 'external', label: 'External', layer: 0 },
      ],
      edges: [
        { source: 'svc1', target: 'entity' },
        { source: 'svc2', target: 'entity' },
        { source: 'ext', target: 'svc1' },
      ],
    });
    const result = computeLayout(data);

    const dist = (n: { x: number; y: number; width: number; height: number }) => {
      const cx = n.x + n.width / 2;
      const cy = n.y + n.height / 2;
      return Math.sqrt(cx * cx + cy * cy);
    };

    const svc1 = result.nodes.find((n) => n.id === 'svc1')!;
    const svc2 = result.nodes.find((n) => n.id === 'svc2')!;

    // Same category + same layer = same ring = same distance
    expect(dist(svc1)).toBeCloseTo(dist(svc2), 1);
  });
});
