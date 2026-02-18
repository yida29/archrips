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

## Phase 2: Documentation Discovery
Read existing documentation to understand architecture context:
1. Check for: README.md, CLAUDE.md, docs/, doc/, wiki/, ARCHITECTURE.md, CONTRIBUTING.md
2. Extract: system overview, component descriptions, external service integrations, design decisions
3. Use this knowledge to inform the analysis — documentation often reveals architectural intent that code alone does not show (use cases, business context, external dependencies)

## Phase 3: Layer Identification
Based on the framework, identify architectural layers:

**Common patterns:**
- Laravel: Controllers → Services → Ports → Adapters → Models
- Express/NestJS: Routes/Controllers → Services → Repositories → Models
- Next.js: Pages → Components → Hooks → API Routes → Services
- Django: Views → Serializers → Services → Models
- Spring Boot: Controllers → Services → Repositories → Entities
- Go: Handlers → Services → Repositories → Models
- Generic: Group by directory responsibility

## Phase 4: Read Key Files
For each layer, read representative files to extract:
- Component names and purposes
- Dependencies (imports, injections)
- Public methods/routes
- Database schemas (from migrations or model definitions)

**Do NOT read every file.** Focus on entry points, core logic, interfaces, and data models.

## Phase 5: Map Relationships
For each component, identify:
- What it depends on (imports, constructor injection)
- What depends on it
- External service connections

## Phase 6: Identify Use Cases
Group related components into user-facing features.

## Phase 7: Draft Review — STOP and ask the developer

**IMPORTANT: Do NOT proceed to Phase 8 until the developer responds. You MUST stop here and wait for input.**

Present a summary of what you found:
- List of discovered nodes (grouped by layer/category)
- List of discovered use cases
- External services found

Then ask:
- Are there missing components, external services, or use cases?
- Should anything be excluded?
- What is the `sourceUrl` template? (e.g., `https://github.com/org/repo/blob/main/{filePath}`)

End your message with: **"Please review and reply with corrections, or type 'go' to generate."**

**Do NOT write architecture.json yet. Wait for the developer to respond.**

If the developer replies with corrections, apply them and present the updated summary. Repeat until they say "go" / "ok" / "skip".

## Phase 8: Generate architecture.json
Only run this phase AFTER the developer has approved the draft in Phase 7.

Create `.archrip/` directory if it doesn't exist, then write the complete `.archrip/architecture.json` following the schema, incorporating developer feedback.

After writing the file, tell the developer:
- Run `npx archrip build && npx archrip serve` to build and preview (viewer is auto-installed on first build)
- Run `/archrip-refine` to make further adjustments (add/remove nodes, fix relationships, etc.)

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
- `id`: kebab-case, prefixed by category abbreviation (ctrl-, svc-, port-, adpt-, model-, ext-, job-, dto-)
- `layer`: 0=external, 1=entry points, 2=application logic, 3=abstractions, 4=implementations, 5=data
- `category`: one of controller, service, port, adapter, model, external, job, dto (or custom)
- `label`: display name for the node
- `filePath`: relative from project root
- `depth` (optional): 0=overview (boundary), 1=structure (internal), 2=detail (implementation). Auto-inferred from category if omitted
- `useCases`: array of use case IDs this node participates in

### Edge Rules
- `source`: source node id
- `target`: target node id
- `type`: dependency | implements | relation
- Only include significant architectural dependencies (not utility imports)

### Schema Rules
- Include table schema only when migration files or model annotations are available
- Reference from node data using schema key name

$ARGUMENTS
