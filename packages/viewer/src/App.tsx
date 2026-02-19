import { Component, useCallback, useEffect, useMemo } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
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
import { CommandPalette } from './components/CommandPalette.tsx';
import { DetailPanel } from './components/DetailPanel.tsx';
import { UseCaseFilter } from './components/UseCaseFilter.tsx';
import { Legend } from './components/Legend.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { useArchitecture } from './hooks/useArchitecture.ts';
import { useCategoryFilter } from './hooks/useCategoryFilter.ts';
import { useCommandPalette } from './hooks/useCommandPalette.ts';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts';
import { useUseCaseFilter } from './hooks/useUseCaseFilter.ts';
import { useTheme } from './hooks/useTheme.ts';

const nodeTypes = { archNode: ArchNode };

function AppInner() {
  const { nodes, edges, useCases, projectName, loading, error, onNodesChange, onEdgesChange } = useArchitecture();
  const { selectedUseCase, setSelectedUseCase, categories, filteredNodes, filteredEdges, flowInfo } = useUseCaseFilter(nodes, edges, useCases);
  const categoryFilter = useCategoryFilter();
  const [selectedNodeId, setSelectedNodeId] = useQueryState('node', parseAsString.withOptions({ history: 'replace' }));
  const { theme, toggleTheme } = useTheme();
  const { fitView, setCenter, getNodes } = useReactFlow();

  const selectedNodeData: ArchNodeData | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    return found?.data ?? null;
  }, [selectedNodeId, nodes]);

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
  }, [selectedUseCase, fitView]);

  // Auto-center viewport on active flow step
  useEffect(() => {
    if (!flowInfo.flowNodeIds || flowInfo.activeStep < 0) return;
    const activeNodeId = flowInfo.flowNodeIds[flowInfo.activeStep];
    if (!activeNodeId) return;
    const rfNodes = getNodes();
    const target = rfNodes.find((n) => n.id === activeNodeId);
    if (!target) return;
    const x = target.position.x + (target.measured?.width ?? 180) / 2;
    const y = target.position.y + (target.measured?.height ?? 80) / 2;
    void setCenter(x, y, { zoom: 1.2, duration: 400 });
  }, [flowInfo.activeStep, flowInfo.flowNodeIds, getNodes, setCenter]);

  // Category filter: dim hidden categories
  const displayNodes = useMemo(() => {
    if (categoryFilter.hiddenCategories.size === 0) return filteredNodes;
    return filteredNodes.map((node) => {
      if (categoryFilter.hiddenCategories.has(node.data.category)) {
        return { ...node, style: { ...node.style, opacity: 0.08, transition: 'opacity 0.3s' } };
      }
      return node;
    });
  }, [filteredNodes, categoryFilter.hiddenCategories]);

  const displayEdges = useMemo(() => {
    if (categoryFilter.hiddenCategories.size === 0) return filteredEdges;
    const hiddenNodeIds = new Set<string>();
    for (const node of filteredNodes) {
      if (categoryFilter.hiddenCategories.has(node.data.category)) {
        hiddenNodeIds.add(node.id);
      }
    }
    return filteredEdges.map((edge) => {
      if (hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target)) {
        return {
          ...edge,
          style: { ...edge.style, opacity: 0.08, transition: 'opacity 0.3s' },
          labelStyle: { ...((edge.labelStyle as Record<string, unknown>) ?? {}), opacity: 0 },
        };
      }
      return edge;
    });
  }, [filteredEdges, filteredNodes, categoryFilter.hiddenCategories]);

  // Command palette
  const palette = useCommandPalette(displayNodes, categoryFilter.hiddenCategories);

  const handlePaletteSelect = useCallback((nodeId: string) => {
    palette.close();
    void setSelectedNodeId(nodeId);
  }, [palette, setSelectedNodeId]);

  const handleEscape = useCallback(() => {
    if (palette.isOpen) { palette.close(); return; }
    if (selectedNodeId) { void setSelectedNodeId(null); return; }
    if (selectedUseCase) { void setSelectedUseCase(null); return; }
  }, [palette, selectedNodeId, setSelectedNodeId, selectedUseCase, setSelectedUseCase]);

  useKeyboardShortcuts({
    onTogglePalette: palette.toggle,
    onEscape: handleEscape,
    isPaletteOpen: palette.isOpen,
  });

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
        nodes={displayNodes}
        edges={displayEdges}
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
            flowInfo={flowInfo}
          />
        )}
      </div>
      <Legend
        categories={categories}
        hiddenCategories={categoryFilter.hiddenCategories}
        onToggleCategory={categoryFilter.toggleCategory}
        onShowAll={categoryFilter.showAll}
      />

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

      {palette.isOpen && (
        <CommandPalette
          query={palette.query}
          onQueryChange={palette.setQuery}
          results={palette.results}
          activeIndex={palette.activeIndex}
          onMoveUp={palette.moveUp}
          onMoveDown={palette.moveDown}
          onSelect={handlePaletteSelect}
          onClose={palette.close}
        />
      )}
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('archrip viewer error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-canvas, #f5f5f5)' }}>
          <div className="text-center max-w-md px-4">
            <p className="font-semibold mb-2" style={{ color: 'var(--color-interactive-primary, #e53e3e)' }}>Something went wrong</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-content-tertiary, #666)' }}>{this.state.error.message}</p>
            <button
              className="text-sm px-4 py-2 rounded border"
              style={{ borderColor: 'var(--color-border-primary, #ccc)' }}
              onClick={() => { this.setState({ error: null }); }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <AppInner />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
