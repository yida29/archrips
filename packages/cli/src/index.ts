#!/usr/bin/env node

import { init } from './commands/init.js';
import { build } from './commands/build.js';
import { serve } from './commands/serve.js';

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case 'init':
      await init(args[1] ?? '.');
      break;
    case 'build':
      await build();
      break;
    case 'serve':
      await serve();
      break;
    case '--version':
    case '-v':
      console.log('archrips v0.1.0');
      break;
    case '--help':
    case '-h':
    case undefined:
      printUsage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
archrips - Generate interactive architecture diagrams from your codebase

Usage:
  archrips init [path]    Initialize archrips in a project directory
  archrips build          Build the architecture viewer (static HTML)
  archrips serve          Preview the built viewer in browser

Options:
  -v, --version           Show version
  -h, --help              Show this help

Workflow:
  1. npx archrips init .          # Setup project + install slash commands
  2. /archrips-scan               # AI scans codebase → architecture.json
  3. npx archrips build           # Build static HTML viewer
  4. npx archrips serve           # Preview in browser
`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
