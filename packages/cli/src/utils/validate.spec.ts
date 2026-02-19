import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadAndValidate, validateViewerDir, resolveSourceUrl } from './validate.js';

// ─── Helpers ───

function createTmpDir(): string {
  const dir = join(tmpdir(), `archrip-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function minimalArchData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: '1.0',
    project: { name: 'test' },
    nodes: [
      { id: 'a', category: 'service', label: 'A', layer: 0 },
      { id: 'b', category: 'model', label: 'B', layer: 1 },
    ],
    edges: [{ source: 'a', target: 'b' }],
    ...overrides,
  };
}

function writeArchJson(dir: string, data: Record<string, unknown>): string {
  const filePath = join(dir, 'architecture.json');
  writeFileSync(filePath, JSON.stringify(data));
  return filePath;
}

// ─── loadAndValidate ───

describe('loadAndValidate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('valid data', () => {
    it('should return no errors for minimal valid architecture', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData());
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should return parsed data with correct node count', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData());
      const { data } = loadAndValidate(filePath);
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
    });

    it('should accept valid sourceUrl with https', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        project: { name: 'test', sourceUrl: 'https://github.com/user/repo/blob/main/{filePath}' },
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });
  });

  describe('version validation', () => {
    it('should reject invalid version', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({ version: '2.0' }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'version' }),
      );
    });
  });

  describe('project validation', () => {
    it('should require project.name', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({ project: {} }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'project.name' }),
      );
    });
  });

  describe('sourceUrl validation', () => {
    it('should reject javascript: protocol', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        project: { name: 'test', sourceUrl: 'javascript:alert(1)//{filePath}' },
      }));
      const { errors } = loadAndValidate(filePath);
      const sourceUrlErrors = errors.filter((e) => e.path === 'project.sourceUrl');
      expect(sourceUrlErrors.length).toBeGreaterThan(0);
    });

    it('should reject data: protocol', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        project: { name: 'test', sourceUrl: 'data:text/html,<script>alert(1)</script>' },
      }));
      const { errors } = loadAndValidate(filePath);
      const sourceUrlErrors = errors.filter((e) => e.path === 'project.sourceUrl');
      expect(sourceUrlErrors.length).toBeGreaterThan(0);
    });

    it('should reject invalid URL template', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        project: { name: 'test', sourceUrl: 'not-a-url' },
      }));
      const { errors } = loadAndValidate(filePath);
      const sourceUrlErrors = errors.filter((e) => e.path === 'project.sourceUrl');
      expect(sourceUrlErrors.length).toBeGreaterThan(0);
    });

    it('should accept http URL', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        project: { name: 'test', sourceUrl: 'http://gitlab.local/repo/-/blob/main/{filePath}' },
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });
  });

  describe('node validation', () => {
    it('should require node id, category, and label', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ layer: 0 }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(expect.objectContaining({ path: 'nodes[0].id' }));
      expect(errors).toContainEqual(expect.objectContaining({ path: 'nodes[0].category' }));
      expect(errors).toContainEqual(expect.objectContaining({ path: 'nodes[0].label' }));
    });

    it('should require layer to be a number', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 'not-a-number' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].layer', message: 'Must be a number' }),
      );
    });

    it('should reject layer outside 0-100 range', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 101 }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].layer' }),
      );
    });

    it('should reject duplicate node ids', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'dup', category: 'service', label: 'A', layer: 0 },
          { id: 'dup', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Duplicate') }),
      );
    });

    it('should reject filePath with path traversal', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 0, filePath: '../etc/passwd' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].filePath' }),
      );
    });

    it('should reject filePath with nested path traversal', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 0, filePath: 'foo/../../bar' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].filePath' }),
      );
    });

    it('should accept filePath with double dots in filename', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 0, filePath: 'foo..bar/baz.ts' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should reject filePath with backslash path traversal', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 0, filePath: 'foo\\..\\bar' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].filePath' }),
      );
    });

    it('should reject absolute filePath', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'x', category: 'service', label: 'X', layer: 0, filePath: '/etc/passwd' }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].filePath' }),
      );
    });

    it('should reject node.id with invalid pattern', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [{ id: 'Invalid_ID', category: 'service', label: 'X', layer: 0 }],
        edges: [],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].id', message: expect.stringContaining('kebab-case') }),
      );
    });

    it('should accept valid kebab-case node.id', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'svc-users', category: 'service', label: 'A', layer: 0 },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'svc-users', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

  });

  describe('edge validation', () => {
    it('should reject edges referencing unknown nodes', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{ source: 'a', target: 'unknown' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('unknown') }),
      );
    });

    it('should reject invalid edge.type', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{ source: 'a', target: 'b', type: 'invalid' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'edges[0].type', message: expect.stringContaining('Must be one of') }),
      );
    });

    it('should accept valid edge.type values', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{ source: 'a', target: 'b', type: 'dependency' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should accept edge without type (optional)', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });
  });

  describe('use case validation', () => {
    it('should reject use cases referencing unknown nodes', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        useCases: [{ id: 'uc1', name: 'Test', nodeIds: ['a', 'nonexistent'] }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'useCases[0].nodeIds' }),
      );
    });
  });

  describe('orphan node detection', () => {
    it('should warn about nodes with no edges', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'a', category: 'service', label: 'A', layer: 0 },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
          { id: 'c', category: 'dto', label: 'C', layer: 2 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { warnings } = loadAndValidate(filePath);
      expect(warnings).toContainEqual(
        expect.objectContaining({ path: 'nodes', message: 'Orphan node "c" has no edges' }),
      );
    });

    it('should not warn when all nodes are connected', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData());
      const { warnings } = loadAndValidate(filePath);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('should accept node with all metadata types', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: [
              { label: 'Summary', value: 'Some description' },
              { label: 'ARN', value: 'arn:aws:lambda:...', type: 'code' },
              { label: 'Docs', value: 'https://example.com', type: 'link' },
              { label: 'SLA', value: ['99.9%', 'p95 < 200ms'], type: 'list' },
              { label: 'Default text', value: 'plain', type: 'text' },
            ],
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should accept node with type omitted (defaults to text)', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: [{ label: 'Note', value: 'hello' }],
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should accept node without metadata (backward compatible)', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData());
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should reject metadata entry missing label', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: [{ value: 'no label' }],
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].metadata[0].label', message: 'Required string' }),
      );
    });

    it('should reject metadata entry missing value', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: [{ label: 'No value' }],
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].metadata[0].value', message: 'Required' }),
      );
    });

    it('should reject invalid metadata type', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: [{ label: 'X', value: 'y', type: 'invalid' }],
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].metadata[0].type', message: expect.stringContaining('Must be one of') }),
      );
    });

    it('should reject non-array metadata', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          {
            id: 'a', category: 'service', label: 'A', layer: 0,
            metadata: 'not-an-array',
          },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
        ],
        edges: [{ source: 'a', target: 'b' }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'nodes[0].metadata', message: 'Must be an array' }),
      );
    });

    it('should accept edge with description and metadata', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{
          source: 'a', target: 'b',
          description: 'Delegates CRUD operations',
          metadata: [
            { label: 'SQL', value: 'SELECT * FROM users', type: 'code' },
          ],
        }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid metadata on edges', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        edges: [{
          source: 'a', target: 'b',
          metadata: [{ label: 'X' }],
        }],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'edges[0].metadata[0].value', message: 'Required' }),
      );
    });
  });

  describe('circular dependency detection', () => {
    it('should detect circular edges', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'a', category: 'service', label: 'A', layer: 0 },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
          { id: 'c', category: 'model', label: 'C', layer: 2 },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'b', target: 'c' },
          { source: 'c', target: 'a' },
        ],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Circular') }),
      );
    });

    it('should not report cycle for DAG', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'a', category: 'service', label: 'A', layer: 0 },
          { id: 'b', category: 'model', label: 'B', layer: 1 },
          { id: 'c', category: 'model', label: 'C', layer: 2 },
        ],
        edges: [
          { source: 'a', target: 'b' },
          { source: 'a', target: 'c' },
          { source: 'b', target: 'c' },
        ],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });

    it('should exclude relation edges from cycle detection', () => {
      const filePath = writeArchJson(tmpDir, minimalArchData({
        nodes: [
          { id: 'a', category: 'controller', label: 'A', layer: 0 },
          { id: 'b', category: 'service', label: 'B', layer: 1 },
          { id: 'c', category: 'dto', label: 'C', layer: 2 },
        ],
        edges: [
          { source: 'a', target: 'b', type: 'dependency' },
          { source: 'b', target: 'c', type: 'dependency' },
          { source: 'c', target: 'a', type: 'relation' },
        ],
      }));
      const { errors } = loadAndValidate(filePath);
      expect(errors).toHaveLength(0);
    });
  });
});

// ─── validateViewerDir ───

describe('validateViewerDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupValidViewer(baseDir: string): string {
    const archripDir = join(baseDir, '.archrip');
    const viewerDir = join(archripDir, 'viewer');
    mkdirSync(viewerDir, { recursive: true });
    writeFileSync(join(viewerDir, '.archrip-viewer'), 'archrip-official-viewer\n');
    writeFileSync(join(viewerDir, 'package.json'), JSON.stringify({ name: 'archrip-viewer' }));
    return viewerDir;
  }

  it('should not throw for valid viewer directory', () => {
    const viewerDir = setupValidViewer(tmpDir);
    expect(() => validateViewerDir(viewerDir)).not.toThrow();
  });

  it('should throw when viewer directory does not exist', () => {
    expect(() => validateViewerDir(join(tmpDir, 'nonexistent'))).toThrow('not found');
  });

  it('should throw when marker file is missing', () => {
    const archripDir = join(tmpDir, '.archrip');
    const viewerDir = join(archripDir, 'viewer');
    mkdirSync(viewerDir, { recursive: true });
    writeFileSync(join(viewerDir, 'package.json'), JSON.stringify({ name: 'archrip-viewer' }));
    expect(() => validateViewerDir(viewerDir)).toThrow('official archrip viewer');
  });

  it('should throw when marker file has wrong content', () => {
    const archripDir = join(tmpDir, '.archrip');
    const viewerDir = join(archripDir, 'viewer');
    mkdirSync(viewerDir, { recursive: true });
    writeFileSync(join(viewerDir, '.archrip-viewer'), 'malicious-viewer\n');
    writeFileSync(join(viewerDir, 'package.json'), JSON.stringify({ name: 'archrip-viewer' }));
    expect(() => validateViewerDir(viewerDir)).toThrow('official archrip viewer');
  });

  it('should throw when package.json has wrong name', () => {
    const archripDir = join(tmpDir, '.archrip');
    const viewerDir = join(archripDir, 'viewer');
    mkdirSync(viewerDir, { recursive: true });
    writeFileSync(join(viewerDir, '.archrip-viewer'), 'archrip-official-viewer\n');
    writeFileSync(join(viewerDir, 'package.json'), JSON.stringify({ name: 'malicious-app' }));
    expect(() => validateViewerDir(viewerDir)).toThrow('unexpected name');
  });

  it('should throw when viewer is a symlink', () => {
    const archripDir = join(tmpDir, '.archrip');
    mkdirSync(archripDir, { recursive: true });
    const realDir = join(tmpDir, 'real-viewer');
    mkdirSync(realDir);
    const viewerDir = join(archripDir, 'viewer');
    symlinkSync(realDir, viewerDir);
    expect(() => validateViewerDir(viewerDir)).toThrow('symbolic link');
  });
});

// ─── resolveSourceUrl ───

describe('resolveSourceUrl', () => {
  it('should resolve GitHub-style URL template', () => {
    const result = resolveSourceUrl(
      'https://github.com/user/repo/blob/main/{filePath}',
      'src/index.ts',
    );
    expect(result).toBe('https://github.com/user/repo/blob/main/src/index.ts');
  });

  it('should encode special characters in filePath segments', () => {
    const result = resolveSourceUrl(
      'https://github.com/user/repo/blob/main/{filePath}',
      'src/my file.ts',
    );
    expect(result).toContain('my%20file.ts');
    expect(result).toMatch(/^https:\/\//);
  });

  it('should preserve path separators while encoding segments', () => {
    const result = resolveSourceUrl(
      'https://github.com/user/repo/blob/main/{filePath}',
      'src/utils/validate.ts',
    );
    expect(result).toBe('https://github.com/user/repo/blob/main/src/utils/validate.ts');
  });

  it('should return empty string for javascript: protocol', () => {
    const result = resolveSourceUrl('javascript:alert(1)//{filePath}', 'test.ts');
    expect(result).toBe('');
  });

  it('should return empty string for data: protocol', () => {
    const result = resolveSourceUrl('data:text/html,{filePath}', 'test.ts');
    expect(result).toBe('');
  });

  it('should return empty string for ftp: protocol', () => {
    const result = resolveSourceUrl('ftp://example.com/{filePath}', 'test.ts');
    expect(result).toBe('');
  });

  it('should return empty string when template is undefined', () => {
    expect(resolveSourceUrl(undefined, 'test.ts')).toBe('');
  });

  it('should return empty string when template is empty', () => {
    expect(resolveSourceUrl('', 'test.ts')).toBe('');
  });

  it('should return empty string when filePath is empty', () => {
    expect(resolveSourceUrl('https://example.com/{filePath}', '')).toBe('');
  });

  it('should return empty string for invalid URL template', () => {
    expect(resolveSourceUrl('not-a-url/{filePath}', 'test.ts')).toBe('');
  });

  it('should accept http URL', () => {
    const result = resolveSourceUrl('http://gitlab.local/{filePath}', 'test.ts');
    expect(result).toBe('http://gitlab.local/test.ts');
  });
});
