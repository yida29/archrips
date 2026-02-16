import { readFileSync } from 'node:fs';

export interface ArchitectureData {
  version: string;
  project: {
    name: string;
    description?: string;
    language?: string;
    framework?: string;
    sourceUrl?: string;
  };
  nodes: ArchNode[];
  edges: ArchEdge[];
  useCases?: ArchUseCase[];
  schemas?: Record<string, TableSchema>;
}

export interface ArchNode {
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

export interface ArchEdge {
  source: string;
  target: string;
  label?: string | null;
  type?: 'dependency' | 'implements' | 'relation';
}

export interface ArchUseCase {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  flow?: string[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  index?: string;
  foreignKey?: { table: string; column: string; onDelete?: string };
}

export interface TableSchema {
  tableName: string;
  columns: ColumnSchema[];
  indexes?: string[];
  enumValues?: Record<string, Record<string, string>>;
}

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Load and validate architecture.json.
 * Does structural validation without requiring ajv (zero extra dependencies).
 */
export function loadAndValidate(filePath: string): { data: ArchitectureData; errors: ValidationError[] } {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as ArchitectureData;
  const errors: ValidationError[] = [];

  // Required top-level fields
  if (data.version !== '1.0') {
    errors.push({ path: 'version', message: `Expected "1.0", got "${String(data.version)}"` });
  }
  if (!data.project?.name) {
    errors.push({ path: 'project.name', message: 'Required field missing' });
  }
  if (!Array.isArray(data.nodes)) {
    errors.push({ path: 'nodes', message: 'Must be an array' });
  }
  if (!Array.isArray(data.edges)) {
    errors.push({ path: 'edges', message: 'Must be an array' });
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  if (Array.isArray(data.nodes)) {
    for (let i = 0; i < data.nodes.length; i++) {
      const node = data.nodes[i]!;
      const prefix = `nodes[${i}]`;
      if (!node.id) errors.push({ path: `${prefix}.id`, message: 'Required' });
      if (!node.category) errors.push({ path: `${prefix}.category`, message: 'Required' });
      if (!node.label) errors.push({ path: `${prefix}.label`, message: 'Required' });
      if (typeof node.layer !== 'number') errors.push({ path: `${prefix}.layer`, message: 'Must be a number' });
      if (node.id && nodeIds.has(node.id)) {
        errors.push({ path: `${prefix}.id`, message: `Duplicate node id: "${node.id}"` });
      }
      if (node.id) nodeIds.add(node.id);
    }
  }

  // Validate edges reference existing nodes
  if (Array.isArray(data.edges)) {
    for (let i = 0; i < data.edges.length; i++) {
      const edge = data.edges[i]!;
      const prefix = `edges[${i}]`;
      if (!edge.source) errors.push({ path: `${prefix}.source`, message: 'Required' });
      if (!edge.target) errors.push({ path: `${prefix}.target`, message: 'Required' });
      if (edge.source && !nodeIds.has(edge.source)) {
        errors.push({ path: `${prefix}.source`, message: `References unknown node: "${edge.source}"` });
      }
      if (edge.target && !nodeIds.has(edge.target)) {
        errors.push({ path: `${prefix}.target`, message: `References unknown node: "${edge.target}"` });
      }
    }
  }

  // Validate use cases reference existing nodes
  if (Array.isArray(data.useCases)) {
    for (let i = 0; i < data.useCases.length; i++) {
      const uc = data.useCases[i]!;
      const prefix = `useCases[${i}]`;
      if (!uc.id) errors.push({ path: `${prefix}.id`, message: 'Required' });
      if (!uc.name) errors.push({ path: `${prefix}.name`, message: 'Required' });
      if (Array.isArray(uc.nodeIds)) {
        for (const nodeId of uc.nodeIds) {
          if (!nodeIds.has(nodeId)) {
            errors.push({ path: `${prefix}.nodeIds`, message: `References unknown node: "${nodeId}"` });
          }
        }
      }
    }
  }

  return { data, errors };
}
