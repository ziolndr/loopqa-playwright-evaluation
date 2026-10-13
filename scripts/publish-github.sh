#!/usr/bin/env bash
# Publish using the previously established ziolndr GitHub CLI + SSH workflow.
set -euo pipefail

repo='ziolndr/loopqa-playwright-evaluation'
repo_url="https://github.com/${repo}"
ssh_remote="git@github.com:${repo}.git"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if ! command -v gh >/dev/null 2>&1; then
  echo 'ERROR: gh (GitHub CLI) is missing; run the one-command launcher.' >&2
  exit 1
fi
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo 'GitHub CLI is not logged in. Sign in once to allow repository creation.'
  gh auth login --hostname github.com --web --git-protocol ssh
fi

account="$(gh api user --jq '.login')"
if [[ "$(printf '%s' "$account" | tr '[:upper:]' '[:lower:]')" != 'ziolndr' ]]; then
  printf 'ERROR: gh is logged in as %s, expected ziolndr.\n' "$account" >&2
  echo 'Run: gh auth switch --hostname github.com --user ziolndr' >&2
  exit 1
fi

# GitHub's SSH greeting is emitted to stderr with exit code 1 on success.
ssh_result="$(ssh -o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true)"
if [[ "$ssh_result" != *'Hi ziolndr!'* ]]; then
  printf 'ERROR: existing SSH credentials did not authenticate as ziolndr.\n%s\n' "$ssh_result" >&2
  echo 'No HTTPS push or new credentials will be substituted.' >&2
  exit 1
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_root="$(git rev-parse --show-toplevel)"
  if [[ "$git_root" != "$root" ]]; then
    echo "ERROR: unrelated enclosing Git repository: $git_root" >&2
    exit 1
  fi
else
  git init -b main
fi

git add README.md .env.example .gitignore package.json playwright.config.js data docs pages tests scripts .github
if ! git diff --cached --quiet; then
  git -c user.name='Joel David Trout II' \
      -c user.email='joel.d.trout.two@gmail.com' \
      commit -m 'Add JSON-driven Playwright evaluation for LoopQA'
fi

origin=''
if git remote get-url origin >/dev/null 2>&1; then
  origin="$(git remote get-url origin)"
  case "$origin" in
    "$repo_url"|"${repo_url}.git"|"$ssh_remote"|"git@github.com:${repo}") ;;
    *) echo "ERROR: origin is an unrelated repository ($origin). Refusing to publish." >&2; exit 1 ;;
  esac
fi

if gh repo view "$repo" --json visibility >/dev/null 2>&1; then
  visibility="$(gh repo view "$repo" --json visibility --jq '.visibility')"
  if [[ "$visibility" != 'PUBLIC' ]]; then
    echo "ERROR: $repo_url exists but is not public; refusing visibility changes." >&2
    exit 1
  fi
  if [[ -z "$origin" ]]; then
    # For an existing empty repository only; never replace existing remote history.
    if [[ -n "$(git ls-remote --heads "$ssh_remote")" ]]; then
      echo "ERROR: $repo_url has existing branches and this local project is not linked." >&2
      exit 1
    fi
    git remote add origin "$ssh_remote"
  fi
else
  echo "Creating public GitHub repository $repo_url using the authenticated ziolndr account."
  gh repo create "$repo" --public --source=. --remote=origin
fi

# SSH bypasses the known HTTPS token workflow-scope rejection.
git remote set-url origin "$ssh_remote"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || { echo 'ERROR: no active Git branch' >&2; exit 1; }
# Non-force push: divergence fails instead of overwriting remote work.
git push -u origin "$branch"
printf '\nPUBLISHED: %s\n' "$repo_url"
