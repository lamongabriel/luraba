#!/usr/bin/env bash
# Luraba dev runner: Postgres + Redis + MinIO in Docker, everything else native with hot reload.
#
#   ./scripts/dev.sh help     (or: pnpm dev:doctor, pnpm db:studio, ...)
#
# Bash 3.2 compatible (macOS default): no associative arrays, mapfile or `wait -n`.
# Sourcing this file only defines the functions (used by scripts/tests/dev-sh.test.sh).

LURABA_SH_VERSION=1

_this="${BASH_SOURCE[0]:-$0}"
ROOT="$(cd "$(dirname "$_this")/.." && pwd)"
unset _this

API_ENV="$ROOT/apps/api/.env"
STATE_DIR="$ROOT/node_modules/.cache/luraba-dev"
STATE_FILE="$STATE_DIR/run.state"
MIGRATIONS_DIR="$ROOT/apps/api/src/db/migrations"
JOURNAL="$MIGRATIONS_DIR/meta/_journal.json"

WEB_PORT=3000
MCP_PORT=3333
STUDIO_PORT="${STUDIO_PORT:-4983}"
INFRA_SERVICES="db redis minio"
STARTED_CONTAINERS=""
RUN_PGID=""
CLEANED=0

usage() {
  cat <<'EOF'
Luraba dev runner

Usage: ./scripts/dev.sh <command> [options]

Run
  up [flags]           Postgres + Redis + MinIO (Docker) -> migrate -> API, web, worker and MCP
                       natively with hot reload. Ctrl+C stops what this run started. (default)
                         --no-web --no-worker --no-mcp --no-migrate
                         --light    API + web only, Node capped at 4 GB per process
                         --email    keep SMTP and web-push credentials (off by default in dev)
  worker               Only the worker (starts the database services if needed)
  mcp                  Only the MCP server
  stop [--stale]       Stop the recorded run (--stale: only if that run is gone) and free dev ports
                       held by this checkout
  doctor               Docker status, dev ports and who holds them, containers, recorded run

Database
  db                   Start only Postgres, Redis and MinIO
  db-stop              Stop them
  db-reset             Drop and recreate luraba_db (asks first), then migrate. Test databases stay.
  migrate              Apply pending migrations
  generate <name>      Scaffold the next hand-written migration (SQL file + _journal.json entry)
  studio               Database UI (Drizzle Studio) against the local database
  db:dump [file]       pg_dump -Fc luraba_db to a file (default ./luraba_<timestamp>.dump)
  db:restore <file> [--yes]
                       Make luraba_db BECOME the dump (keeps the old one as luraba_db_pre_restore)
  db:snapshot [name]   Quick local copy of luraba_db inside Postgres (CREATE DATABASE ... TEMPLATE)
  db:snapshot-restore [name]   Replace luraba_db with that snapshot

Other
  clean-web            Remove the Next.js build cache (apps/web/.next)
  build                Production build of the workspace
  test                 API integration tests (loads apps/api/.env.test; never the dev database)
  web-test             Web unit tests
  lint | lint-fix | typecheck
  help
EOF
}

say() { printf '%s\n' "$*"; }
warn() { printf 'WARN  %s\n' "$*" >&2; }
die() { printf 'ERROR %s\n' "$*" >&2; exit 1; }

# env_value FILE KEY [DEFAULT]: value of KEY in a dotenv file, quotes stripped.
env_value() {
  local file="$1" key="$2" default="${3:-}" line
  if [ -f "$file" ]; then
    line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1)"
    if [ -n "$line" ]; then
      line="${line#*=}"
      line="${line%\"}"; line="${line#\"}"
      line="${line%\'}"; line="${line#\'}"
      if [ -n "$line" ]; then printf '%s' "$line"; return 0; fi
    fi
  fi
  printf '%s' "$default"
}

api_value() { env_value "$API_ENV" "$1" "${2:-}"; }
API_PORT_VALUE() { printf '%s' "${LURABA_API_PORT:-$(api_value PORT 3001)}"; }

# ---------------------------------------------------------------------------------------------
# Node / preflight
# ---------------------------------------------------------------------------------------------

use_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)"
    if [ "${major:-0}" -ge 22 ]; then return 0; fi
  fi
  local nvm="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$nvm" ]; then
    # shellcheck disable=SC1090
    . "$nvm" >/dev/null 2>&1
    nvm use 22 >/dev/null 2>&1 || nvm install 22 >/dev/null 2>&1
  fi
  command -v node >/dev/null 2>&1 || die "Node 22+ is required (install it or use nvm)."
}

