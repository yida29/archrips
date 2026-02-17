---
name: review-supply-chain
description: Review supply-chain and code-execution risks
user-invocable: true
argument-hint: "[scope: git diff | path | notes]"
---

# Supply-chain / execution safety review

Review the codebase for supply-chain risk and untrusted-code execution paths.

## Focus areas
- Where the tool **executes** external commands (npm, npx, git, shell)
- Where it **downloads/installs** dependencies at runtime
- Template copying / vendored code: how integrity/origin is verified
- Lockfiles and reproducibility (`npm ci` vs `npm install`)
- Symlink/path traversal risks when executing within project directories

## Output format
1. **Attack surface inventory** (commands + cwd + trust boundary)
2. **High-risk findings** (with file paths)
3. **Minimal mitigations** (ordered)
   - pin versions/lockfile, avoid `npx`, run `npm run`, symlink rejection, integrity checks

$ARGUMENTS
