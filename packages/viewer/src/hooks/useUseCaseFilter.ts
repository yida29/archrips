import { useMemo, useState } from 'react';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, UseCase } from '../types.ts';

export function useUseCaseFilter(nodes: ArchFlowNode[], edges: Edge[], useCases: UseCase[]) {
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

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
      return {
        ...node,
        style: {
          ...node.style,
          opacity: activeIds.has(node.id) ? 1 : 0.15,
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
    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: activeIds.has(edge.source) && activeIds.has(edge.target) ? 1 : 0.08,
        transition: 'opacity 0.3s',
      },
      labelStyle: {
        ...((edge.labelStyle as Record<string, unknown>) ?? {}),
        opacity: activeIds.has(edge.source) && activeIds.has(edge.target) ? 1 : 0,
      },
    }));
  }, [edges, selectedUseCase, useCases]);

  return { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges };
}
