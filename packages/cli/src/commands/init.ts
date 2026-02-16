import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectAgents, getAllAgentTypes } from '../utils/detect-agents.js';
import type { AgentType } from '../utils/detect-agents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageRoot(): string {
  // In dist: dist/commands/init.js → go up to package root
  // In src: src/commands/init.ts → go up to package root
  return resolve(__dirname, '..', '..');
}

function getTemplatesDir(): string {
  const pkgRoot = getPackageRoot();
  // Check dist first (published), then src (development)
  const distTemplates = join(pkgRoot, 'templates');
  if (existsSync(distTemplates)) return distTemplates;
  return join(pkgRoot, 'src', 'templates');
}

function getViewerDir(): string {
  const pkgRoot = getPackageRoot();
  // Monorepo: packages/cli → packages/viewer
  return resolve(pkgRoot, '..', 'viewer');
}

/**
 * Detect project info from common config files.
 */
function detectProjectInfo(projectDir: string): { name: string; language: string; framework: string } {
  let name = '';
  let language = '';
  let framework = '';

  // package.json → Node.js project
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    name = (pkg.name as string) ?? '';
    language = 'TypeScript/JavaScript';
    // Detect framework from dependencies
    const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) };
    if (deps['next']) framework = 'Next.js';
    else if (deps['nuxt']) framework = 'Nuxt';
    else if (deps['@angular/core']) framework = 'Angular';
    else if (deps['vue']) framework = 'Vue';
    else if (deps['react']) framework = 'React';
    else if (deps['express']) framework = 'Express';
    else if (deps['fastify']) framework = 'Fastify';
    else if (deps['hono']) framework = 'Hono';
    else if (deps['nestjs'] || deps['@nestjs/core']) framework = 'NestJS';
  }

  // composer.json → PHP project
  const composerPath = join(projectDir, 'composer.json');
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, 'utf-8')) as Record<string, unknown>;
    name = name || ((composer.name as string) ?? '');
    language = 'PHP';
    const require = composer.require as Record<string, string> ?? {};
    if (require['laravel/framework']) framework = 'Laravel';
    else if (require['symfony/framework-bundle']) framework = 'Symfony';
  }

  // go.mod → Go project
  if (existsSync(join(projectDir, 'go.mod'))) {
    const goMod = readFileSync(join(projectDir, 'go.mod'), 'utf-8');
    const moduleMatch = goMod.match(/^module\s+(.+)$/m);
    name = name || (moduleMatch?.[1] ?? '');
    language = 'Go';
  }

  // Cargo.toml → Rust project
  if (existsSync(join(projectDir, 'Cargo.toml'))) {
    language = 'Rust';
  }

  // build.gradle → Java/Kotlin project
  if (existsSync(join(projectDir, 'build.gradle')) || existsSync(join(projectDir, 'build.gradle.kts'))) {
    language = language || 'Java/Kotlin';
    if (existsSync(join(projectDir, 'build.gradle.kts'))) language = 'Kotlin';
  }

  // pom.xml → Java project
  if (existsSync(join(projectDir, 'pom.xml'))) {
    language = 'Java';
    framework = framework || 'Spring Boot';
  }

  // requirements.txt / pyproject.toml → Python project
  if (existsSync(join(projectDir, 'pyproject.toml')) || existsSync(join(projectDir, 'requirements.txt'))) {
    language = language || 'Python';
    if (existsSync(join(projectDir, 'pyproject.toml'))) {
      const pyproject = readFileSync(join(projectDir, 'pyproject.toml'), 'utf-8');
      if (pyproject.includes('django')) framework = 'Django';
      else if (pyproject.includes('fastapi')) framework = 'FastAPI';
      else if (pyproject.includes('flask')) framework = 'Flask';
    }
  }

  return { name: name || 'My Project', language, framework };
}

/**
 * Copy slash command templates for a specific agent type.
 */
