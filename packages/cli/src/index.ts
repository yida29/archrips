#!/usr/bin/env node

import { createRequire } from 'node:module';
import { init } from './commands/init.js';
import { build } from './commands/build.js';
import { serve } from './commands/serve.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

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
      console.log(`archrip v${pkg.version}`);
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
archrip - Generate interactive architecture diagrams from your codebase

Usage:
  archrip init [path]    Initialize archrip in a project directory
  archrip build          Build the architecture viewer (static HTML)
  archrip serve          Preview the built viewer in browser

Options:
  -v, --version           Show version
  -h, --help              Show this help

Workflow:
  1. /archrip-scan               # AI scans codebase → architecture.json
  2. npx archrip build           # Build static HTML viewer (auto-installs viewer)
  3. npx archrip serve           # Preview in browser
`);
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
