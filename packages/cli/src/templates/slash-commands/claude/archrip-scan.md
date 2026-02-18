---
description: Scan codebase and generate architecture diagram data
---

# archrip scan — Analyze codebase architecture

Analyze the current codebase and generate `.archrip/architecture.json`.

**Language rule:** Respond in the same language as the user's message or `$ARGUMENTS`. If no user text is available, detect the project's primary language from README/docs and match it. The `architecture.json` fields (labels, descriptions) should also use that language.

## Phase 1: Project Discovery
1. Read top-level files (package.json, composer.json, go.mod, Cargo.toml, pom.xml, pyproject.toml, etc.)
2. Identify language, framework, source root
3. List directory structure (2 levels deep)
4. Auto-detect `sourceUrl`: Run `git remote get-url origin` and convert to browse URL:
   - `git@github.com:org/repo.git` → `https://github.com/org/repo/blob/main/{filePath}`
   - `https://github.com/org/repo.git` → `https://github.com/org/repo/blob/main/{filePath}`
   - `git@gitlab.com:org/repo.git` → `https://gitlab.com/org/repo/-/blob/main/{filePath}`
   - If no git remote, leave empty (ask in Phase 7)

## Phase 2: Documentation Discovery
Read existing documentation to understand architecture context:
1. Check for: README.md, CLAUDE.md, docs/, doc/, wiki/, ARCHITECTURE.md, CONTRIBUTING.md, ADR/
2. For each document, extract and take notes on:
   - **Business context**: What problem does this system solve? Who are the users?
   - **Component responsibilities**: What each module/service does and why it exists
   - **Design decisions & constraints**: Why certain patterns/libraries were chosen, known limitations
   - **Data flow**: How data moves through the system (request lifecycle, event flow, etc.)
   - **External integrations**: What external services are used, why, and how
   - **Non-functional requirements**: SLAs, performance targets, security policies
   - **Deployment & infrastructure**: Hosting, CI/CD, environment details
3. Keep these notes — you will use them in Phase 4 to write rich node/edge descriptions and metadata

## Phase 3: Layer Identification
Assign each component a `layer` integer. The rule: **higher layer = closer to domain core (more stable, fewer external dependencies). Lower layer = closer to external world (more volatile, I/O-bound).**

Both layouts use this value — dagre places higher layers lower on screen, concentric places them at the center.

**Reference mappings** (layer numbers in parentheses — adapt to actual project structure):

MVC / Layered:
- Laravel: External(0) → Controllers(1) → Services(2) → Models(3)
- Rails: External(0) → Controllers(1) → Services(2) → Models(3)
- Django: External(0) → Views(1) → Serializers(2) → Services(3) → Models(4)
- Spring Boot: External(0) → Controllers(1) → Services(2) → Repositories(3) → Entities(4)
- NestJS: External(0) → Controllers(1) → Services(2) → Repositories(3) → Entities(4)
- Next.js App Router: External(0) → Route Handlers/Pages(1) → Components(2) → Hooks/Services(3) → Data Access(4)
- FastAPI: External(0) → Routers(1) → Services(2) → Repositories(3) → Models(4)

DDD / Clean Architecture / Hexagonal (use `"layout": "concentric"`):
- Generic: External(0) → Adapters(1) [Controllers, DB impl, API clients] → Application Services(2) → Ports(3) [domain-defined interfaces] → Domain Entities(4)
- Go (Hex): External(0) → Adapters(1) [Handlers, Repositories] → Use Cases(2) → Ports(3) → Domain(4)
- Flutter (Clean): External(0) → Data Sources(1) → Repositories(2) → Use Cases(3) → Entities(4)
- Note: Ports are interfaces **defined by the domain** — they belong near domain core, not at the adapter layer. Adapters implement/use Ports from the outside.

Serverless / Microservices:
- SST/Lambda: External(0) → API Gateway(1) → Lambda Handlers(2) → Services(3) → Domain(4)
- Microservices: External(0) → Gateway/BFF(1) → Service Boundaries(2) → Internal Services(3) → Shared Domain(4)

For unlisted frameworks: group by directory responsibility and apply the abstract rule above.

## Phase 4: Read Key Files
For each layer, read representative files to extract:
- Component names and purposes
- Dependencies (imports, injections)
- Public methods/routes
- Database schemas (from migrations or model definitions)

**Enrich descriptions from documentation:** Cross-reference code with your Phase 2 notes.
For each component, compose a `description` (1-3 sentences) that covers:
- **What**: Its responsibility (from code analysis)
- **Why**: Business context or design rationale (from docs)
- **How**: Key implementation details, constraints, or patterns worth noting

A good description tells the reader something they cannot see from the label alone.
- BAD: "User service" (just echoes the label)
- GOOD: "Handles user registration, login, and profile management. Uses JWT for session tokens with 24h expiry. Password hashing via bcrypt (cost=12)."

Also identify metadata candidates:
- SLA/performance notes → `metadata` with `type: "list"`
- Related doc links → `metadata` with `type: "link"`
- Infrastructure details (Lambda ARN, DB engine, etc.) → `metadata` with `type: "code"` or `"text"`

**Do NOT read every file.** Focus on entry points, core logic, interfaces, and data models.

## Phase 5: Map Relationships
For each component, identify:
- What it depends on (imports, constructor injection)
- What depends on it
- External service connections

**Connectivity check:** After mapping, verify every node has at least one edge. If a node is orphaned:
- DTOs/entities → connect to the service or adapter that references them
- External services → connect to the adapter/controller that integrates with them
- Models → connect to the adapter/repository that queries them

