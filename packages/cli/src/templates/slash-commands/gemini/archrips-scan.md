---
description: Scan codebase and generate architecture diagram data
---

# archrips scan — Analyze codebase architecture

Analyze the current codebase and generate `.archrips/architecture.json`.

## Phase 1: Project Discovery
1. Read top-level files (package.json, composer.json, go.mod, Cargo.toml, pom.xml, pyproject.toml, etc.)
2. Identify language, framework, source root
3. List directory structure (2 levels deep)

## Phase 2: Layer Identification
Based on the framework, identify architectural layers:

**Common patterns:**
- Laravel: Controllers → Services → Ports → Adapters → Models
- Express/NestJS: Routes/Controllers → Services → Repositories → Models
- Next.js: Pages → Components → Hooks → API Routes → Services
- Django: Views → Serializers → Services → Models
- Spring Boot: Controllers → Services → Repositories → Entities
- Go: Handlers → Services → Repositories → Models
- Generic: Group by directory responsibility

## Phase 3: Read Key Files
For each layer, read representative files to extract:
- Component names and purposes
- Dependencies (imports, injections)
- Public methods/routes
- Database schemas (from migrations or model definitions)

**Do NOT read every file.** Focus on entry points, core logic, interfaces, and data models.

## Phase 4: Map Relationships
For each component, identify:
- What it depends on (imports, constructor injection)
- What depends on it
- External service connections

## Phase 5: Identify Use Cases
Group related components into user-facing features.

## Phase 6: Generate architecture.json
Write the complete `.archrips/architecture.json` following the schema.

### Node Rules
- `id`: kebab-case, prefixed by category abbreviation (ctrl-, svc-, port-, adpt-, model-, ext-, job-, dto-)
- `layer`: 0=external, 1=entry points, 2=application logic, 3=abstractions, 4=implementations, 5=data
- `category`: one of controller, service, port, adapter, model, external, job, dto (or custom)
- `filePath`: relative from project root
- `depth` (optional): 0=overview (boundary), 1=structure (internal), 2=detail (implementation). Auto-inferred from category if omitted
- `useCases`: array of use case IDs this node participates in

### Edge Rules
- `type`: dependency | implements | relation
- Only include significant architectural dependencies (not utility imports)

### Schema Rules
- Include table schema only when migration files or model annotations are available
- Reference from node data using schema key name

$ARGUMENTS
