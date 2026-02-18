import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect project info from common config files.
 */
export function detectProjectInfo(projectDir: string): { name: string; language: string; framework: string } {
  let name = '';
  let language = '';
  let framework = '';

  // package.json → Node.js project
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    if (typeof pkg.name === 'string') name = pkg.name;
    language = 'TypeScript/JavaScript';
    // Detect framework from dependencies
    const rawDeps = typeof pkg.dependencies === 'object' && pkg.dependencies !== null ? pkg.dependencies as Record<string, string> : {};
    const rawDevDeps = typeof pkg.devDependencies === 'object' && pkg.devDependencies !== null ? pkg.devDependencies as Record<string, string> : {};
    const deps = { ...rawDeps, ...rawDevDeps };
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
    if (!name && typeof composer.name === 'string') name = composer.name;
    language = 'PHP';
    const require = typeof composer.require === 'object' && composer.require !== null ? composer.require as Record<string, string> : {};
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
