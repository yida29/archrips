---
name: review-srp
description: Review codebase for SRP (Single Responsibility) and boundaries
user-invocable: true
argument-hint: "[scope: git diff | path | PR | notes]"
---

# SRP / boundaries review — responsibilities & layering

Review the target codebase for SRP violations and unclear module boundaries.

## Scope
Interpret `$ARGUMENTS` (diff/path/repo) and start from the most user-facing entrypoints.

## What to look for
- One function/module doing **orchestration + business logic + IO + formatting**
- Utilities that perform **process termination** or global side effects
- UI components mixing **data fetching + transformation + rendering**
- Cross-package coupling where a lower layer knows too much about an upper layer

## Output format
1. **Hotspots** (modules/functions with too many reasons to change)
   - Evidence: file path + responsibility list
2. **Boundary fixes**
   - Suggested split into modules (pure vs side-effect)
   - What becomes public API vs internal
3. **Smallest safe refactor** (minimal files/lines)

$ARGUMENTS
