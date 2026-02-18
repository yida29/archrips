---
name: review-schema-first
description: Review schema as a single source of truth (Schema-first)
user-invocable: true
argument-hint: "[schema name | scope: git diff | path | notes]"
---

# Schema-first review — single source of truth & contracts

Audit whether the project has **one authoritative schema**, and whether all producers/consumers conform.

## Scope
Use `$ARGUMENTS` to select the schema (default: the main JSON/data contract) and its producers/consumers.

## Checklist
- Where is the **authoritative schema**? (JSON Schema / OpenAPI / protobuf / TS types)
- Is it duplicated as hand-written TS interfaces elsewhere?
- Do validators enforce the same rules as the schema?
- Are there **multiple variants** (input vs processed output)? If yes, are they explicitly versioned?
- Do templates/examples/docs match the schema?
- Is the schema reference URL **pinned** (tagged) vs `main`?

## Output format
1. **SSoT map**: schema file(s) + all producers/consumers
2. **Divergences** (schema vs code vs docs), with file paths
3. **Minimum path to Schema-first**
   - e.g. split input/output schemas, generate types, use a single validator

$ARGUMENTS