preflight() {
  use_node
  command -v pnpm >/dev/null 2>&1 || die "pnpm is required (corepack enable)."
  command -v docker >/dev/null 2>&1 || die "docker is required for Postgres, Redis and MinIO."
  command -v lsof >/dev/null 2>&1 || die "lsof is required."
  [ -f "$API_ENV" ] || die "apps/api/.env is missing. Copy apps/api/.env.example and fill AUTH_SECRET."
  [ -d "$ROOT/node_modules" ] || die "Dependencies are not installed. Run: pnpm install"
}

# ---------------------------------------------------------------------------------------------
# Process helpers
# ---------------------------------------------------------------------------------------------

# run_timeout SECONDS cmd...: portable timeout (macOS has none). Returns 124 on timeout.
run_timeout() {
  local secs="$1"; shift
  "$@" &
  local pid=$! waited=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$waited" -ge $((secs * 10)) ]; then
      kill -TERM "$pid" 2>/dev/null; sleep 0.2; kill -KILL "$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      return 124
    fi
    sleep 0.1
    waited=$((waited + 1))
  done
  wait "$pid"
}

# wait_dead PID [SECONDS]
wait_dead() {
  local pid="$1" secs="${2:-5}" i=0
  while kill -0 "$pid" 2>/dev/null; do
    [ "$i" -ge $((secs * 10)) ] && return 1
    sleep 0.1; i=$((i + 1))
  done
  return 0
}

# descendants PID: PID plus every child, recursively.
descendants() {
  local pid="$1" child
  printf '%s\n' "$pid"
  for child in $(pgrep -P "$pid" 2>/dev/null); do descendants "$child"; done
}

# kill_tree PID: TERM the whole tree, KILL what survives.
kill_tree() {
  local pid="$1" p all
  all="$(descendants "$pid")"
  for p in $all; do kill -TERM "$p" 2>/dev/null; done
  for p in $all; do
    wait_dead "$p" 4 || kill -KILL "$p" 2>/dev/null
  done
}

pgid_alive() { [ -n "${1:-}" ] && kill -0 -- "-$1" 2>/dev/null; }

proc_cmd() { ps -o command= -p "$1" 2>/dev/null; }
proc_cwd() { lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1; }

