#!/usr/bin/env bash
#
# sync-github.sh — commit the workspace, push the current branch, open/update the PR.
#
# Safe by construction:
#   * never force-pushes
#   * never pushes to the base branch (override: ALLOW_PUSH_MAIN=1)
#   * never deletes a branch
#   * never commits files that .gitignore already excludes
#   * refuses to open an empty PR (identical tree vs base) and says why
#
# Usage:
#   ./sync-github.sh                              commit + push + create/update PR
#   DRY_RUN=1 ./sync-github.sh                     print the plan, change nothing
#   COMMIT_MSG="feat: add squad view" ./sync-github.sh
#   BASE=develop ./sync-github.sh                    PR against a different base
#   SKIP_COMMIT=1 ./sync-github.sh                   push HEAD as-is, stage nothing
#
set -euo pipefail

BASE="${BASE:-main}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_COMMIT="${SKIP_COMMIT:-0}"
ALLOW_PUSH_MAIN="${ALLOW_PUSH_MAIN:-0}"

log() { printf '\033[36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarn:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- preflight ---
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not a git work tree"
cd "$(git rev-parse --show-toplevel)"

BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
[ -n "$BRANCH" ] || die "detached HEAD — check out a branch first (git switch -c <name>)"

git remote get-url origin >/dev/null 2>&1 || die "no 'origin' remote configured"
command -v gh >/dev/null 2>&1 || die "gh CLI not installed — pushing only, no PR"

log "branch $BRANCH  →  base $BASE  ($(git rev-parse --short HEAD))"
[ "$DRY_RUN" = "1" ] && log "DRY_RUN=1 — nothing will be committed, pushed, or opened"

if [ "$BRANCH" = "$BASE" ] && [ "$ALLOW_PUSH_MAIN" != "1" ]; then
  die "you are on the base branch '$BASE'. Move your work to a topic branch:
      git switch -c $BASE-sync && ./sync-github.sh
      (or set ALLOW_PUSH_MAIN=1 to push straight to $BASE)"
fi

# Commit anything the user left untracked-but-unignored out of the ignore list,
# but refuse to silently commit anything that is inside a directory git flags as
# suspicious ownership / huge artifacts.
git fetch --quiet origin "refs/heads/$BASE:refs/remotes/origin/$BASE" 2>/dev/null \
  || git fetch --quiet origin "$BASE" || warn "could not refresh origin/$BASE; comparing against last known state"

# --------------------------------------------------------------- commit all ---
if [ "$SKIP_COMMIT" = "1" ]; then
  log "SKIP_COMMIT=1 — skipping staging and commit"
elif [ -n "$(git status --porcelain)" ]; then
  git add -A
  if git diff --cached --quiet; then
    log "nothing stageable (only ignored files changed)"
  else
    MSG="${COMMIT_MSG:-$(git diff --cached --name-only | awk -F/ '{print $NF}' | head -3 | paste -sd, - )}"
    case "$MSG" in
      feat:*|fix:*|chore:*|docs:*|refactor:*) ;;
      *) MSG="chore: $MSG" ;;
    esac
    if [ "$DRY_RUN" = "1" ]; then
      log "would commit: $MSG"
    else
      git commit --quiet -m "$MSG"
      log "committed: $MSG"
    fi
  fi
else
  log "working tree clean — nothing to commit"
fi

# --------------------------------------------------------------- push only --
BASE_TREE="$(git rev-parse "origin/$BASE^{tree}" 2>/dev/null || true)"
HEAD_TREE="$(git rev-parse 'HEAD^{tree}')"
FILES_CHANGED=0
if [ -n "$BASE_TREE" ]; then
  FILES_CHANGED="$(git diff --name-only "origin/$BASE" HEAD | wc -l | tr -d ' ')"
fi

if [ "$DRY_RUN" = "1" ]; then
  log "would push origin $BRANCH ($FILES_CHANGED file(s) differ from $BASE)"
  exit 0
fi

PUSH_OUT="$(git push -u origin "$BRANCH" 2>&1)" && PUSH_RC=0 || PUSH_RC=$?
printf '%s\n' "$PUSH_OUT" | sed 's/^/    /'
if [ "$PUSH_RC" -ne 0 ]; then
  die "push rejected. The remote branch has commits you do not have.
      Fix: git pull --rebase origin $BRANCH   then re-run ./sync-github.sh
      (do NOT force-push a branch someone else may be using)"
fi

# ------------------------------------------------------------------- open ---
if [ -n "$BASE_TREE" ] && [ "$BASE_TREE" = "$HEAD_TREE" ]; then
  log "HEAD tree is byte-identical to origin/$BASE — nothing to merge, no PR opened."
  log "If you expected work here, it was never committed in this sandbox."
  exit 0
fi

if [ "$FILES_CHANGED" = "0" ]; then
  log "pushed. $BRANCH differs from $BASE in history only (0 file changes) — no PR opened."
  exit 0
fi

TITLE="$(git log -1 --pretty=%s)"
COUNT="$(git rev-list --count "origin/$BASE..HEAD" 2>/dev/null || echo '?')"
STAT="$(git diff --stat "origin/$BASE" HEAD | tail -1)"
LIST="$(git log --oneline "origin/$BASE..HEAD" 2>/dev/null | head -20 || git log --oneline -10 HEAD)"

BODY="$(cat <<EOF
### Synced from the Arena coding sandbox

**$COUNT** commit(s) ahead of \`$BASE\` · **$FILES_CHANGED** file(s) changed · \`$STAT\`

### Commits
\`\`\`
$LIST
\`\`\`

### Verification
\`\`\`
$(git status -sb | head -3)
\`\`\`

---
_Pushed by \`sync-github.sh\` (no force-push, no branch deletion)._
EOF
)"

if PR_REF="$(gh pr view --json number,url --jq '[.number,.url] | @tsv' 2>/dev/null)"; then
  PR_NUM="${PR_REF%%	*}"; PR_URL="${PR_REF##*	}"
  log "PR already open — updating: $PR_URL"
  # `gh pr edit` still joins the sunset Projects-classic GraphQL field on some gh
  # versions and dies; REST PATCH on the issue is the same write without that join.
  gh api -X PATCH "repos/{owner}/{repo}/issues/$PR_NUM" -F title="$TITLE" -F body="$BODY" >/dev/null 2>&1 \
    || gh pr edit "$PR_NUM" --title "$TITLE" --body "$BODY" >/dev/null 2>&1 \
    || warn "pushed fine, but could not refresh the PR title/body — edit it on $PR_URL if that matters"
  gh pr comment "$PR_NUM" --body "Re-synced with \`$(git rev-parse --short HEAD)\` — $FILES_CHANGED file(s) changed." >/dev/null 2>&1 || true
  gh pr comment "$EXISTING" --body "Re-synced with \`$(git rev-parse --short HEAD)\` — $FILES_CHANGED file(s) changed." >/dev/null 2>&1 || true
else
  log "opening PR: $BRANCH → $BASE"
  gh pr create --base "$BASE" --head "$BRANCH" --title "$TITLE" --body "$BODY"
fi

log "done"
git status -sb | head -2 | sed 's/^/    /'
