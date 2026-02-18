import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import type { NodeMouseHandler } from '@xyflow/react';
import { useQueryState, parseAsString } from 'nuqs';
import '@xyflow/react/dist/style.css';

import type { ArchFlowNode, ArchNodeData } from './types.ts';
import { getCategoryColors } from './types.ts';
import { ArchNode } from './components/nodes/ArchNode.tsx';
import { GroupNode } from './components/nodes/GroupNode.tsx';
import { DetailPanel } from './components/DetailPanel.tsx';
import { UseCaseFilter } from './components/UseCaseFilter.tsx';
import { DepthFilter } from './components/DepthFilter.tsx';
import { Legend } from './components/Legend.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { useArchitecture } from './hooks/useArchitecture.ts';
import { useDepthFilter } from './hooks/useDepthFilter.ts';
import { useUseCaseFilter } from './hooks/useUseCaseFilter.ts';
import { useTheme } from './hooks/useTheme.ts';

const nodeTypes = { archNode: ArchNode, groupNode: GroupNode };

function AppInner() {
  const { nodes, edges, useCases, projectName, layoutType, loading, error, onNodesChange, onEdgesChange } = useArchitecture();
  const { depthLevel, setDepthLevel, visibleNodes, visibleEdges } = useDepthFilter(nodes, edges, layoutType);
  const { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges } = useUseCaseFilter(visibleNodes, visibleEdges, useCases);
  const [selectedNodeId, setSelectedNodeId] = useQueryState('node', parseAsString.withOptions({ history: 'replace' }));
  const { theme, toggleTheme } = useTheme();
  const { fitView } = useReactFlow();

  const selectedNodeData: ArchNodeData | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = visibleNodes.find((n) => n.id === selectedNodeId);
    return found?.data ?? null;
  }, [selectedNodeId, visibleNodes]);

  const onNodeClick: NodeMouseHandler<ArchFlowNode> = useCallback((_event, node) => {
    void setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    void setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleUseCaseSelect = useCallback((ucId: string | null) => {
    void setSelectedUseCase(ucId);
  }, [setSelectedUseCase]);

  const handleUseCaseClickFromPanel = useCallback((ucId: string) => {
    void setSelectedUseCase(ucId);
    void setSelectedNodeId(null);
  }, [setSelectedUseCase, setSelectedNodeId]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 300 });
    });
    return () => cancelAnimationFrame(id);
  }, [depthLevel, selectedUseCase, fitView]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ color: 'var(--color-content-tertiary)', background: 'var(--color-surface-canvas)' }}>
        Loading architecture data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-canvas)' }}>
        <div className="text-center">
          <p className="font-semibold mb-2" style={{ color: 'var(--color-interactive-primary)' }}>Failed to load</p>
          <p className="text-sm" style={{ color: 'var(--color-content-tertiary)' }}>{error}</p>
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
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as ArchNodeData;
            return getCategoryColors(data.category).border;
          }}
          maskColor="rgba(0,0,0,0.08)"
          style={{ border: '1px solid var(--color-border-primary)' }}
        />
      </ReactFlow>

      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {useCases.length > 0 && (
          <UseCaseFilter
            useCases={useCases}
            selectedUseCase={selectedUseCase}
            onSelect={handleUseCaseSelect}
          />
        )}
        <DepthFilter depthLevel={depthLevel} onSelect={setDepthLevel} />
      </div>
      <Legend categories={categories} />

      {/* Title + Theme Toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <div
          className="backdrop-blur-sm rounded-lg px-4 py-2 border"
          style={{
            background: 'color-mix(in srgb, var(--color-surface-primary) 90%, transparent)',
            borderColor: 'var(--color-border-primary)',
            boxShadow: 'var(--shadow-panel)',
          }}
        >
          <h1 className="text-sm font-bold" style={{ color: 'var(--color-content-primary)' }}>
            {projectName} — Architecture
          </h1>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {selectedNodeData && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => void setSelectedNodeId(null)}
          />
          <DetailPanel
            data={selectedNodeData}
            useCases={useCases}
            onClose={() => void setSelectedNodeId(null)}
            onUseCaseClick={handleUseCaseClickFromPanel}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
