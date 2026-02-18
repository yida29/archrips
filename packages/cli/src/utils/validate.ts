import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { join, resolve } from 'node:path';

export interface ArchitectureData {
  version: string;
  project: {
    name: string;
    description?: string;
    language?: string;
    framework?: string;
    sourceUrl?: string;
    layout?: 'dagre' | 'concentric';
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
  depth?: number;
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

// Keep in sync with packages/viewer/src/types.ts (ColumnSchema, TableSchema)
export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  index?: string;
  foreignKey?: { table: string; column: string; onDelete?: string };
}

// Keep in sync with packages/viewer/src/types.ts (ColumnSchema, TableSchema)
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
 * Verify that the viewer directory was created by `archrip init`.
 * Checks: existence, symlink rejection, path containment, marker file, package.json name.
 * Throws if any check fails.
 */
export function validateViewerDir(viewerDir: string): void {
  if (!existsSync(viewerDir)) {
    throw new Error(
      '.archrip/viewer/ not found.\nRun `npx archrip build` to auto-setup the viewer.',
    );
  }

  // Reject symlinks — prevent redirection to arbitrary directories
  if (lstatSync(viewerDir).isSymbolicLink()) {
    throw new Error(
      '.archrip/viewer/ is a symbolic link, which is not allowed.\n'
      + 'This is a safety check to prevent executing code outside the project.\n'
      + 'Remove the symlink and re-run `npx archrip build`.',
    );
  }

  // Ensure realpath stays within .archrip/
  const archripDir = resolve(viewerDir, '..');
  const realViewerDir = realpathSync(viewerDir);
  const realArchripsDir = realpathSync(archripDir);
  if (!realViewerDir.startsWith(realArchripsDir + '/')) {
    throw new Error(
      '.archrip/viewer/ resolves outside of .archrip/.\n'
      + 'This is a safety check to prevent executing code outside the project.',
    );
  }

  // Check marker file
  const markerPath = join(viewerDir, '.archrip-viewer');
  if (!existsSync(markerPath) || readFileSync(markerPath, 'utf-8').trim() !== 'archrip-official-viewer') {
    throw new Error(
      '.archrip/viewer/ does not appear to be an official archrip viewer.\n'
      + 'This is a safety check to prevent executing untrusted code.\n'
      + 'Remove .archrip/viewer/ and re-run `npx archrip build` to reinstall.',
    );
  }

  // Verify package.json identity
  const pkgJsonPath = join(viewerDir, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(
      '.archrip/viewer/package.json not found.\n'
      + 'Remove .archrip/viewer/ and re-run `npx archrip build` to reinstall.',
    );
  }
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
  if (pkg.name !== 'archrip-viewer') {
    throw new Error(
      '.archrip/viewer/package.json has unexpected name.\n'
      + 'This is a safety check to prevent executing untrusted code.\n'
      + 'Remove .archrip/viewer/ and re-run `npx archrip build` to reinstall.',
    );
  }
}

/**
 * Load and validate architecture.json.
 * Does structural validation without requiring ajv (zero extra dependencies).
 */
export function loadAndValidate(filePath: string): { data: ArchitectureData; errors: ValidationError[]; warnings: ValidationError[] } {
  const raw = readFileSync(filePath, 'utf-8');
  let data: ArchitectureData;
  try {
    data = JSON.parse(raw) as ArchitectureData;
  } catch {
    return { data: { version: '', project: { name: '' }, nodes: [], edges: [] }, errors: [{ path: 'root', message: 'Invalid JSON — failed to parse architecture.json' }], warnings: [] };
  }
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required top-level fields
  if (data.version !== '1.0') {
    errors.push({ path: 'version', message: `Expected "1.0", got "${String(data.version)}"` });
  }
  if (!data.project?.name) {
    errors.push({ path: 'project.name', message: 'Required field missing' });
  }
  if (data.project?.sourceUrl) {
    try {
      const url = new URL(data.project.sourceUrl.replace('{filePath}', 'test'));
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push({ path: 'project.sourceUrl', message: 'Must use http: or https: protocol' });
      }
    } catch {
      errors.push({ path: 'project.sourceUrl', message: 'Must be a valid URL template' });
    }
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
      if (!node.id) {
        errors.push({ path: `${prefix}.id`, message: 'Required' });
      } else if (!/^[a-z][a-z0-9-]*$/.test(node.id)) {
        errors.push({ path: `${prefix}.id`, message: 'Must be lowercase kebab-case (e.g. "svc-users")' });
      }
      if (!node.category) errors.push({ path: `${prefix}.category`, message: 'Required' });
      if (!node.label) errors.push({ path: `${prefix}.label`, message: 'Required' });
      if (typeof node.layer !== 'number') {
        errors.push({ path: `${prefix}.layer`, message: 'Must be a number' });
      } else if (!Number.isInteger(node.layer) || node.layer < 0 || node.layer > 100) {
        errors.push({ path: `${prefix}.layer`, message: 'Must be an integer between 0 and 100' });
      }
      if (node.depth !== undefined && (node.depth !== 0 && node.depth !== 1 && node.depth !== 2)) {
        errors.push({ path: `${prefix}.depth`, message: 'Must be 0, 1, or 2' });
      }
      if (node.filePath) {
        if (path.isAbsolute(node.filePath) || node.filePath.split(/[/\\]/).some(seg => seg === '..')) {
          errors.push({ path: `${prefix}.filePath`, message: 'Must be a relative path without ".." segments' });
        }
      }
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
      const VALID_EDGE_TYPES = ['dependency', 'implements', 'relation'];
      if (edge.type !== undefined && !VALID_EDGE_TYPES.includes(edge.type)) {
        errors.push({ path: `${prefix}.type`, message: `Must be one of: ${VALID_EDGE_TYPES.join(', ')}` });
      }
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

  // Detect orphan nodes (nodes with no edges) — reported as warnings, not errors
  if (Array.isArray(data.edges) && Array.isArray(data.nodes)) {
    const connectedNodes = new Set<string>();
    for (const edge of data.edges) {
      if (edge.source) connectedNodes.add(edge.source);
      if (edge.target) connectedNodes.add(edge.target);
    }
    for (const node of data.nodes) {
      if (node.id && !connectedNodes.has(node.id)) {
        warnings.push({
          path: 'nodes',
          message: `Orphan node "${node.id}" has no edges`,
        });
      }
    }
  }

  // Detect circular edges
  if (Array.isArray(data.edges) && nodeIds.size > 0) {
    const adj = new Map<string, string[]>();
    for (const edge of data.edges) {
      if (edge.source && edge.target && edge.type !== 'relation') {
        const targets = adj.get(edge.source);
        if (targets) {
          targets.push(edge.target);
        } else {
          adj.set(edge.source, [edge.target]);
        }
      }
    }
    const visited = new Set<string>();
    const inStack = new Set<string>();
    let hasCycle = false;
    function dfs(node: string): void {
      if (hasCycle) return;
      visited.add(node);
      inStack.add(node);
      for (const neighbor of adj.get(node) ?? []) {
        if (inStack.has(neighbor)) {
          hasCycle = true;
          errors.push({ path: 'edges', message: `Circular dependency detected involving "${neighbor}"` });
          return;
        }
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }
      inStack.delete(node);
    }
    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
        if (hasCycle) break;
      }
    }
  }

  return { data, errors, warnings };
}

/**
 * Resolve a sourceUrl template with a filePath.
 * Encodes path segments and only allows http/https URLs.
 * Keep in sync with packages/viewer/src/data/loader.ts (resolveSourceUrl)
 */
export function resolveSourceUrl(template: string | undefined, filePath: string): string {
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
