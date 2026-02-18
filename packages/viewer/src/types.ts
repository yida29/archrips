// ─── Depth system ───

export type DepthLevel = 0 | 1 | 2;

export function computeDepths(nodes: { layer: number }[]): Map<number, DepthLevel> {
  if (nodes.length === 0) return new Map();
  const layers = [...new Set(nodes.map(n => n.layer))].sort((a, b) => a - b);

  const map = new Map<number, DepthLevel>();

  // Flat / workflow: filtering not useful — always show all
  if (layers.length <= 2) {
    for (const l of layers) map.set(l, 0);
    return map;
  }

  // Exactly 3 layers: 1:1:1 mapping
  if (layers.length === 3) {
    map.set(layers[0], 0);
    map.set(layers[1], 1);
    map.set(layers[2], 2);
    return map;
  }

  // 4+ layers: equal thirds
  const min = layers[0];
  const max = layers[layers.length - 1];
  const range = max - min;
  const t1 = min + range / 3;
  const t2 = min + (2 * range) / 3;
  for (const l of layers) {
    if (l <= t1) map.set(l, 0);
    else if (l <= t2) map.set(l, 1);
    else map.set(l, 2);
  }
  return map;
}

export const DEPTH_LEVELS = [
  { level: 0 as const, label: 'Overview' },
  { level: 1 as const, label: 'Structure' },
  { level: 2 as const, label: 'Detail' },
] as const;

// ─── Category system ───
// Standard 8 categories. Custom categories are allowed — they get a fallback color.

export interface CategoryStyle {
  bg: string;
  border: string;
  text: string;
}

interface CategoryMeta {
  label: string;
  icon: string;
  color: CategoryStyle;
}

const CATEGORY_META = {
  controller: { label: 'Controller', icon: '\u{1F310}', color: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' } },
  service:    { label: 'Service',    icon: '\u{2699}\u{FE0F}', color: { bg: '#dcfce7', border: '#22c55e', text: '#166534' } },
  port:       { label: 'Port',       icon: '\u{1F50C}', color: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' } },
  adapter:    { label: 'Adapter',    icon: '\u{1F527}', color: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' } },
  model:      { label: 'Model / DB', icon: '\u{1F4BE}', color: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' } },
  external:   { label: 'External',   icon: '\u{2601}\u{FE0F}', color: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' } },
  job:        { label: 'Job',        icon: '\u{23F0}', color: { bg: '#fef9c3', border: '#eab308', text: '#854d0e' } },
  dto:        { label: 'DTO',        icon: '\u{1F4E6}', color: { bg: '#cffafe', border: '#06b6d4', text: '#155e75' } },
} as const satisfies Record<string, CategoryMeta>;

export type StandardCategory = keyof typeof CATEGORY_META;

const FALLBACK_META: CategoryMeta = { label: '', icon: '\u{1F4C4}', color: { bg: '#f5f5f4', border: '#a8a29e', text: '#44403c' } };

function getMeta(category: string): CategoryMeta {
  return CATEGORY_META[category as StandardCategory] ?? FALLBACK_META;
}

const STANDARD_CATEGORIES = ['controller', 'service', 'port', 'adapter', 'model', 'external', 'job', 'dto'] as const;

export function getCategoryColors(category: string): CategoryStyle {
  const key = (STANDARD_CATEGORIES as readonly string[]).includes(category) ? category : 'fallback';
  return {
    bg: `var(--cat-${key}-bg)`,
    border: `var(--cat-${key}-border)`,
    text: `var(--cat-${key}-text)`,
  };
}

export function getCategoryLabel(category: string): string {
  const meta = getMeta(category);
  return meta.label || category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryIcon(category: string): string {
  return getMeta(category).icon;
}

// ─── React Flow node type alias ───

import type { Node } from '@xyflow/react';

// ─── Data types ───
// Keep in sync with packages/cli/src/utils/validate.ts (ColumnSchema, TableSchema)

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

export interface MemberNodeSummary {
  id: string;
  label: string;
  description: string;
  filePath: string;
  sourceUrl: string;
}

export interface ArchNodeData {
  [key: string]: unknown;
  label: string;
  category: string;
  depth: DepthLevel;
  description: string;
  filePath: string;
  sourceUrl: string;
  layer?: number;
  methods?: string[];
  useCases: string[];
  schema?: TableSchema;
  sqlExamples?: string[];
  routes?: string[];
  implements?: string;
  externalService?: string;
  isGroup?: boolean;
  memberCount?: number;
  memberNodes?: MemberNodeSummary[];
}

export function isGroupNode(data: ArchNodeData): boolean {
  return data.isGroup === true;
}

export interface UseCase {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
  flow?: string[];
}

// ─── React Flow typed node ───

export type ArchFlowNode = Node<ArchNodeData>;
