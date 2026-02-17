import { useEffect, useState } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Edge } from '@xyflow/react';

import type { ArchFlowNode, UseCase } from '../types.ts';
import { loadArchitecture } from '../data/loader.ts';

export function useArchitecture() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [projectName, setProjectName] = useState('Architecture Viewer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArchitecture()
      .then((arch) => {
        setNodes(arch.nodes);
        setEdges(arch.edges);
        setUseCases(arch.useCases);
        setProjectName(arch.projectName);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load architecture.json');
        setLoading(false);
      });
  }, [setNodes, setEdges]);

  return { nodes, edges, useCases, projectName, loading, error, setNodes, setEdges, onNodesChange, onEdgesChange };
}