# under_root PATH: PATH is inside this checkout (a worktree nested in ROOT is a different checkout).
under_root() {
  case "$1" in
    "$ROOT/.claude/worktrees/"*) case "$ROOT" in */.claude/worktrees/*) ;; *) return 1 ;; esac ;;
  esac
  case "$1" in "$ROOT"|"$ROOT"/*) return 0 ;; esac
  return 1
}

# is_luraba_proc PID: the process runs from this checkout (cwd or command line under ROOT).
is_luraba_proc() {
  local pid="$1" cwd cmd word
  cwd="$(proc_cwd "$pid")"
  under_root "$cwd" && return 0
  cmd="$(proc_cmd "$pid")"
  for word in $cmd; do
    under_root "$word" && return 0
  done
  return 1
}

# group_is_luraba PGID: any member of the process group belongs to this checkout.
group_is_luraba() {
  local pgid="$1" pid
  for pid in $(ps -axo pid=,pgid= | awk -v g="$pgid" '$2 == g {print $1}'); do
    is_luraba_proc "$pid" && return 0
  done
  return 1
}

stop_group() {
  local pgid="$1" i=0
  pgid_alive "$pgid" || return 0
  kill -TERM -- "-$pgid" 2>/dev/null
  while pgid_alive "$pgid" && [ "$i" -lt 50 ]; do sleep 0.1; i=$((i + 1)); done
  pgid_alive "$pgid" && kill -KILL -- "-$pgid" 2>/dev/null
  return 0
}

# ---------------------------------------------------------------------------------------------
# Docker discovery (OrbStack, Docker Desktop, Colima, Rancher Desktop)
# ---------------------------------------------------------------------------------------------

docker_ping() { run_timeout "${1:-5}" docker info >/dev/null 2>&1; }

docker_candidate_hosts() {
  [ -n "${DOCKER_HOST:-}" ] && printf '%s\n' "$DOCKER_HOST"
  printf '%s\n' \
    "unix://$HOME/.orbstack/run/docker.sock" \
    "unix:///var/run/docker.sock" \
    "unix://$HOME/.docker/run/docker.sock" \
    "unix://$HOME/.colima/default/docker.sock" \
    "unix://$HOME/.rd/docker.sock"
}

# docker_find_host: try the default context, then each socket; export DOCKER_HOST for the first that answers.
docker_find_host() {
  local host sock
  docker_ping 5 && return 0
  while IFS= read -r host; do
    sock="${host#unix://}"
    [ -S "$sock" ] || continue
    if DOCKER_HOST="$host" docker_ping 5; then
      export DOCKER_HOST="$host"
      return 0
    fi
  done <<EOF
$(docker_candidate_hosts)
EOF
  return 1
}

ensure_docker() {
  local attempt
  for attempt in 1 2 3; do
    docker_find_host && return 0
    [ "$attempt" -lt 3 ] && { say "Docker is not answering yet, retrying ($attempt/3)..."; sleep 3; }
  done
  cat >&2 <<'EOF'
ERROR Docker is not running.
  OrbStack:        open -a OrbStack          (socket: ~/.orbstack/run/docker.sock)
  Docker Desktop:  open -a Docker
  Colima:          colima start
Then run the command again.
EOF
  exit 1
}

compose() {
  if [ -f "$API_ENV" ]; then
    (cd "$ROOT" && docker compose --env-file "$API_ENV" "$@")
  else
    (cd "$ROOT" && docker compose "$@")
  fi
}

DB_USER_VALUE() { api_value DB_USER luraba; }
DB_NAME_VALUE() { api_value DB_NAME luraba_db; }

# psql_admin SQL: run SQL against the maintenance database "postgres".
psql_admin() {
  compose exec -T db psql -U "$(DB_USER_VALUE)" -d postgres -v ON_ERROR_STOP=1 -Atqc "$1"
}
psql_db() {
  local db="$1" sql="$2"
  compose exec -T db psql -U "$(DB_USER_VALUE)" -d "$db" -v ON_ERROR_STOP=1 -Atqc "$sql"
}

# service_running SERVICE
service_running() { [ -n "$(compose ps --status running -q "$1" 2>/dev/null)" ]; }

wait_healthy() {
  local svc="$1" i=0 id state
  while [ "$i" -lt 60 ]; do
    id="$(compose ps -q "$svc" 2>/dev/null)"
    state="$([ -n "$id" ] && docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null)"
    case "$state" in healthy|running) return 0 ;; esac
    sleep 1; i=$((i + 1))
  done
  return 1
}

# ensure_db: bring up db, redis and minio; remember which ones THIS run had to start.
ensure_db() {
  ensure_docker
  local svc missing=""
  for svc in $INFRA_SERVICES; do
    if ! service_running "$svc"; then
      missing="$missing $svc"
    fi
  done
  if [ -n "$missing" ]; then
    say "Starting containers:$missing"
    compose up -d --wait $missing >/dev/null || die "Could not start$missing (see: docker compose logs)."
    STARTED_CONTAINERS="$STARTED_CONTAINERS$missing"
    state_write
  fi
  for svc in $INFRA_SERVICES; do
    wait_healthy "$svc" || die "$svc is not healthy."
  done
}

# ---------------------------------------------------------------------------------------------
# Ports
# ---------------------------------------------------------------------------------------------

port_pids() { lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null | sort -u; }

# free_port PORT: stop a stale process on PORT if it belongs to this checkout. Anything else needs
# an interactive yes; without a tty it is refused. Unrelated processes are never killed silently.
free_port() {
  local port="$1" pid cmd answer rc=0
  for pid in $(port_pids "$port"); do
    cmd="$(proc_cmd "$pid")"
    if is_luraba_proc "$pid"; then
      say "Port $port: stopping stale Luraba process $pid"
      kill_tree "$pid"
    elif [ -t 0 ] && [ -t 1 ]; then
      printf 'Port %s is held by pid %s (%s), not part of this checkout. Kill it? [y/N] ' "$port" "$pid" "$cmd"
      read -r answer
      case "$answer" in
        y|Y|yes) kill_tree "$pid" ;;
        *) rc=1 ;;
      esac
    else
      warn "Port $port is held by pid $pid ($cmd), not part of this checkout; leaving it (needs a terminal to ask)."
      rc=1
    fi
  done
  [ -z "$(port_pids "$port")" ] || rc=1
  return "$rc"
}

claim_port() {
  local port="$1" label="$2"
  [ -z "$(port_pids "$port")" ] && return 0
  free_port "$port" || die "Port $port ($label) is busy. Run ./scripts/dev.sh doctor"
}

# ---------------------------------------------------------------------------------------------
# State file: lets `stop` and the next `up` clean up after a crash
# ---------------------------------------------------------------------------------------------

state_write() {
  mkdir -p "$STATE_DIR"
  {
    printf 'owner=%s\n' "$$"
    printf 'pgid=%s\n' "${RUN_PGID:-}"
    printf 'containers=%s\n' "$(printf '%s' "$STARTED_CONTAINERS" | sed 's/^ *//')"
    printf 'ports=%s\n' "${CLAIMED_PORTS:-}"
    printf 'started=%s\n' "$(date +%Y-%m-%dT%H:%M:%S)"
  } >"$STATE_FILE"
}

