// ─── Category system ───
// Standard 8 categories. Custom categories are allowed — they get a fallback color.

export const STANDARD_CATEGORIES = [
  'controller', 'service', 'port', 'adapter', 'model', 'external', 'job', 'dto',
] as const;

export type StandardCategory = typeof STANDARD_CATEGORIES[number];

export interface CategoryStyle {
  bg: string;
  border: string;
  text: string;
}

const STANDARD_COLORS: Record<StandardCategory, CategoryStyle> = {
  controller: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  service:    { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  port:       { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  adapter:    { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  model:      { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  external:   { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
  job:        { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  dto:        { bg: '#cffafe', border: '#06b6d4', text: '#155e75' },
};

const FALLBACK_COLOR: CategoryStyle = { bg: '#f5f5f4', border: '#a8a29e', text: '#44403c' };

export function getCategoryColors(category: string): CategoryStyle {
  return STANDARD_COLORS[category as StandardCategory] ?? FALLBACK_COLOR;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<StandardCategory, string> = {
    controller: 'Controller',
    service:    'Service',
    port:       'Port',
    adapter:    'Adapter',
    model:      'Model / DB',
    external:   'External',
    job:        'Job',
    dto:        'DTO',
  };
  return labels[category as StandardCategory] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

// ─── Data types ───

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

export interface ArchNodeData {
  [key: string]: unknown;
  label: string;
  category: string;
  description: string;
  filePath: string;
  sourceUrl: string;
  methods?: string[];
  useCases: string[];
  schema?: TableSchema;
  sqlExamples?: string[];
  routes?: string[];
  implements?: string;
  externalService?: string;
}

export interface UseCase {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
  flow?: string[];
}
