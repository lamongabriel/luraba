#!/usr/bin/env bash
# Tests the pure helpers of scripts/dev.sh (sourced, so no Docker or dev server is touched).
#   bash scripts/tests/dev-sh.test.sh
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/../dev.sh"

TMP="$(mktemp -d)"
FAILS=0
cleanup_tmp() { [ -n "${LISTENER:-}" ] && kill "$LISTENER" 2>/dev/null; rm -rf "$TMP"; }
trap cleanup_tmp EXIT

assert_eq() { # name expected actual
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: expected [$2] got [$3]"; FAILS=$((FAILS + 1)); fi
}

# env_value
printf 'A=one\nB="two words"\nC=\nD='"'"'x'"'"'\n' >"$TMP/env"
assert_eq "env_value plain" one "$(env_value "$TMP/env" A zz)"
assert_eq "env_value quoted" "two words" "$(env_value "$TMP/env" B zz)"
assert_eq "env_value empty uses default" zz "$(env_value "$TMP/env" C zz)"
assert_eq "env_value single quotes" x "$(env_value "$TMP/env" D zz)"
assert_eq "env_value missing key" zz "$(env_value "$TMP/env" NOPE zz)"
assert_eq "env_value missing file" zz "$(env_value "$TMP/none" A zz)"

# under_root: nested worktrees are other checkouts when ROOT is the main checkout
ROOT="/r/luraba"
under_root "/r/luraba/apps/api" && r=yes || r=no; assert_eq "under_root inside" yes "$r"
under_root "/r/luraba-other" && r=yes || r=no; assert_eq "under_root sibling prefix" no "$r"
under_root "/r/luraba/.claude/worktrees/x/apps" && r=yes || r=no; assert_eq "under_root nested worktree" no "$r"
ROOT="/r/luraba/.claude/worktrees/x"
under_root "/r/luraba/.claude/worktrees/x/apps" && r=yes || r=no; assert_eq "under_root worktree itself" yes "$r"
ROOT="$(cd "$HERE/../.." && pwd)"

# Docker discovery lists OrbStack first-class
assert_eq "orbstack socket candidate" 1 "$(docker_candidate_hosts | grep -c '\.orbstack/run/docker.sock')"

# run_timeout
run_timeout 1 sleep 5 2>/dev/null; assert_eq "run_timeout kills" 124 "$?"
run_timeout 2 true; assert_eq "run_timeout passes through" 0 "$?"

# port_pids / free_port: a listener that is not part of this checkout is never killed without a tty
node -e 'require("net").createServer().listen(39871,"127.0.0.1");setInterval(()=>{},1000)' &
LISTENER=$!
sleep 1
assert_eq "port_pids sees listener" "$LISTENER" "$(port_pids 39871 | head -n 1)"
ROOT="/definitely/not/here"; is_luraba_proc "$LISTENER" && r=yes || r=no
assert_eq "foreign process is not luraba" no "$r"
free_port 39871 </dev/null >/dev/null 2>&1; assert_eq "free_port refuses without tty" 1 "$?"
kill -0 "$LISTENER" 2>/dev/null && r=alive || r=dead; assert_eq "foreign process survives" alive "$r"
ROOT="$(cd "$HERE/../.." && pwd)"

# generate: next numbered migration + journal entry in a scratch copy
mkdir -p "$TMP/m/meta"
echo '{"version":"7","dialect":"postgresql","entries":[{"idx":3,"version":"7","when":1000,"tag":"0003_a","breakpoints":true}]}' >"$TMP/m/meta/_journal.json"
MIGRATIONS_DIR="$TMP/m"; JOURNAL="$TMP/m/meta/_journal.json"
cmd_generate add_things >/dev/null
[ -f "$TMP/m/0004_add_things.sql" ] && r=yes || r=no; assert_eq "generate writes sql" yes "$r"
assert_eq "generate journal idx" 4 "$(node -p "require('$JOURNAL').entries[1].idx")"
assert_eq "generate journal tag" 0004_add_things "$(node -p "require('$JOURNAL').entries[1].tag")"

[ "$FAILS" = 0 ] && echo "all passed" || { echo "$FAILS failed"; exit 1; }
