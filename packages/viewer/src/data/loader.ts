import type { Node, Edge } from '@xyflow/react';
import type { ArchNodeData, UseCase, TableSchema } from '../types.ts';

interface RawArchData {
  version: string;
  project: {
    name: string;
    description?: string;
    language?: string;
    framework?: string;
    sourceUrl?: string;
  };
  nodes: RawNode[];
  edges: RawEdge[];
  useCases?: RawUseCase[];
  schemas?: Record<string, TableSchema>;
  _layout?: Record<string, { x: number; y: number }>;
}

interface RawNode {
  id: string;
  category: string;
  label: string;
  description?: string;
  filePath?: string;
  layer: number;
  methods?: string[];
  routes?: string[];
  useCases?: string[];
  schema?: string;
  implements?: string;
  externalService?: string;
  sqlExamples?: string[];
}

interface RawEdge {
  source: string;
  target: string;
  label?: string | null;
  type?: string;
}

interface RawUseCase {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  flow?: string[];
}

export interface LoadedArchitecture {
  projectName: string;
  nodes: Node[];
  edges: Edge[];
  useCases: UseCase[];
}

function resolveSourceUrl(template: string | undefined, filePath: string): string {
  if (!template || !filePath) return '';
  return template.replace('{filePath}', filePath);
}

export async function loadArchitecture(): Promise<LoadedArchitecture> {
  const res = await fetch('/architecture.json');
  const raw: RawArchData = await res.json();

  const schemas = raw.schemas ?? {};
  const layout = raw._layout ?? {};
  const sourceUrlTemplate = raw.project.sourceUrl;

  // Convert raw nodes to React Flow nodes
  const nodes: Node[] = raw.nodes.map((n) => {
    const pos = layout[n.id] ?? { x: 0, y: 0 };
    const resolvedSchema = n.schema ? schemas[n.schema] : undefined;

    const data: ArchNodeData = {
      label: n.label,
      category: n.category,
      description: n.description ?? '',
      filePath: n.filePath ?? '',
      sourceUrl: resolveSourceUrl(sourceUrlTemplate, n.filePath ?? ''),
      methods: n.methods,
      routes: n.routes,
      useCases: n.useCases ?? [],
      schema: resolvedSchema,
      implements: n.implements,
      externalService: n.externalService,
      sqlExamples: n.sqlExamples,
    };

    return {
      id: n.id,
      type: 'archNode',
      position: { x: pos.x, y: pos.y },
      data,
    };
  });

  // Convert raw edges to React Flow edges
  const edges: Edge[] = raw.edges.map((e) => ({
    id: `${e.source}->${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    type: 'smoothstep',
  }));

  // Convert use cases
  const useCases: UseCase[] = (raw.useCases ?? []).map((uc) => ({
    id: uc.id,
    name: uc.name,
    description: uc.description ?? '',
    nodeIds: uc.nodeIds,
    flow: uc.flow,
  }));

  return {
    projectName: raw.project.name,
    nodes,
    edges,
    useCases,
  };
}
