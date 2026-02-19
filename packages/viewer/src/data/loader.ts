import type { Edge } from '@xyflow/react';
import type { ArchFlowNode, ArchNodeData, UseCase, TableSchema, MetadataEntry } from '../types.ts';

interface RawArchData {
  version: string;
  project: {
    name: string;
    description?: string;
    language?: string;
    framework?: string;
    sourceUrl?: string;
    layout?: string;
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
  metadata?: MetadataEntry[];
}

interface RawEdge {
  source: string;
  target: string;
  label?: string | null;
  type?: string;
  description?: string;
  metadata?: MetadataEntry[];
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
  nodes: ArchFlowNode[];
  edges: Edge[];
  useCases: UseCase[];
}

function resolveSourceUrl(template: string | undefined, filePath: string): string {
  if (!template || !filePath) return '';

  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const resolved = template.replace('{filePath}', encoded);

  try {
    const url = new URL(resolved);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

export async function loadArchitecture(): Promise<LoadedArchitecture> {
  const res = await fetch('/architecture.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch architecture.json: ${String(res.status)} ${res.statusText}`);
  }
  let raw: RawArchData;
  try {
    raw = await res.json() as RawArchData;
  } catch {
    throw new Error('Failed to parse architecture.json: invalid JSON');
  }

  const schemas = raw.schemas ?? {};
  const layout = raw._layout ?? {};
  const sourceUrlTemplate = raw.project.sourceUrl;

  // Convert raw nodes to React Flow nodes
  const nodes: ArchFlowNode[] = raw.nodes.map((n) => {
    const pos = layout[n.id] ?? { x: 0, y: 0 };
    const resolvedSchema = n.schema ? schemas[n.schema] : undefined;

    const data: ArchNodeData = {
      label: n.label,
      category: n.category,
      description: n.description ?? '',
      filePath: n.filePath ?? '',
      sourceUrl: resolveSourceUrl(sourceUrlTemplate, n.filePath ?? ''),
      layer: n.layer,
      methods: n.methods,
      routes: n.routes,
      useCases: n.useCases ?? [],
      schema: resolvedSchema,
      implements: n.implements,
      externalService: n.externalService,
      sqlExamples: n.sqlExamples,
      metadata: n.metadata,
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
    style: { stroke: 'var(--color-edge-stroke)', strokeWidth: 1.5 },
    type: 'smoothstep',
    data: { description: e.description, metadata: e.metadata },
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
