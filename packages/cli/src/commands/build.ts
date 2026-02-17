import { existsSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { loadAndValidate, validateViewerDir } from '../utils/validate.js';
import type { ArchitectureData } from '../utils/validate.js';
import { computeLayout } from '../utils/layout.js';
import { installViewer } from '../install/viewer.js';
import { updateGitignore } from '../utils/gitignore.js';

function writeProcessedArchitecture(
  viewerDir: string,
  data: ArchitectureData,
  layoutMap: Record<string, { x: number; y: number }>,
): void {
  const viewerPublic = join(viewerDir, 'public');
  mkdirSync(viewerPublic, { recursive: true });

  const processedData = {
    ...data,
    _layout: layoutMap,
  };
  writeFileSync(join(viewerPublic, 'architecture.json'), JSON.stringify(processedData, null, 2));
  console.log('  Wrote public/architecture.json (with layout data)');
}

function execSyncWithOutput(command: string, cwd: string): void {
  try {
    execSync(command, { cwd, stdio: 'pipe' });
  } catch (err: unknown) {
    if (err instanceof Error && 'stderr' in err) {
      const stderr = String((err as NodeJS.ErrnoException & { stderr: Buffer }).stderr).trim();
      if (stderr) {
        throw new Error(`Command "${command}" failed:\n${stderr}`);
      }
    }
    throw new Error(`Command "${command}" failed.`);
  }
}

function runViewerBuild(viewerDir: string, distDir: string): void {
  console.log('Installing viewer dependencies...');
  execSyncWithOutput('npm ci', viewerDir);

  console.log('Building viewer...');
  execSyncWithOutput('npm run build', viewerDir);

  mkdirSync(distDir, { recursive: true });
  const viewerDist = join(viewerDir, 'dist');
  if (existsSync(viewerDist)) {
    cpSync(viewerDist, distDir, { recursive: true });
  }
}

export async function build(): Promise<void> {
  const projectDir = process.cwd();
  const archripDir = join(projectDir, '.archrip');
  const archJsonPath = join(archripDir, 'architecture.json');
  const viewerDir = join(archripDir, 'viewer');
  const distDir = join(archripDir, 'dist');

  console.log('\narchrip build\n');

  // 1. Check architecture.json exists
  if (!existsSync(archJsonPath)) {
    throw new Error(
      '.archrip/architecture.json not found.\n'
      + 'Run /archrip:scan (or /archrip-scan) to generate it.',
    );
  }

  // 2. Auto-setup viewer if not present
  if (!existsSync(viewerDir)) {
    console.log('Setting up viewer...');
    mkdirSync(archripDir, { recursive: true });
    installViewer(archripDir);
    updateGitignore(projectDir);
  }
  validateViewerDir(viewerDir);

  // 3. Validate architecture.json
  console.log('Validating architecture.json...');
  const { data, errors } = loadAndValidate(archJsonPath);
  if (errors.length > 0) {
    const details = errors.map((err) => `  - ${err.path}: ${err.message}`).join('\n');
    throw new Error(`Validation errors:\n${details}`);
  }
  console.log(`  ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.useCases?.length ?? 0} use cases`);

  // 4. Compute dagre layout
  console.log('Computing layout...');
  const layout = computeLayout(data);
  const layoutMap: Record<string, { x: number; y: number }> = {};
  for (const node of layout.nodes) {
    layoutMap[node.id] = { x: node.x, y: node.y };
  }

  // 5. Write processed data to viewer's public/
  writeProcessedArchitecture(viewerDir, data, layoutMap);

  // 6. Build viewer and copy dist
  runViewerBuild(viewerDir, distDir);

  console.log(`\nBuild complete! Output: .archrip/dist/`);
  console.log('Run `npx archrip serve` to preview.');
}