state_get() { [ -f "$STATE_FILE" ] && sed -n "s/^$1=//p" "$STATE_FILE" | head -n 1; }

# sweep_ports PORT...: free dev ports held by THIS checkout only.
sweep_ports() {
  local port pid
  for port in "$@"; do
    for pid in $(port_pids "$port"); do
      is_luraba_proc "$pid" && kill_tree "$pid"
    done
  done
}

cleanup() {
  [ "$CLEANED" = 1 ] && return 0
  CLEANED=1
  trap - INT TERM HUP EXIT
  say ""
  say "Stopping dev servers..."
  [ -n "$RUN_PGID" ] && stop_group "$RUN_PGID"
  sweep_ports $CLAIMED_PORTS
  if [ -n "$STARTED_CONTAINERS" ]; then
    say "Stopping containers this run started:$STARTED_CONTAINERS"
    compose stop $STARTED_CONTAINERS >/dev/null 2>&1
  fi
  rm -f "$STATE_FILE"
}

on_signal() { cleanup; exit 130; }

# run_managed cmd...: run in its own process group (set -m) so Ctrl+C and cleanup reach every child.
run_managed() {
  trap on_signal INT TERM HUP
  trap cleanup EXIT
  set -m
  "$@" &
  RUN_PGID=$!
  set +m
  state_write
  wait "$RUN_PGID"
  local rc=$?
  RUN_PGID=""
  return "$rc"
}

# stop_recorded_run: clean up whatever a previous (possibly crashed) run recorded.
stop_recorded_run() {
  [ -f "$STATE_FILE" ] || return 1
  local pgid owner containers
  pgid="$(state_get pgid)"; owner="$(state_get owner)"; containers="$(state_get containers)"
  if [ -n "$owner" ] && [ "$owner" != "$$" ] && kill -0 "$owner" 2>/dev/null && [ "${1:-}" = "--stale" ]; then
    return 2 # a live run owns it
  fi
  if [ -n "$pgid" ] && pgid_alive "$pgid"; then
    if group_is_luraba "$pgid"; then
      say "Stopping recorded run (process group $pgid)"
      stop_group "$pgid"
    else
      warn "Recorded process group $pgid is not part of this checkout; not touching it."
    fi
  fi
  if [ -n "$owner" ] && [ "$owner" != "$$" ] && kill -0 "$owner" 2>/dev/null; then
    kill -TERM "$owner" 2>/dev/null
  fi
  if [ -n "$containers" ]; then
    say "Stopping containers the recorded run started: $containers"
    ensure_docker
    compose stop $containers >/dev/null 2>&1
  fi
  rm -f "$STATE_FILE"
  return 0
}

stop_previous_run() { stop_recorded_run --stale >/dev/null 2>&1; return 0; }

# ---------------------------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------------------------

cmd_stop() {
  local stale=0
  [ "${1:-}" = "--stale" ] && stale=1
  use_node
  if [ "$stale" = 1 ]; then
    stop_recorded_run --stale
    case $? in 1) say "Nothing recorded." ;; 2) say "A live run is active; leaving it (stop without --stale to end it)." ;; esac
    return 0
  fi
  stop_recorded_run || say "No recorded run."
  sweep_ports "$(API_PORT_VALUE)" "$WEB_PORT" "$MCP_PORT"
  say "Done. Containers are left running unless the recorded run started them (./scripts/dev.sh db-stop)."
}

cmd_doctor() {
  say "== Docker"
  if docker_find_host; then
    say "ok  ($(docker version -f '{{.Server.Version}}' 2>/dev/null) via ${DOCKER_HOST:-default context})"
  else
    say "NOT RUNNING (OrbStack: open -a OrbStack)"
  fi
  say ""
  say "== Dev ports"
  local port label pid
  for entry in "$(API_PORT_VALUE):api" "$WEB_PORT:web" "$MCP_PORT:mcp" "$STUDIO_PORT:studio" "5432:postgres" "6379:redis" "9000:minio"; do
    port="${entry%%:*}"; label="${entry##*:}"
    pid="$(port_pids "$port" | head -n 1)"
    if [ -z "$pid" ]; then
      printf '  %-6s %-9s free\n' "$port" "$label"
    else
      printf '  %-6s %-9s pid %s  %s  [%s]\n' "$port" "$label" "$pid" "$(proc_cmd "$pid" | cut -c1-70)" \
        "$(is_luraba_proc "$pid" && echo "this checkout" || echo "other")"
    fi
  done
  say ""
  say "== Containers"
  if docker_ping 5; then
    compose ps -a --format 'table {{.Name}}\t{{.Service}}\t{{.Status}}' 2>/dev/null || true
  else
    say "  (docker unavailable)"
  fi
  say ""
  say "== Recorded run"
  if [ -f "$STATE_FILE" ]; then
    sed 's/^/  /' "$STATE_FILE"
    local pgid owner
    pgid="$(state_get pgid)"; owner="$(state_get owner)"
    say "  owner alive: $(kill -0 "$owner" 2>/dev/null && echo yes || echo no)   group alive: $(pgid_alive "$pgid" && echo yes || echo no)"
  else
    say "  none"
  fi
  say ""
  say "== Env"
  say "  apps/api/.env: $([ -f "$API_ENV" ] && echo present || echo MISSING)   database: $(DB_NAME_VALUE) on $(api_value DB_HOST localhost):$(api_value DB_PORT 5432)"
}

