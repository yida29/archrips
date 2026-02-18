---
description: Update architecture diagram after code changes
argument-hint: "[scope or instructions]"
---

# archrip update — Incremental architecture update

Update `.archrip/architecture.json` based on recent code changes.

1. Run `git diff --name-only HEAD~10` to find changed files
2. Read the current `.archrip/architecture.json`
3. For each changed file:
   - New component? → Add node + edges
   - Removed component? → Remove node + edges + use case references
   - Changed dependencies? → Update edges
4. Preserve existing node IDs for unchanged components
5. Write updated `.archrip/architecture.json`

$ARGUMENTS
