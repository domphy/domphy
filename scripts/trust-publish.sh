#!/usr/bin/env bash
# Register .github/workflows/publish.yml as the npm Trusted Publisher of every
# public package. Run once, and again after adding a package. One 2FA prompt:
# tick "skip two-factor authentication for the next 5 minutes" on the npm page.
# 2 s between calls: docs.npmjs.com/cli/v11/commands/npm-trust (rate limit).
set -u
cd "$(dirname "$0")/.."
for dir in packages/*/; do
  [ "$(node -p "!!require('./${dir}package.json').private")" = "true" ] && continue
  name=$(node -p "require('./${dir}package.json').name")
  echo "== $name"
  npx -y npm@latest trust github "$name" --file publish.yml --repo domphy/domphy --allow-publish -y
  sleep 2
done
