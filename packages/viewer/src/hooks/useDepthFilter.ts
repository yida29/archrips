import { useMemo } from 'react';
import { useQueryState, parseAsInteger } from 'nuqs';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, ArchNodeData, DepthLevel, MemberNodeSummary } from '../types.ts';
import { getCategoryLabel } from '../types.ts';
import { computeLayout, NODE_WIDTH, NODE_HEIGHT, GROUP_NODE_WIDTH, GROUP_NODE_HEIGHT } from '../utils/layout.ts';

function clampDepth(value: number): DepthLevel {
  if (value <= 0) return 0;
  if (value >= 2) return 2;
  return 1;
}

export function useDepthFilter(
  nodes: ArchFlowNode[],
  edges: Edge[],
  layoutType: 'dagre' | 'concentric',
) {
  const [rawDepth, setRawDepth] = useQueryState('depth', parseAsInteger.withDefault(2).withOptions({ history: 'replace' }));
  const depthLevel = clampDepth(rawDepth);

  const setDepthLevel = (level: DepthLevel) => {
    void setRawDepth(level);
  };

  const { visibleNodes, visibleEdges } = useMemo(() => {
    // depth=2 (Detail): pass-through, no merging
    if (depthLevel === 2) {
      return { visibleNodes: nodes, visibleEdges: edges };
    }

    // Split nodes into kept (visible at this depth) and mergeable (to be grouped)
    const kept: ArchFlowNode[] = [];
    const mergeable: ArchFlowNode[] = [];

    for (const node of nodes) {
      if (node.data.depth <= depthLevel) {
        kept.push(node);
      } else {
        mergeable.push(node);
      }
    }

    // Group mergeable nodes by category
    const categoryGroups = new Map<string, ArchFlowNode[]>();
    for (const node of mergeable) {
      const cat = node.data.category;
      const group = categoryGroups.get(cat);
      if (group) {
        group.push(node);
      } else {
        categoryGroups.set(cat, [node]);
      }
    }

    // Build nodeToGroup mapping & create group nodes
    const nodeToGroup = new Map<string, string>();
    const groupNodes: ArchFlowNode[] = [];

    for (const [category, groupMembers] of categoryGroups) {
      if (groupMembers.length === 1) {
        // Singleton: keep as-is, no grouping
        kept.push(groupMembers[0]!);
        continue;
      }

      const groupId = `__group_${category}`;

      // Map all member IDs to the group ID
      for (const member of groupMembers) {
        nodeToGroup.set(member.id, groupId);
      }

      // Collect member summaries
      const memberNodes: MemberNodeSummary[] = groupMembers.map((m) => ({
        id: m.id,
        label: m.data.label,
        description: m.data.description,
        filePath: m.data.filePath,
        sourceUrl: m.data.sourceUrl,
      }));

      // Merge useCases from all members
      const useCasesSet = new Set<string>();
      for (const m of groupMembers) {
        for (const uc of m.data.useCases) {
          useCasesSet.add(uc);
        }
      }

      // Use the most common layer from members for layout
      const layerCounts = new Map<number, number>();
      for (const m of groupMembers) {
        const l = m.data.layer ?? 0;
        layerCounts.set(l, (layerCounts.get(l) ?? 0) + 1);
      }
      let bestLayer = 0;
      let bestCount = 0;
      for (const [l, c] of layerCounts) {
        if (c > bestCount) {
          bestLayer = l;
          bestCount = c;
        }
      }

      const label = `${getCategoryLabel(category)} (${groupMembers.length})`;

      const data: ArchNodeData = {
        label,
        category,
        depth: 0,
        description: `${groupMembers.length} ${getCategoryLabel(category).toLowerCase()} nodes`,
        filePath: '',
        sourceUrl: '',
        layer: bestLayer,
        useCases: [...useCasesSet],
        isGroup: true,
        memberCount: groupMembers.length,
        memberNodes,
      };

      groupNodes.push({
        id: groupId,
        type: 'groupNode',
        position: { x: 0, y: 0 }, // will be computed by layout
        data,
      });
    }

    // Combine kept + group nodes
    const allNodes = [...kept, ...groupNodes];

    // Remap edges
    const edgeSet = new Set<string>();
    const remappedEdges: Edge[] = [];

    for (const edge of edges) {
      const source = nodeToGroup.get(edge.source) ?? edge.source;
      const target = nodeToGroup.get(edge.target) ?? edge.target;

      // Skip self-loops (same group)
      if (source === target) continue;

      // Skip if either endpoint doesn't exist in allNodes
      const sourceExists = allNodes.some((n) => n.id === source);
      const targetExists = allNodes.some((n) => n.id === target);
      if (!sourceExists || !targetExists) continue;

      // Deduplicate by (source, target)
      const key = `${source}->${target}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      remappedEdges.push({
        ...edge,
        id: key,
        source,
        target,
      });
    }

    // Compute layout for merged graph
    const layoutNodes = allNodes.map((n) => ({
      id: n.id,
      width: n.data.isGroup ? GROUP_NODE_WIDTH : NODE_WIDTH,
      height: n.data.isGroup ? GROUP_NODE_HEIGHT : NODE_HEIGHT,
      layer: n.data.layer,
    }));

    const layoutEdges = remappedEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const positions = computeLayout(layoutNodes, layoutEdges, layoutType);

    // Apply computed positions
    const positionedNodes: ArchFlowNode[] = allNodes.map((node) => {
      const pos = positions.get(node.id);
      if (pos) {
        return { ...node, position: { x: pos.x, y: pos.y } };
      }
      return node;
    });

    return { visibleNodes: positionedNodes, visibleEdges: remappedEdges };
  }, [nodes, edges, depthLevel, layoutType]);

  return { depthLevel, setDepthLevel, visibleNodes, visibleEdges };
}