cmd_db() { preflight; ensure_db; say "Postgres, Redis and MinIO are up."; }

cmd_db_stop() { use_node; ensure_docker; compose stop $INFRA_SERVICES; }

cmd_migrate() {
  preflight; ensure_db
  (cd "$ROOT" && pnpm --filter @luraba/api db:migrate)
}

cmd_db_reset() {
  preflight; ensure_db
  local db answer
  db="$(DB_NAME_VALUE)"
  say "This DROPS the database '$db' (all local data) and recreates it from the migrations."
  say "Test databases (luraba_db_test*) are not touched."
  if [ -t 0 ]; then
    printf 'Continue? [y/N] '; read -r answer
  else
    answer=n
  fi
  case "$answer" in y|Y|yes) ;; *) say "Aborted."; return 1 ;; esac
  psql_admin "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" || die "Could not drop $db"
  psql_admin "CREATE DATABASE \"$db\"" || die "Could not create $db"
  (cd "$ROOT" && pnpm --filter @luraba/api db:migrate)
  say "Database $db recreated and migrated."
}

# cmd_generate NAME: migrations are hand-written here (drizzle-kit generate is broken), so
# scaffold the next numbered SQL file and the _journal.json entry.
cmd_generate() {
  use_node
  local name="${1:-}"
  [ -n "$name" ] || die "Usage: ./scripts/dev.sh generate <snake_case_name>"
  printf '%s' "$name" | grep -Eq '^[a-z0-9_]+$' || die "Name must be snake_case (a-z, 0-9, _)."
  [ -f "$JOURNAL" ] || die "Missing $JOURNAL"
  local out
  out="$(MIGRATIONS_DIR="$MIGRATIONS_DIR" JOURNAL="$JOURNAL" NAME="$name" node -e '
    const fs = require("fs");
    const path = require("path");
    const journal = JSON.parse(fs.readFileSync(process.env.JOURNAL, "utf8"));
    const last = journal.entries[journal.entries.length - 1];
    const idx = last.idx + 1;
    const tag = String(idx).padStart(4, "0") + "_" + process.env.NAME;
    const file = path.join(process.env.MIGRATIONS_DIR, tag + ".sql");
    if (fs.existsSync(file)) { console.error("Already exists: " + file); process.exit(1); }
    // Keep `when` strictly increasing: drizzle skips entries older than the last applied one.
    const when = Math.max(Date.now(), last.when + 86400000);
    journal.entries.push({ idx, version: last.version, when, tag, breakpoints: true });
    fs.writeFileSync(file, "-- " + tag + "\n-- Hand-written migration. Separate statements with --> statement-breakpoint\n");
    fs.writeFileSync(process.env.JOURNAL, JSON.stringify(journal, null, 2) + "\n");
    console.log(file);
  ')" || exit 1
  say "Created ${out#$ROOT/}"
  say "Updated apps/api/src/db/migrations/meta/_journal.json"
  say ""
  say "Reminder: migrations are hand-written SQL here (drizzle-kit generate is broken)."
  say "  1. Write the SQL (statements separated by '--> statement-breakpoint')."
  say "  2. Update packages/db/src/schemas/* to match."
  say "  3. Apply: ./scripts/dev.sh migrate   then run: pnpm test:integration (in apps/api)."
}

