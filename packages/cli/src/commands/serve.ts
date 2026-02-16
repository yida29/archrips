import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { build } from './build.js';

export async function serve(): Promise<void> {
  const projectDir = process.cwd();
  const distDir = join(projectDir, '.archrips', 'dist');
  const viewerDir = join(projectDir, '.archrips', 'viewer');

  // Auto-build if dist doesn't exist
  if (!existsSync(join(distDir, 'index.html'))) {
    console.log('No build found. Running build first...\n');
    await build();
  }

  console.log('\narchrips serve — Starting preview server...\n');

  // Use vite preview to serve the built files
  try {
    execSync('npx vite preview --port 4173 --open', {
      cwd: viewerDir,
      stdio: 'inherit',
    });
  } catch {
    // User interrupted with Ctrl+C — that's fine
  }
}
