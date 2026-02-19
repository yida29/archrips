<p align="center">
  <img src="archrip.jpg" alt="archrip" width="200">
</p>

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
    "sourceUrl": "https://github.com/org/repo/blob/main/{filePath}"
  },
  "nodes": [
    {
      "id": "ctrl-users",
      "category": "controller",
      "label": "UsersController",
      "description": "Handles user registration, authentication, and profile management. Uses JWT for session tokens with 24h expiry.",
      "filePath": "src/controllers/users.ts",
      "layer": 1,
      "useCases": ["uc-user-mgmt"],
      "metadata": [
        { "label": "Rate Limit", "value": "10 req/s per IP", "type": "text" }
      ]
    }
  ],
  "edges": [
    { "source": "ctrl-users", "target": "svc-users", "type": "dependency" }
  ],
  "useCases": [
    {
      "id": "uc-user-mgmt",
      "name": "User Management",
      "nodeIds": ["ctrl-users", "svc-users", "model-user"]
    }
  ]
}
```

### Node Categories

| Category | Color | Use For |
|----------|-------|---------|
| `controller` | Blue | HTTP entry points (Controller, Route Handler, Resolver) |
| `service` | Green | Business logic (Service, UseCase) |
| `port` | Purple | Abstractions (Interface, Contract, Port) |
| `adapter` | Orange | Implementations (Repository impl, API client) |
| `model` | Red | Domain entities, value objects (core business logic) |
| `database` | Amber | DB tables, migrations, ORMs |
| `infrastructure` | Indigo | IaC resources (Terraform, Pulumi, sst.config.ts, CloudFormation) |
| `external` | Gray | External services (API, DB, Queue) |
| `job` | Yellow | Background (Job, Worker, Cron) |
| `dto` | Cyan | Data transfer (DTO, Request, Response) |

Custom categories are supported — they get a fallback color.

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
- **CQRS / Event-Driven** — CQRS, Event Sourcing, Motia, Temporal
- **Serverless / Microservices** — SST, Lambda, Terraform, K8s
- **Modular Monolith** — module-boundary architectures
- Any other — grouped by directory responsibility

## Viewer Features

- Interactive React Flow graph (drag, zoom, pan)
- **Use case filter** — highlight specific feature flows
- **Category filter** — show/hide by category
- **Command palette** — keyboard-driven navigation (`Cmd+K`)
- Detail panel (click nodes for full info: description, metadata, source links)
- Color-coded categories with legend
- Dark mode toggle
- MiniMap navigation
- Source code links (GitHub, GitLab, Backlog, or any hosting)

## License

MIT
