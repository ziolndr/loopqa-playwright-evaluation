#!/usr/bin/env bash
# Called by the self-extracting one-command launcher after unpacking.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

install_with_brew() {
  local package="$1"
  if ! command -v brew >/dev/null 2>&1; then
    printf 'ERROR: %s is needed, but Homebrew is not installed.\n' "$package" >&2
    printf 'Install it from https://brew.sh/ and rerun the launcher.\n' >&2
    exit 1
  fi
  brew install "$package"
}

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Installing Node.js with Homebrew...'
  install_with_brew node
fi
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ "$node_major" -lt 20 ]]; then
  echo "ERROR: Node.js >=20 required; installed: $(node --version)." >&2
  echo 'Update Node.js and rerun.' >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo 'Installing GitHub CLI with Homebrew...'
  install_with_brew gh
fi
if ! command -v git >/dev/null 2>&1; then
  echo 'ERROR: git is required. Install Xcode Command Line Tools with: xcode-select --install' >&2
  exit 1
fi

echo
echo '=== 1/4: Install dependencies ==='
npm install
npx playwright install chromium

echo
echo '=== 2/4: Validate JavaScript and scenario data ==='
npm run typecheck
npm run test:data

echo
echo '=== 3/4: Run all six live browser scenarios ==='
if ! npm test; then
  echo >&2
  echo 'Browser tests failed. The repository has NOT been published.' >&2
  echo "Inspect results with: cd \"$root\" && npm run report" >&2
  first_context="$(find "$root/test-results" -name error-context.md -type f 2>/dev/null | head -n 1 || true)"
  if [[ -n "$first_context" ]]; then
    echo >&2
    echo 'First failed browser snapshot (excerpt):' >&2
    sed -n '1,110p' "$first_context" >&2
  fi
  exit 1
fi

echo
echo '=== 4/4: Publish to GitHub as ziolndr ==='
bash scripts/publish-github.sh

echo
echo 'Completed: https://github.com/ziolndr/loopqa-playwright-evaluation'
echo 'Submit the repository URL and a 2-3 minute walkthrough video in the LoopQA Google Form.'
