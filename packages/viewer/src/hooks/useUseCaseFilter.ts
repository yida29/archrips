import { useMemo } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, UseCase } from '../types.ts';

function isNodeActive(node: ArchFlowNode, activeIds: Set<string>): boolean {
  if (node.data.isGroup && node.data.memberNodes) {
    return node.data.memberNodes.some((m) => activeIds.has(m.id));
  }
  return activeIds.has(node.id);
}

export function useUseCaseFilter(nodes: ArchFlowNode[], edges: Edge[], useCases: UseCase[]) {
  const [selectedUseCase, setSelectedUseCase] = useQueryState('uc', parseAsString.withOptions({ history: 'replace' }));

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const node of nodes) {
      if (!node.hidden) set.add(node.data.category);
    }
    return Array.from(set);
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (!selectedUseCase) return nodes;
    const uc = useCases.find((u) => u.id === selectedUseCase);
    if (!uc) return nodes;
    const activeIds = new Set(uc.nodeIds);
    return nodes.map((node) => {
      if (node.hidden) return node;
      const active = isNodeActive(node, activeIds);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: active ? 1 : 0.15,
          transition: 'opacity 0.3s',
        },
      };
    });
  }, [nodes, selectedUseCase, useCases]);

  const filteredEdges = useMemo(() => {
    if (!selectedUseCase) return edges;
    const uc = useCases.find((u) => u.id === selectedUseCase);
    if (!uc) return edges;
    const activeIds = new Set(uc.nodeIds);

    // Build a set of active node IDs (including group nodes whose members are active)
    const activeNodeIds = new Set<string>();
    for (const node of nodes) {
      if (isNodeActive(node, activeIds)) {
        activeNodeIds.add(node.id);
      }
    }

    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target) ? 1 : 0.08,
        transition: 'opacity 0.3s',
      },
      labelStyle: {
        ...((edge.labelStyle as Record<string, unknown>) ?? {}),
        opacity: activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target) ? 1 : 0,
      },
    }));
  }, [edges, nodes, selectedUseCase, useCases]);

  return { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges };
}
