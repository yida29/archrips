---
name: archrip-scan
description: Scan codebase and generate architecture diagram data
user-invocable: true
argument-hint: "[directory or instructions]"
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
Based on the framework, identify architectural layers:

**Common patterns** (→ means "depends on / closer to domain core"):
MVC / Layered:
- Laravel: External → Controllers → Services → Domain
- Express/NestJS: External → Routes/Controllers → Services → Repositories → Domain
- Next.js: External → Pages → Components → Hooks/API Routes → Services
- Django: External → Views → Serializers → Services → Domain
- Spring Boot: External → Controllers → Services → Repositories → Domain

DDD / Port & Adapter / Hexagonal:
- Generic: External → Adapters(Controllers, DB impl) → Application Core(Use Cases / Application Services + Ports) → Domain
- Note: Ports are interfaces owned by the **application core** (use-case layer; sometimes placed in domain, but not required). Adapters implement outbound Ports and call inbound Ports — Ports should never live in the adapter layer.

CQRS / Event-Driven:
- CQRS: External → Command Handlers / Query Handlers → Application Services → Domain (Command and Query sides share the same layer structure but separate models)
- Event Sourcing: External → Command Handlers → Event Store → Projections → Read Models
- Event-Driven (Motia, Temporal, etc.): External → API Steps → Event Steps → Services → Domain

Modular Monolith:
- Generic: External → Module APIs (public interfaces) → Module Internal Services → Shared Kernel / Domain

For unlisted frameworks: group by directory responsibility.

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
- Entities (model) → connect to the repository/adapter that references them
- Database nodes → connect to the adapter/repository that queries them

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

For the complete schema specification (field names, node/edge rules, layout selection), see [schema-reference.md](schema-reference.md).

After writing the file:
1. Run `npx archrip serve` in the terminal (auto-builds if needed, opens browser)
2. Tell the developer: Run `/archrip-update` to make further adjustments (add/remove nodes, fix relationships, etc.)

$ARGUMENTS