function installSlashCommands(projectDir: string, agentType: AgentType): void {
  const templatesDir = getTemplatesDir();
  const srcDir = join(templatesDir, 'slash-commands', agentType);
  if (!existsSync(srcDir)) return;

  const commandDirMap: Record<AgentType, string> = {
    claude: '.claude/commands',
    gemini: '.gemini/commands',
    codex: '.codex/commands',
  };

  const destDir = join(projectDir, commandDirMap[agentType]);
  mkdirSync(destDir, { recursive: true });

  const files = readdirSync(srcDir);
  for (const file of files) {
    const dest = join(destDir, file);
    if (!existsSync(dest)) {
      copyFileSync(join(srcDir, file), dest);
      console.log(`  + ${commandDirMap[agentType]}/${file}`);
    } else {
      console.log(`  ~ ${commandDirMap[agentType]}/${file} (already exists, skipped)`);
    }
  }
}

/**
 * Copy the viewer template to .archrips/viewer/
 */
function installViewer(archripsDir: string): void {
  const viewerSrc = getViewerDir();
  const viewerDest = join(archripsDir, 'viewer');

  if (!existsSync(viewerSrc)) {
    console.log('  ! Viewer template not found (expected in monorepo). Skipping viewer copy.');
    return;
  }

  mkdirSync(viewerDest, { recursive: true });

  // Copy viewer files recursively, skipping node_modules and dist
  copyDirRecursive(viewerSrc, viewerDest, ['node_modules', 'dist', '.tsbuildinfo']);
  console.log('  + .archrips/viewer/ (viewer template)');
}

function copyDirRecursive(src: string, dest: string, skipDirs: string[]): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, skipDirs);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Append lines to .gitignore if not already present.
 */
function updateGitignore(projectDir: string): void {
  const gitignorePath = join(projectDir, '.gitignore');
  const linesToAdd = ['.archrips/viewer/node_modules/', '.archrips/viewer/dist/', '.archrips/dist/'];

  let content = '';
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, 'utf-8');
  }

  const missingLines = linesToAdd.filter((line) => !content.includes(line));
  if (missingLines.length > 0) {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n';
    const block = `${separator}\n# archrips\n${missingLines.join('\n')}\n`;
    writeFileSync(gitignorePath, content + block);
    console.log('  + .gitignore (archrips entries)');
  }
}

export async function init(targetPath: string): Promise<void> {
  const projectDir = resolve(targetPath);
  console.log(`\narchrips init — ${projectDir}\n`);

  // 1. Detect project info
  const projectInfo = detectProjectInfo(projectDir);
  console.log(`Detected: ${projectInfo.language}${projectInfo.framework ? ` / ${projectInfo.framework}` : ''}`);

  // 2. Create .archrips/ directory
  const archripsDir = join(projectDir, '.archrips');
  mkdirSync(archripsDir, { recursive: true });

  // 3. Write architecture.json skeleton
  const archJsonPath = join(archripsDir, 'architecture.json');
  if (!existsSync(archJsonPath)) {
    const templatesDir = getTemplatesDir();
    const skeleton = JSON.parse(readFileSync(join(templatesDir, 'skeleton.json'), 'utf-8')) as Record<string, unknown>;
    const project = skeleton.project as Record<string, string>;
    project.name = projectInfo.name;
    project.language = projectInfo.language;
    project.framework = projectInfo.framework;
    writeFileSync(archJsonPath, JSON.stringify(skeleton, null, 2) + '\n');
    console.log('  + .archrips/architecture.json (skeleton)');
  } else {
    console.log('  ~ .archrips/architecture.json (already exists, skipped)');
  }

  // 4. Copy viewer template
  installViewer(archripsDir);

  // 5. Detect agents and install slash commands
  const detected = detectAgents(projectDir);
  if (detected.length > 0) {
    console.log(`\nDetected AI agents: ${detected.map((a) => a.type).join(', ')}`);
    for (const agent of detected) {
      installSlashCommands(projectDir, agent.type);
    }
  } else {
    console.log('\nNo AI agent config detected. Installing commands for all agents...');
    for (const agentType of getAllAgentTypes()) {
      installSlashCommands(projectDir, agentType);
    }
  }

  // 6. Update .gitignore
  updateGitignore(projectDir);

  console.log(`
Done! Next steps:
  1. Run /archrips-scan in your AI agent to analyze the codebase
  2. Run: npx archrips build
  3. Run: npx archrips serve
`);
}
