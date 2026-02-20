# architecture.json Schema Reference

## Required structure (use EXACTLY these field names)

```json
{
  "version": "1.0",
  "project": { "name": "...", "sourceUrl": "https://github.com/org/repo/blob/main/{filePath}" },
  "nodes": [
    { "id": "ctrl-users", "category": "controller", "label": "UsersController", "layer": 1, "filePath": "src/controllers/users.ts", "useCases": ["uc-user-mgmt"] }
  ],
  "edges": [
    { "source": "ctrl-users", "target": "svc-users", "type": "dependency" }
  ],
  "useCases": [
    { "id": "uc-user-mgmt", "name": "User Management", "nodeIds": ["ctrl-users", "svc-users"] }
  ]
}
```

**Critical field names — do NOT use alternatives:**
- Node: `id`, `category`, `label` (NOT name), `layer` — all required
- Edge: `source`, `target` (NOT from/to) — all required
- UseCase: `id`, `name`, `nodeIds` — all required

## Node Rules
- `id`: kebab-case, prefixed by category abbreviation (ctrl-, svc-, port-, adpt-, entity-, db-, infra-, ext-, job-, dto-)
- `layer`: non-negative integer. Higher = closer to domain core. See SKILL.md Phase 3 for framework-specific mappings
- For Hexagonal/DDD: Ports are interfaces in the application core (often the same layer as use cases/app services); adapters implement them.
- `category`: one of controller, service, port, adapter, entity, database, infrastructure, external, job, dto (or custom). Use `entity` for domain entities/value objects (core business logic). Use `database` for DB tables, migrations, ORMs. Use `infrastructure` for IaC resources (sst.config.ts, Terraform, Pulumi, CloudFormation, etc.)
- `label`: display name for the node
- `filePath`: relative from project root
- `useCases`: array of use case IDs this node participates in

## Edge Rules
- `source`: source node id
- `target`: target node id
- `type`: dependency | implements | relation
- `description` (optional): human-readable description of the edge's purpose
- `metadata` (optional): same format as node metadata — array of `{ label, value, type? }` entries. Use for SQL/query details on DB edges (see examples below)
- Only include significant architectural dependencies (not utility imports)
- **Every node MUST have at least one edge.** If a node has no obvious dependency, connect it with a `relation` edge to the component that uses or contains it.

## Layout Selection
- DDD / Clean Architecture / Hexagonal / Onion Architecture → add `"layout": "concentric"` to `project`
- MVC / standard layered → `"layout": "dagre"` (default, can be omitted)

## Description & Metadata Guidelines

### Node `description`
Write 1-3 sentences that explain responsibility AND business context.
Cross-reference project documentation (README, CLAUDE.md, docs/) for richer context.
- BAD: "User service" (just echoes the label)
- BAD: "Handles users" (too vague)
- GOOD: "Handles user registration, authentication, and profile management. Uses JWT for session tokens; password hashing via bcrypt. Rate-limited to 10 req/s per IP."

### Edge `description`
Explain WHY the dependency exists, not just THAT it exists.
- BAD: "calls" / "depends on"
- GOOD: "Delegates payment processing via Stripe SDK; retries on timeout (3x with exponential backoff)"

### `metadata` for supplementary details
Use `metadata` to capture information from docs that doesn't fit in `description`:
```json
"metadata": [
  { "label": "SLA", "value": ["99.9% uptime", "p95 < 200ms"], "type": "list" },
  { "label": "Design Doc", "value": "https://...", "type": "link" },
  { "label": "Infrastructure", "value": "Lambda + DynamoDB (on-demand)", "type": "text" },
  { "label": "Rate Limit", "value": "10 req/s per IP", "type": "text" },
  { "label": "Queries", "value": ["SELECT * FROM users WHERE email = ?", "INSERT INTO users (name, email) VALUES (?, ?)"], "type": "list" }
]
```

## Schema Rules
- Include table schema only when migration files or entity annotations are available
- Reference from node data using schema key name
