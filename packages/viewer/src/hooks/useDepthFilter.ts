import { useMemo, useState } from 'react';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, DepthLevel } from '../types.ts';

export function useDepthFilter(nodes: ArchFlowNode[], edges: Edge[]) {
  const [depthLevel, setDepthLevel] = useState<DepthLevel>(2);

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