## Phase 6: Identify Use Cases
Group related components into user-facing features.

## Phase 7: Draft Review — STOP and ask the developer

**IMPORTANT: Do NOT proceed to Phase 8 until the developer responds. You MUST stop here and wait for input.**

Present a summary of what you found:
- **Documents read**: List all docs you read in Phase 2 (e.g., README.md, CLAUDE.md, docs/architecture.md)
- List of discovered nodes (grouped by layer/category)
- List of discovered use cases
- External services found

Then ask:
- Are there other documents you should read? (e.g., docs/, wiki/, design docs)
- Are there missing components, external services, or use cases?
- Should anything be excluded?
- `sourceUrl` auto-detected as: `<detected-url>` — correct? (If not detected, ask for the `sourceUrl` template, e.g., `https://github.com/org/repo/blob/main/{filePath}`)

End your message with: **"Please review and reply with corrections, or type 'go' to generate."**

**Do NOT write architecture.json yet. Wait for the developer to respond.**

If the developer replies with corrections, apply them and present the updated summary. Repeat until they say "go" / "ok" / "skip".

## Phase 8: Generate architecture.json
Only run this phase AFTER the developer has approved the draft in Phase 7.

Create `.archrip/` directory if it doesn't exist, then write the complete `.archrip/architecture.json` following the schema, incorporating developer feedback.

After writing the file:
1. Run `npx archrip serve` in the terminal — it auto-builds and opens the browser. **Do NOT run `npx archrip build` separately or open the browser manually** (serve handles everything).
2. Tell the developer: Run `/archrip-update` to make further adjustments (add/remove nodes, fix relationships, etc.)

### Required structure (use EXACTLY these field names)

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

### Node Rules
- `id`: kebab-case, prefixed by category abbreviation (ctrl-, svc-, port-, adpt-, model-, db-, ext-, job-, dto-)
- `layer`: non-negative integer. **Higher = closer to domain core / more stable. Lower = closer to external world / more volatile.** Dagre (TB) places higher layers lower on screen; concentric places them at center. Use as many layers as the architecture requires (typically 3-6). Example for DDD: 0=external, 1=adapters (controllers + infra), 2=app services, 3=ports, 4=domain entities. Example for MVC: 0=external, 1=controllers, 2=services, 3=models.
- `category`: one of controller, service, port, adapter, model, database, external, job, dto (or custom). Use `model` for domain entities/value objects (core business logic). Use `database` for DB tables, migrations, ORMs, and infrastructure persistence.
- `label`: display name for the node
- `description`: 1-3 sentences explaining responsibility + business context. Do NOT just echo the label. Cross-reference documentation for richer context (see Description Guidelines below)
- `filePath`: relative from project root
- `depth` (optional): 0=overview, 1=structure, 2=detail. Auto-inferred from `layer` if omitted: with 3+ unique layers, lowest → 0, middle → 1, highest → 2. With 1-2 layers, all nodes get depth 0 (always visible).
- `useCases`: array of use case IDs this node participates in
- `metadata` (optional): array of `{ label, value, type? }` entries for supplementary info (AWS ARNs, doc links, SLA notes, etc.). `type` is `text` (default), `code`, `link`, or `list`. `value` is a string, or `string[]` when `type` is `list`. Example:
  ```json
  "metadata": [
    { "label": "Lambda ARN", "value": "arn:aws:lambda:ap-northeast-1:123:function:auth", "type": "code" },
    { "label": "API Docs", "value": "https://docs.example.com/auth", "type": "link" },
    { "label": "SLA", "value": ["99.9% uptime", "p95 < 200ms"], "type": "list" }
  ]
  ```

### Edge Rules
- `source`: source node id
- `target`: target node id
- `type`: dependency | implements | relation
- `description` (optional): human-readable description of the edge's purpose
- `metadata` (optional): same format as node metadata — array of `{ label, value, type? }` entries
- Only include significant architectural dependencies (not utility imports)
- **Every node MUST have at least one edge.** If a node has no obvious dependency, connect it with a `relation` edge to the component that uses or contains it.

### Layout Selection
- DDD / Clean Architecture / Hexagonal / Onion Architecture → add `"layout": "concentric"` to `project`
- MVC / standard layered → `"layout": "dagre"` (default, can be omitted)

### Description Guidelines

#### Node `description`
Write 1-3 sentences that explain responsibility AND business context.
Cross-reference project documentation (README, CLAUDE.md, docs/) for richer context.
- BAD: "User service" (just echoes the label)
- BAD: "Handles users" (too vague)
- GOOD: "Handles user registration, authentication, and profile management. Uses JWT for session tokens; password hashing via bcrypt. Rate-limited to 10 req/s per IP."

#### Edge `description`
Explain WHY the dependency exists, not just THAT it exists.
- BAD: "calls" / "depends on"
- GOOD: "Delegates payment processing via Stripe SDK; retries on timeout (3x with exponential backoff)"

#### `metadata` for supplementary details
Use `metadata` to capture information from docs that doesn't fit in `description`:
```json
"metadata": [
  { "label": "SLA", "value": ["99.9% uptime", "p95 < 200ms"], "type": "list" },
  { "label": "Design Doc", "value": "https://...", "type": "link" },
  { "label": "Infrastructure", "value": "Lambda + DynamoDB (on-demand)", "type": "text" },
  { "label": "Rate Limit", "value": "10 req/s per IP", "type": "text" }
]
```

### Schema Rules
- Include table schema only when migration files or model annotations are available
- Reference from node data using schema key name

$ARGUMENTS