cmd_studio() {
  preflight; ensure_db
  (cd "$ROOT" && pnpm exec turbo run build --filter='@luraba/db^...' >/dev/null) || die "Could not build the shared packages."
  local config
  config="$(cd "$ROOT" && node scripts/studio-config.mjs)" || die "Could not prepare Drizzle Studio."
  claim_port "$STUDIO_PORT" studio
  say ""
  say "Drizzle Studio for $(DB_NAME_VALUE) on $(api_value DB_HOST localhost):$(api_value DB_PORT 5432)"
  say "  Open: https://local.drizzle.studio?port=$STUDIO_PORT   (the UI is hosted, data stays on this machine)"
  say "  Safari and Brave block localhost from that page; use Chrome or Firefox."
  say "  Ctrl+C to stop."
  say ""
  (
    cd "$ROOT/apps/api"
    export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
    DB_HOST="$(api_value DB_HOST localhost)"; DB_PORT="$(api_value DB_PORT 5432)"
    DB_USER="$(DB_USER_VALUE)"; DB_PASSWORD="$(api_value DB_PASSWORD luraba)"; DB_NAME="$(DB_NAME_VALUE)"
    [ -z "${LURABA_NO_OPEN:-}" ] && command -v open >/dev/null 2>&1 && { sleep 3; open "https://local.drizzle.studio?port=$STUDIO_PORT"; } &
    exec pnpm exec drizzle-kit studio --config "$config" --host 127.0.0.1 --port "$STUDIO_PORT"
  )
}

# mail_off_env: dev must never email or push real people (the local database may hold production data).
mail_off_env() {
  export SMTP_PROVIDER="" SMTP_HOST="" SMTP_PORT="" SMTP_SECURE="" SMTP_USERNAME="" SMTP_PASSWORD=""
  export SMTP_FROM_NAME="" SMTP_FROM_EMAIL="" SMTP_REPLY_EMAIL="" SMTP_TLS_CIPHERS=""
  export VAPID_PUBLIC_KEY="" VAPID_PRIVATE_KEY="" VAPID_SUBJECT=""
}

cmd_up() {
  local web=1 worker=1 mcp=1 migrate=1 light=0 email=0 arg
  for arg in "$@"; do
    case "$arg" in
      --no-web) web=0 ;;
      --no-worker) worker=0 ;;
      --no-mcp) mcp=0 ;;
      --no-migrate) migrate=0 ;;
      --light) light=1; worker=0; mcp=0 ;;
      --email) email=1 ;;
      *) die "Unknown flag: $arg (see ./scripts/dev.sh help)" ;;
    esac
  done
  preflight
  stop_previous_run

  local api_port filters="" label=""
  api_port="$(API_PORT_VALUE)"
  CLAIMED_PORTS="$api_port"
  claim_port "$api_port" api
  filters="--filter=@luraba/api"; label="api"
  if [ "$web" = 1 ]; then claim_port "$WEB_PORT" web; CLAIMED_PORTS="$CLAIMED_PORTS $WEB_PORT"; filters="$filters --filter=@luraba/web"; label="$label web"; fi
  if [ "$mcp" = 1 ]; then claim_port "$MCP_PORT" mcp; CLAIMED_PORTS="$CLAIMED_PORTS $MCP_PORT"; filters="$filters --filter=@luraba/mcp"; label="$label mcp"; fi
  [ "$worker" = 1 ] && { filters="$filters --filter=@luraba/worker"; label="$label worker"; }

  ensure_db
  if [ "$migrate" = 1 ]; then
    say "Applying migrations..."
    (cd "$ROOT" && pnpm --filter @luraba/api db:migrate) || die "Migration failed."
  fi

  if [ "$email" = 1 ]; then
    warn "Email and web push are ENABLED (--email). The database may contain real addresses."
  else
    mail_off_env
    say "Email and web push: OFF in this run (SMTP/VAPID blanked). Use --email to keep them."
  fi
  [ "$light" = 1 ] && export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"
  [ -n "${LURABA_API_PORT:-}" ] && export PORT="$LURABA_API_PORT"

  say ""
  say "Starting: $label   (API http://localhost:$api_port$( [ "$web" = 1 ] && printf ', web http://localhost:%s' "$WEB_PORT" ))"
  say "Ctrl+C stops everything this run started."
  say ""
  run_managed pnpm exec turbo run dev --ui=stream --env-mode=loose $filters
}

cmd_single() {
  local which="$1"
  preflight; stop_previous_run
  CLAIMED_PORTS=""
  [ "$which" = mcp ] && { claim_port "$MCP_PORT" mcp; CLAIMED_PORTS="$MCP_PORT"; }
  ensure_db
  mail_off_env
  say "Starting $which (email and web push off)."
  run_managed pnpm exec turbo run dev --ui=stream --env-mode=loose "--filter=@luraba/$which"
}

cmd_clean_web() { rm -rf "$ROOT/apps/web/.next" && say "Removed apps/web/.next"; }

