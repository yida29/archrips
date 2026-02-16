import { existsSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { loadAndValidate } from '../utils/validate.js';
import { computeLayout } from '../utils/layout.js';

export async function build(): Promise<void> {
  const projectDir = process.cwd();
  const archripsDir = join(projectDir, '.archrips');
  const archJsonPath = join(archripsDir, 'architecture.json');
  const viewerDir = join(archripsDir, 'viewer');
  const distDir = join(archripsDir, 'dist');

  console.log('\narchrips build\n');

  // 1. Check architecture.json exists
  if (!existsSync(archJsonPath)) {
    console.error('Error: .archrips/architecture.json not found.');
    console.error('Run `npx archrips init .` first, then use /archrips-scan to generate data.');
    process.exit(1);
  }

  // 2. Check viewer exists
  if (!existsSync(viewerDir)) {
    console.error('Error: .archrips/viewer/ not found.');
    console.error('Run `npx archrips init .` to set up the viewer.');
    process.exit(1);
  }

  // 3. Validate architecture.json
  console.log('Validating architecture.json...');
  const { data, errors } = loadAndValidate(archJsonPath);
  if (errors.length > 0) {
    console.error('Validation errors:');
    for (const err of errors) {
      console.error(`  - ${err.path}: ${err.message}`);
    }
    process.exit(1);
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
  const viewerPublic = join(viewerDir, 'public');
  mkdirSync(viewerPublic, { recursive: true });

  const processedData = {
    ...data,
    _layout: layoutMap,
  };
  writeFileSync(join(viewerPublic, 'architecture.json'), JSON.stringify(processedData, null, 2));
  console.log('  Wrote public/architecture.json (with layout data)');

  // 6. Install viewer dependencies
  console.log('Installing viewer dependencies...');
  execSync('npm install', { cwd: viewerDir, stdio: 'pipe' });

  // 7. Build viewer
  console.log('Building viewer...');
  execSync('npx vite build', { cwd: viewerDir, stdio: 'pipe' });

  // 8. Copy dist
  mkdirSync(distDir, { recursive: true });
  const viewerDist = join(viewerDir, 'dist');
  if (existsSync(viewerDist)) {
    cpSync(viewerDist, distDir, { recursive: true });
  }

  console.log(`\nBuild complete! Output: .archrips/dist/`);
  console.log('Run `npx archrips serve` to preview.');
}
