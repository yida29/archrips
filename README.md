# archrip

Generate interactive architecture diagrams from your codebase using AI.

archrip lets Claude Code analyze your codebase and produce a self-contained, interactive architecture viewer as static HTML — deployable anywhere.

## Quick Start

```bash
# 1. Install the plugin
/plugin marketplace add yida29/archrip
/plugin install archrip@archrip

# 2. Scan the codebase
/archrip-scan

# 3. Build & preview
npx archrip build
npx archrip serve
```

## How It Works

1. **Install plugin** — `/plugin marketplace add yida29/archrip` registers the plugin, `/plugin install archrip@archrip` installs it
2. **`/archrip-scan`** — Claude reads your codebase and docs, asks you to review the draft, then generates `.archrip/architecture.json`
3. **`archrip build`** — validates the JSON, auto-installs the viewer if needed, computes layout with dagre, and builds a static React Flow viewer
4. **`archrip serve`** — serves the built HTML locally for preview

The output is a standalone `dist/` folder you can deploy to GitHub Pages, Netlify, or share as a zip.

## Skills

| Skill | Description |
|-------|-------------|
| `/archrip-scan` | Full codebase scan — reads code & docs, presents draft for review, generates `architecture.json` |
| `/archrip-update` | Update or refine the diagram — auto-detects changes from git diff, or apply manual edits |

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx archrip init [path]` | Initialize archrip in a project (optional — `build` auto-setups the viewer) |
| `npx archrip build` | Build the architecture viewer to `.archrip/dist/` (auto-installs viewer if needed) |
| `npx archrip serve` | Preview the built viewer at `localhost:4173` |

## architecture.json Format

```json
{
  "version": "1.0",
  "project": {
    "name": "My App",
    "language": "TypeScript",
    "framework": "Next.js",
    "sourceUrl": "https://github.com/org/repo/blob/main/{filePath}"
  },
  "nodes": [
    {
      "id": "ctrl-users",
      "category": "controller",
      "label": "UsersController",
      "description": "User CRUD operations",
      "filePath": "src/controllers/users.ts",
      "layer": 1,
      "depth": 0,
      "methods": ["list", "create", "update", "delete"],
      "routes": ["GET /api/users", "POST /api/users"],
      "useCases": ["uc-user-mgmt"]
    }
  ],
  "edges": [
    { "source": "ctrl-users", "target": "svc-users", "type": "dependency" }
  ],
  "useCases": [
    {
      "id": "uc-user-mgmt",
      "name": "User Management",
      "description": "CRUD operations for users",
      "nodeIds": ["ctrl-users", "svc-users", "model-user"]
    }
  ],
  "schemas": {
    "users": {
      "tableName": "users",
      "columns": [
        { "name": "id", "type": "BIGINT", "nullable": false, "index": "primary" },
        { "name": "email", "type": "VARCHAR(255)", "nullable": false, "index": "unique" }
      ]
    }
  }
}
```

### Node Categories

| Category | Color | Use For |
|----------|-------|---------|
| `controller` | Blue | HTTP entry points (Controller, Route Handler, Resolver) |
| `service` | Green | Business logic (Service, UseCase) |
| `port` | Purple | Abstractions (Interface, Contract, Port) |
| `adapter` | Orange | Implementations (Repository impl, API client) |
| `model` | Red | Data (Model, Entity, Schema) |
| `external` | Gray | External services (API, DB, Queue) |
| `job` | Yellow | Background (Job, Worker, Cron) |
| `dto` | Cyan | Data transfer (DTO, Request, Response) |

Custom categories are supported — they get a fallback color.

### Depth (Abstraction Level)

The optional `depth` field (0-2) controls which nodes appear at each abstraction level. If omitted, it is auto-inferred from the `layer` distribution:

- **3+ unique layers**: lowest → 0 (overview), middle → 1 (structure), highest → 2 (detail)
- **1-2 unique layers**: all nodes get depth 0 (always visible — depth filter has no effect)

| Depth | Label | Shows |
|-------|-------|-------|
| 0 | Overview | Entry points, external boundaries (lowest layers) |
| 1 | Structure | Core services, business logic (middle layers) |
| 2 | Detail | Domain models, internal details (highest layers) |

The viewer provides a 3-level toggle (Overview / Structure / Detail) to progressively reveal more nodes.

### Layers

The `layer` field controls positioning. **Higher = closer to domain core (more stable). Lower = closer to external world (more volatile).** Dagre places higher layers lower on screen; concentric places them at the center. Use as many layers as the architecture requires (any non-negative integer, typically 3-6).

**DDD / Clean Architecture example:**

| Layer | Content |
|-------|---------|
| 0 | External services (DB, APIs, queues) |
| 1 | Adapters / Infrastructure |
| 2 | Controllers / Entry points |
| 3 | Application services |
| 4 | Ports / Abstractions (interfaces) |
| 5 | Domain entities |

**MVC example (Rails, Laravel, Django):**

| Layer | Content |
|-------|---------|
| 0 | External services |
| 1 | Controllers / Views |
| 2 | Services / Business logic |
| 3 | Models / Entities |

### Edge Types

| Type | Meaning |
|------|---------|
| `dependency` | Component A depends on B |
| `implements` | Adapter implements Port/Interface |
| `relation` | Data relationship (hasMany, belongsTo) |

## Framework Support

archrip is framework-agnostic. The AI adapts its analysis based on the detected framework and architectural pattern:

- **MVC / Layered** — Laravel, Rails, Django, Spring Boot, NestJS, Next.js, FastAPI
- **DDD / Clean / Hexagonal** — Go Hexagonal, Flutter Clean, Java DDD, TypeScript DDD
- **Serverless / Microservices** — SST, Lambda, service mesh architectures
- Any other — grouped by directory responsibility

## Viewer Features

- Interactive React Flow graph (drag, zoom, pan)
- **Depth filter** — 3-level abstraction toggle (Overview / Structure / Detail)
- **Use case filter** — highlight specific feature flows
- Detail panel (click nodes for full info: routes, methods, source links, DB schema)
- Color-coded categories with legend
- MiniMap navigation
- Source code links (GitHub, GitLab, Backlog, or any hosting)

## License

MIT