cmd_build() { preflight; (cd "$ROOT" && pnpm build); }

cmd_test() {
  preflight; ensure_db
  (cd "$ROOT/apps/api" && pnpm test:integration "$@")
}

cmd_web_test() { preflight; (cd "$ROOT" && pnpm --filter @luraba/web test:unit "$@"); }
cmd_lint() { use_node; (cd "$ROOT" && pnpm check); }
cmd_lint_fix() { use_node; (cd "$ROOT" && pnpm fix); }
cmd_typecheck() { use_node; (cd "$ROOT" && pnpm typecheck); }

# ---------------------------------------------------------------------------------------------
# Dump / restore / snapshots
# ---------------------------------------------------------------------------------------------

DB_SENSITIVE_WARNING="A restored production dump contains REAL data: password hashes, sessions, API keys,
OAuth/integration tokens and real email addresses. Keep it out of git (*.dump is ignored), do not share
it, and note that dev runs blank SMTP and web push credentials by default so nothing is emailed."

cmd_db_dump() {
  preflight; ensure_db
  local out="${1:-$ROOT/luraba_$(date +%Y%m%d_%H%M%S).dump}"
  [ -e "$out" ] && die "$out already exists."
  compose exec -T db pg_dump -U "$(DB_USER_VALUE)" -Fc "$(DB_NAME_VALUE)" >"$out" || { rm -f "$out"; die "pg_dump failed."; }
  say "Wrote $out ($(wc -c <"$out" | tr -d ' ') bytes)"
  say "$DB_SENSITIVE_WARNING"
}

# count_tables DB: "table=count" lines for the headline tables.
count_tables() {
  local db="$1" t
  for t in users households accounts transactions credit_cards bills goals; do
    printf '%s=%s\n' "$t" "$(psql_db "$db" "select count(*) from \"$t\"" 2>/dev/null || echo n/a)"
  done
}

# swap_database NEW NAME: NAME becomes NEW, the old NAME is kept under a backup name (printed).
swap_database() {
  local new="$1" name="$2" backup="luraba_db_pre_restore" exists
  exists="$(psql_admin "select 1 from pg_database where datname='$backup'")"
  [ -n "$exists" ] && backup="${backup}_$(date +%Y%m%d_%H%M%S)"
  psql_admin "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('$name','$new') and pid <> pg_backend_pid()" >/dev/null
  sleep 1
  if [ -n "$(psql_admin "select 1 from pg_database where datname='$name'")" ]; then
    psql_admin "ALTER DATABASE \"$name\" RENAME TO \"$backup\"" || return 1
    say "Previous $name kept as $backup"
  fi
  psql_admin "ALTER DATABASE \"$new\" RENAME TO \"$name\"" || return 1
}

cmd_db_restore() {
  local file="" yes=0 arg
  for arg in "$@"; do
    case "$arg" in --yes|-y) yes=1 ;; *) file="$arg" ;; esac
  done
  [ -n "$file" ] || die "Usage: ./scripts/dev.sh db:restore <file.dump> [--yes]"
  [ -f "$file" ] || die "No such file: $file"
  preflight; ensure_db
  local name staging toc answer conns
  name="$(DB_NAME_VALUE)"; staging="${name}_restoring"

  say "== Checking the dump"
  toc="$(compose exec -T db pg_restore -l <"$file" 2>&1)" || die "Not a valid pg_dump -Fc file: $(printf '%s' "$toc" | head -n 3)"
  printf '%s\n' "$toc" | sed -n '1,14p' | sed 's/^/  /'
  say "  entries: $(printf '%s\n' "$toc" | grep -c '^[0-9]')"

  if [ -f "$STATE_FILE" ] && pgid_alive "$(state_get pgid)"; then
    die "A dev run is active. Stop it first: ./scripts/dev.sh stop"
  fi
  conns="$(psql_admin "select count(*) from pg_stat_activity where datname='$name'")"
  say ""
  say "This replaces $name with the dump. The current $name is kept (renamed luraba_db_pre_restore)."
  say "$conns connection(s) to $name will be terminated (a running dev API/worker/web must be restarted)."
  say "Test databases (luraba_db_test*) are never touched."
  if [ "$yes" != 1 ]; then
    [ -t 0 ] || die "Needs confirmation: pass --yes when not on a terminal."
    printf 'Continue? [y/N] '; read -r answer
    case "$answer" in y|Y|yes) ;; *) say "Aborted."; return 1 ;; esac
  fi

  say ""
  say "== Restoring into $staging"
  psql_admin "DROP DATABASE IF EXISTS \"$staging\" WITH (FORCE)" || die "Could not drop $staging"
  psql_admin "CREATE DATABASE \"$staging\"" || die "Could not create $staging"
  if ! compose exec -T db pg_restore -U "$(DB_USER_VALUE)" -d "$staging" --no-owner --no-privileges --exit-on-error <"$file"; then
    psql_admin "DROP DATABASE IF EXISTS \"$staging\" WITH (FORCE)"
    die "pg_restore failed. $name is untouched."
  fi
  local before after
  before="$(count_tables "$staging")"

  say "== Swapping databases"
  swap_database "$staging" "$name" || die "Could not swap databases (look at: ./scripts/dev.sh doctor)."

  say "== Applying migrations newer than the dump"
  (cd "$ROOT" && pnpm --filter @luraba/api db:migrate) || die "Migrations failed on the restored database."
  after="$(count_tables "$name")"

  say ""
  say "== Row counts"
  say "$after" | sed 's/^/  /'
  if [ "$before" = "$after" ]; then say "  (identical to the dump before migrations)"; else warn "counts changed during migration"; fi
  say ""
  say "== READ THIS"
  say "$DB_SENSITIVE_WARNING" | sed 's/^/  /'
  say "  Dev servers blank SMTP and web-push credentials by default: ./scripts/dev.sh up never emails."
  say "  Pass --email to up only if you truly want delivery. Uploaded files are not in the dump, so"
  say "  attachments will 404 until the matching objects exist in local MinIO."
  say "  Restart any running dev API/worker/web: their connections were cut."
}

