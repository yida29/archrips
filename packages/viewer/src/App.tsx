import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import type { NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ArchFlowNode, ArchNodeData } from './types.ts';
import { getCategoryColors } from './types.ts';
import { ArchNode } from './components/nodes/ArchNode.tsx';
import { DetailPanel } from './components/DetailPanel.tsx';
import { UseCaseFilter } from './components/UseCaseFilter.tsx';
import { Legend } from './components/Legend.tsx';
import { useArchitecture } from './hooks/useArchitecture.ts';
import { useUseCaseFilter } from './hooks/useUseCaseFilter.ts';

const nodeTypes = { archNode: ArchNode };

export default function App() {
  const { nodes, edges, useCases, projectName, loading, error, onNodesChange, onEdgesChange } = useArchitecture();
  const { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges } = useUseCaseFilter(nodes, edges, useCases);
  const [selectedNodeData, setSelectedNodeData] = useState<ArchNodeData | null>(null);

  const onNodeClick: NodeMouseHandler<ArchFlowNode> = useCallback((_event, node) => {
    setSelectedNodeData(node.data);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeData(null);
  }, []);

  const handleUseCaseSelect = useCallback((ucId: string | null) => {
    setSelectedUseCase(ucId);
  }, [setSelectedUseCase]);

  const handleUseCaseClickFromPanel = useCallback((ucId: string) => {
    setSelectedUseCase(ucId);
    setSelectedNodeData(null);
  }, [setSelectedUseCase]);

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
            const data = node.data as ArchNodeData;
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
