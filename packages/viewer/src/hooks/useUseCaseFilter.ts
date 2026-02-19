import { useMemo } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, UseCase } from '../types.ts';
import { useFlowAnimation } from './useFlowAnimation.ts';

function isNodeActive(node: ArchFlowNode, activeIds: Set<string>): boolean {
  return activeIds.has(node.id);
}

/** Resolve a node's effective ID for flow matching */
function getFlowId(node: ArchFlowNode, flowSet: Set<string>): string | null {
  if (flowSet.has(node.id)) return node.id;
  return null;
}

export function useUseCaseFilter(nodes: ArchFlowNode[], edges: Edge[], useCases: UseCase[]) {
  const [selectedUseCase, setSelectedUseCase] = useQueryState('uc', parseAsString.withOptions({ history: 'replace' }));
  const flowState = useFlowAnimation(useCases, selectedUseCase);
  const { activeStep, flowNodeIds } = flowState;

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

    // No flow — static highlight (backward compat)
    if (!flowNodeIds) {
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
    }

    // Flow animation mode
    const flowSet = new Set(flowNodeIds);
    const activeFlowId = flowNodeIds[activeStep];
    const passedIds = new Set(flowNodeIds.slice(0, activeStep));

    return nodes.map((node) => {
      if (node.hidden) return node;
      const active = isNodeActive(node, activeIds);
      if (!active) {
        // Non-participating node
        return {
          ...node,
          style: { ...node.style, opacity: 0.08, transition: 'opacity 0.3s' },
        };
      }

      const flowId = getFlowId(node, flowSet);
      if (!flowId) {
        // In use case but not in flow — dim slightly
        return {
          ...node,
          style: { ...node.style, opacity: 0.3, transition: 'opacity 0.3s' },
        };
      }

      if (flowId === activeFlowId) {
        // Active step — glow + scale
        return {
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            boxShadow: 'var(--shadow-node-flow-active)',
            transform: 'scale(1.02)',
            transition: 'opacity 0.3s, box-shadow 0.3s, transform 0.3s',
          },
        };
      }

      if (passedIds.has(flowId)) {
        // Already passed
        return {
          ...node,
          style: { ...node.style, opacity: 1, transition: 'opacity 0.3s' },
        };
      }

      // Not yet reached
      return {
        ...node,
        style: { ...node.style, opacity: 0.3, transition: 'opacity 0.3s' },
      };
    });
  }, [nodes, selectedUseCase, useCases, flowNodeIds, activeStep]);

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

    // No flow — static highlight (backward compat)
    if (!flowNodeIds) {
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
    }

    // Flow animation mode — build flow edge lookup
    // A flow edge is one connecting flow[i] → flow[i+1]
    const flowEdgeMap = new Map<string, 'active' | 'passed' | 'upcoming'>();
    for (let i = 0; i < flowNodeIds.length - 1; i++) {
      const src = flowNodeIds[i];
      const tgt = flowNodeIds[i + 1];
      // Check both edge ID conventions
      const key1 = `${src}->${tgt}`;
      const key2 = `${tgt}->${src}`;
      let status: 'active' | 'passed' | 'upcoming';
      if (i + 1 === activeStep) {
        status = 'active';
      } else if (i + 1 <= activeStep) {
        status = 'passed';
      } else {
        status = 'upcoming';
      }
      flowEdgeMap.set(key1, status);
      flowEdgeMap.set(key2, status);
    }

    return edges.map((edge) => {
      const bothActive = activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target);
      if (!bothActive) {
        return {
          ...edge,
          style: { ...edge.style, opacity: 0.08, transition: 'opacity 0.3s' },
          className: '',
          labelStyle: {
            ...((edge.labelStyle as Record<string, unknown>) ?? {}),
            opacity: 0,
          },
        };
      }

      const flowStatus = flowEdgeMap.get(edge.id);
      if (flowStatus === 'active') {
        return {
          ...edge,
          style: { ...edge.style, opacity: 1, stroke: undefined, strokeWidth: undefined },
          className: 'flow-edge-active',
          labelStyle: {
            ...((edge.labelStyle as Record<string, unknown>) ?? {}),
            opacity: 1,
          },
        };
      }
      if (flowStatus === 'passed') {
        return {
          ...edge,
          style: { ...edge.style, opacity: 1, transition: 'opacity 0.3s' },
          className: '',
          labelStyle: {
            ...((edge.labelStyle as Record<string, unknown>) ?? {}),
            opacity: 1,
          },
        };
      }

      // In use case but not a flow edge, or upcoming flow edge
      return {
        ...edge,
        style: { ...edge.style, opacity: 0.3, transition: 'opacity 0.3s' },
        className: '',
        labelStyle: {
          ...((edge.labelStyle as Record<string, unknown>) ?? {}),
          opacity: 0.3,
        },
      };
    });
  }, [edges, nodes, selectedUseCase, useCases, flowNodeIds, activeStep]);

  return { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges, flowInfo: flowState };
}
