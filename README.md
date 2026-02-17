# archrips

Generate interactive architecture diagrams from your codebase using AI.

archrips lets Claude Code analyze your codebase and produce a self-contained, interactive architecture viewer as static HTML — deployable anywhere.

## Quick Start

```bash
# 1. Install the plugin
/plugin marketplace add yida29/archrips
/plugin install archrips@archrips

# 2. Initialize in your project
npx archrips init .

# 3. Scan the codebase
/archrips:scan

# 4. Build & preview
npx archrips build
npx archrips serve
```

## How It Works

1. **Install plugin** — `/plugin marketplace add yida29/archrips` registers the plugin, `/plugin install archrips@archrips` installs it
2. **`archrips init`** — sets up `.archrips/` in your project
3. **`/archrips:scan`** — Claude reads your codebase and docs, asks you to review the draft, then generates `.archrips/architecture.json`
4. **`archrips build`** — validates the JSON, computes layout with dagre, and builds a static React Flow viewer
5. **`archrips serve`** — serves the built HTML locally for preview

The output is a standalone `dist/` folder you can deploy to GitHub Pages, Netlify, or share as a zip.

## Skills

| Skill | Description |
|-------|-------------|
| `/archrips:scan` | Full codebase scan — reads code & docs, presents draft for review, generates `architecture.json` |
| `/archrips:update` | Incremental update based on `git diff` |
| `/archrips:refine` | Interactive refinement (add/remove/modify nodes) |

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx archrips init [path]` | Initialize archrips in a project (default: `.`) |
| `npx archrips build` | Build the architecture viewer to `.archrips/dist/` |
| `npx archrips serve` | Preview the built viewer at `localhost:4173` |

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

The optional `depth` field (0-2) controls which nodes appear at each abstraction level. If omitted, it is auto-inferred from the category:

| Depth | Label | Default Categories |
|-------|-------|--------------------|
| 0 | Overview | `controller`, `external` |
| 1 | Structure | `service`, `port`, `adapter`, `job` |
| 2 | Detail | `model`, `dto` |

The viewer provides a 3-level toggle (Overview / Structure / Detail) to show or hide nodes by depth.

### Layers

The `layer` field controls vertical positioning (dagre handles horizontal):

| Layer | Typical Content |
|-------|----------------|
| 0 | External services |
| 1 | Entry points (controllers, routes) |
| 2 | Application logic (services, jobs, DTOs) |
| 3 | Abstractions (ports, interfaces) |
| 4 | Implementations (adapters) |
| 5 | Data (models, entities) |

### Edge Types

| Type | Meaning |
|------|---------|
| `dependency` | Component A depends on B |
| `implements` | Adapter implements Port/Interface |
| `relation` | Data relationship (hasMany, belongsTo) |

## Framework Support

archrips is framework-agnostic. The AI adapts its analysis based on the detected framework:

- **Laravel** — Controllers → Services → Ports → Adapters → Models
- **Express/NestJS** — Routes/Controllers → Services → Repositories → Models
- **Next.js** — Pages → Components → API Routes → Services
- **Django** — Views → Serializers → Services → Models
- **Spring Boot** — Controllers → Services → Repositories → Entities
- **Go** — Handlers → Services → Repositories → Models
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
