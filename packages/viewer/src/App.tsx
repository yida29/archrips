import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import type { Node, Edge, NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ArchNodeData, UseCase } from './types.ts';
import { getCategoryColors } from './types.ts';
import { loadArchitecture } from './data/loader.ts';
import { ArchNode } from './components/nodes/ArchNode.tsx';
import { DetailPanel } from './components/DetailPanel.tsx';
import { UseCaseFilter } from './components/UseCaseFilter.tsx';
import { Legend } from './components/Legend.tsx';

const nodeTypes = { archNode: ArchNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [projectName, setProjectName] = useState('Architecture Viewer');
  const [selectedNodeData, setSelectedNodeData] = useState<ArchNodeData | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load architecture.json on mount
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

  // Collect unique categories from loaded data for the legend
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const node of nodes) {
      const data = node.data as unknown as ArchNodeData;
      set.add(data.category);
    }
    return Array.from(set);
  }, [nodes]);

  // Apply use case filter
  const filteredNodes = useMemo(() => {
    if (!selectedUseCase) return nodes;
    const uc = useCases.find((u) => u.id === selectedUseCase);
    if (!uc) return nodes;
    const activeIds = new Set(uc.nodeIds);
    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: activeIds.has(node.id) ? 1 : 0.15,
        transition: 'opacity 0.3s',
      },
    }));
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

  const onNodeClick: NodeMouseHandler = useCallback((_event, node: Node) => {
    setSelectedNodeData(node.data as unknown as ArchNodeData);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeData(null);
  }, []);

  const handleUseCaseSelect = useCallback((ucId: string | null) => {
    setSelectedUseCase(ucId);
  }, []);

  const handleUseCaseClickFromPanel = useCallback((ucId: string) => {
    setSelectedUseCase(ucId);
    setSelectedNodeData(null);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-500">
        Loading architecture data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Failed to load</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as ArchNodeData;
            return getCategoryColors(data.category).border;
          }}
          maskColor="rgba(0,0,0,0.08)"
          style={{ border: '1px solid #e5e7eb' }}
        />
      </ReactFlow>

      {useCases.length > 0 && (
        <UseCaseFilter
          useCases={useCases}
          selectedUseCase={selectedUseCase}
          onSelect={handleUseCaseSelect}
        />
      )}
      <Legend categories={categories} />

      {/* Title */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow px-4 py-2 border border-gray-200">
        <h1 className="text-sm font-bold text-gray-800">
          {projectName} — Architecture
        </h1>
      </div>

      {selectedNodeData && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedNodeData(null)}
          />
          <DetailPanel
            data={selectedNodeData}
            onClose={() => setSelectedNodeData(null)}
            onUseCaseClick={handleUseCaseClickFromPanel}
          />
        </>
      )}
    </div>
  );
}
