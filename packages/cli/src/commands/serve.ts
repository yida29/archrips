import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { build } from './build.js';
import { validateViewerDir } from '../utils/validate.js';

export async function serve(): Promise<void> {
  const projectDir = process.cwd();
  const distDir = join(projectDir, '.archrip', 'dist');
  const viewerDir = join(projectDir, '.archrip', 'viewer');

  // Auto-build if dist doesn't exist (build auto-installs viewer if needed)
  if (!existsSync(join(distDir, 'index.html'))) {
    console.log('No build found. Running build first...\n');
    await build();
  }

  // Verify viewer origin before executing anything in that directory
  validateViewerDir(viewerDir);

  console.log('\narchrip serve — Starting preview server...\n');

  // Use vite preview to serve the built files
  try {
    execSync('npm run preview -- --port 4173 --open', {
      cwd: viewerDir,
      stdio: 'inherit',
    });
  } catch (err: unknown) {
    // Ctrl+C (SIGINT) → status is null, exit silently
    if (err instanceof Error && 'status' in err && (err as NodeJS.ErrnoException & { status: number | null }).status !== null) {
      throw new Error('Failed to start preview server.');
    }
  }
}
