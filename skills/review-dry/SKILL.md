---
name: review-dry
description: Review codebase for DRY (duplication) issues
user-invocable: true
argument-hint: "[scope: git diff | path | PR | notes]"
---

# DRY review — duplication, single source of truth

Review the target codebase with a DRY lens and report **actionable** duplication.

## Scope
Use `$ARGUMENTS` to decide scope:
- If it mentions `git diff` / PR / commit: focus on changed areas first.
- If it mentions a path: review that subtree.
- If empty: scan the repository for high-impact duplication.

## What to look for (examples)
- Duplicated **types/interfaces** across packages
- Duplicated **constants** (paths, magic strings, category metadata, colors)
- Duplicated **validation** rules / parsing logic
- Repeated **error messages** and CLI usage guidance
- Copy-pasted **command steps** (install/build/serve)

## Output format
Produce:
1. **Top duplications (priority order)**
   - Evidence: file paths + short excerpt references
   - Why it hurts (change amplification / inconsistency risk)
   - Smallest refactor that removes duplication (shared module, helper, constant)
2. **Quick wins** (low effort, high payoff)
3. **Risks of over-abstraction** (what NOT to DRY)

$ARGUMENTS