cmd_db_snapshot() {
  preflight; ensure_db
  local name snap
  name="$(DB_NAME_VALUE)"; snap="${name}_snap_${1:-$(date +%Y%m%d_%H%M%S)}"
  psql_admin "select pg_terminate_backend(pid) from pg_stat_activity where datname='$name' and pid <> pg_backend_pid()" >/dev/null
  psql_admin "CREATE DATABASE \"$snap\" TEMPLATE \"$name\"" || die "Could not create the snapshot."
  say "Snapshot $snap created (connections to $name were cut: restart dev servers)."
}

cmd_db_snapshot_restore() {
  preflight; ensure_db
  local name snap="${1:-}"
  name="$(DB_NAME_VALUE)"
  if [ -z "$snap" ]; then
    say "Snapshots:"; psql_admin "select datname from pg_database where datname like '${name}_snap_%' order by 1" | sed 's/^/  /'
    die "Usage: ./scripts/dev.sh db:snapshot-restore <snapshot name>"
  fi
  case "$snap" in "${name}_snap_"*) ;; *) snap="${name}_snap_$snap" ;; esac
  [ -n "$(psql_admin "select 1 from pg_database where datname='$snap'")" ] || die "No snapshot $snap"
  psql_admin "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('$name','$snap') and pid <> pg_backend_pid()" >/dev/null
  psql_admin "DROP DATABASE IF EXISTS \"$name\" WITH (FORCE)" && psql_admin "CREATE DATABASE \"$name\" TEMPLATE \"$snap\"" || die "Restore failed."
  say "$name restored from $snap."
}

# ---------------------------------------------------------------------------------------------
# Dispatcher (only when executed, not when sourced)
# ---------------------------------------------------------------------------------------------

main() {
  local cmd="${1:-up}"
  [ $# -gt 0 ] && shift
  cd "$ROOT" || exit 1
  case "$cmd" in
    up) cmd_up "$@" ;;
    stop) cmd_stop "$@" ;;
    doctor) cmd_doctor ;;
    db) cmd_db ;;
    db-stop) cmd_db_stop ;;
    db-reset) cmd_db_reset ;;
    migrate) cmd_migrate ;;
    generate) cmd_generate "$@" ;;
    studio) cmd_studio ;;
    db:dump|db-dump) cmd_db_dump "$@" ;;
    db:restore|db-restore) cmd_db_restore "$@" ;;
    db:snapshot|db-snapshot) cmd_db_snapshot "$@" ;;
    db:snapshot-restore|db-snapshot-restore) cmd_db_snapshot_restore "$@" ;;
    worker) cmd_single worker ;;
    mcp) cmd_single mcp ;;
    clean-web) cmd_clean_web ;;
    build) cmd_build ;;
    test) cmd_test "$@" ;;
    web-test) cmd_web_test "$@" ;;
    lint) cmd_lint ;;
    lint-fix) cmd_lint_fix ;;
    typecheck) cmd_typecheck ;;
    help|-h|--help) usage ;;
    *) usage >&2; exit 2 ;;
  esac
}

if [ "${BASH_SOURCE[0]:-$0}" = "$0" ]; then
  main "$@"
fi
