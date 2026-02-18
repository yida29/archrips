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
- `id`: kebab-case, prefixed by category abbreviation (ctrl-, svc-, port-, adpt-, model-, db-, ext-, job-, dto-)
- `layer`: 0=external, 1=entry points, 2=application logic, 3=abstractions, 4=implementations, 5=data
- `category`: one of controller, service, port, adapter, model, database, external, job, dto (or custom). Use `model` for domain entities/value objects (core business logic). Use `database` for DB tables, migrations, ORMs, and infrastructure persistence.
- `label`: display name for the node
- `filePath`: relative from project root
- `depth` (optional): 0=overview (boundary), 1=structure (internal), 2=detail (implementation). Auto-inferred from category if omitted
- `useCases`: array of use case IDs this node participates in

## Edge Rules
- `source`: source node id
- `target`: target node id
- `type`: dependency | implements | relation
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
  { "label": "Rate Limit", "value": "10 req/s per IP", "type": "text" }
]
```

## Schema Rules
- Include table schema only when migration files or model annotations are available
- Reference from node data using schema key name
