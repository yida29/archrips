---
name: review-test-strategy
description: Review test strategy and regression resistance
user-invocable: true
argument-hint: "[scope: repo | package | command flow | notes]"
---

# Test strategy review — regression resistance & minimal effective tests

Review the repo’s current test coverage and propose the smallest set of tests that prevents common regressions.

## What to look for
- Existing test runners / scripts / CI workflows (or absence)
- Most fragile boundaries: CLI flows (init/build/serve), schema validation, layout, viewer loading
- Contract tests: schema vs examples/templates/docs
- Packaging tests: published artifacts include required templates/schema assets

## Output format
1. **Current state** (what exists, what doesn’t)
2. **High-value tests** (ordered)
   - unit/contract/E2E smoke (keep it minimal)
3. **CI suggestion** (if none): run typecheck/build + a small smoke test

$ARGUMENTS
