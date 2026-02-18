---
name: review-ux-diagnostics
description: Review UX and diagnostics (errors, hints, verbose mode)
user-invocable: true
argument-hint: "[scope: git diff | path | notes]"
---

# UX / diagnostics review — error messages, next steps, verbose

Review whether user-facing behavior is understandable and debuggable.

## What to look for
- Error messages: consistency (prefix, punctuation, tone), specificity, and actionable next steps
- Help text: completeness and drift vs actual behavior
- Default output verbosity: quiet-on-success, rich-on-failure
- Need for `--verbose` / `--debug` and where it should affect logging
- Viewer/UI error states: HTTP errors, parsing errors, partial rendering

## Output format
1. **Message inconsistencies** (examples + file paths)
2. **Missing hints** (what should be suggested next)
3. **Verbose/debug recommendation**
   - minimal design: global flag, toggles external command stdio, prints causes

$ARGUMENTS
