#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]
# Default: patch

BUMP="${1:-patch}"

# 1. Bump version in packages/cli/package.json (source of truth)
cd "$(git rev-parse --show-toplevel)"
CURRENT=$(node -p "require('./packages/cli/package.json').version")
# Dry-run to preview next version
cd packages/cli && npm version "$BUMP" --no-git-tag-version > /dev/null && cd ../..
NEXT=$(node -p "require('./packages/cli/package.json').version")
# Restore to current before confirmation
npm version "$CURRENT" --no-git-tag-version --allow-same-version -w packages/cli > /dev/null

echo "Release: v${CURRENT} → v${NEXT} (${BUMP})"
read -r -p "Proceed? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

npm version "$BUMP" --no-git-tag-version -w packages/cli > /dev/null
VERSION="$NEXT"

# 2. Sync to .claude-plugin/plugin.json and marketplace.json
node -e "
  const fs = require('fs');
  const v = '$VERSION';
  const plugin = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
  plugin.version = v;
  fs.writeFileSync('.claude-plugin/plugin.json', JSON.stringify(plugin, null, 2) + '\n');
  const mp = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'));
  mp.plugins[0].version = v;
  fs.writeFileSync('.claude-plugin/marketplace.json', JSON.stringify(mp, null, 2) + '\n');
"

# 3. Commit, tag, push
git add packages/cli/package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"
git push && git push --tags

echo ""
echo "Released v$VERSION — CI will publish to npm."
