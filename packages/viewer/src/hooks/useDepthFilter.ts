import { useMemo } from 'react';
import { useQueryState, parseAsInteger } from 'nuqs';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, DepthLevel } from '../types.ts';

function clampDepth(value: number): DepthLevel {
  if (value <= 0) return 0;
  if (value >= 2) return 2;
  return value as DepthLevel;
}

export function useDepthFilter(nodes: ArchFlowNode[], edges: Edge[]) {
  const [rawDepth, setRawDepth] = useQueryState('depth', parseAsInteger.withDefault(2).withOptions({ history: 'replace' }));
  const depthLevel = clampDepth(rawDepth);

  const setDepthLevel = (level: DepthLevel) => {
    void setRawDepth(level);
  };

  const visibleNodes = useMemo(
    () => nodes.map((node) => ({ ...node, hidden: node.data.depth > depthLevel })),
    [nodes, depthLevel],
  );

  const visibleEdges = useMemo(() => {
    const hiddenIds = new Set(
      visibleNodes.filter((n) => n.hidden).map((n) => n.id),
    );
    return edges.map((edge) => ({
      ...edge,
      hidden: hiddenIds.has(edge.source) || hiddenIds.has(edge.target),
    }));
  }, [visibleNodes, edges]);

  return { depthLevel, setDepthLevel, visibleNodes, visibleEdges };
}
