---
name: review-error-handling
description: Review error handling consistency and debuggability
user-invocable: true
argument-hint: "[scope: git diff | path | PR | notes]"
---

# Error handling review — consistency, propagation, debuggability

Review the target codebase for error-handling quality: how errors are created, wrapped, displayed, and surfaced.

## What to look for
- Inconsistent patterns: `process.exit`, `throw`, `return error`, swallowed exceptions
- External command execution failures lacking stdout/stderr context
- Errors without next-step guidance (what user should do)
- Catch-all handlers that hide non-user-interrupt failures
- UI/API boundaries where an error loses its root cause

## Output format
1. **Findings** (priority order)
   - Evidence: file paths + patterns used
   - User impact (hard to debug / wrong exit code / silent failure)
2. **Recommended conventions**
   - Where to terminate (only at entrypoints)
   - Error shape (message + cause + hints)
3. **Smallest change set** to align behavior

$ARGUMENTS
