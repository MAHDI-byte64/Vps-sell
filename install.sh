#!/usr/bin/env bash
#
# ابرسرور — نصب یک‌خطی
#
#   curl -fsSL https://raw.githubusercontent.com/MAHDI-byte64/Vps-sell/claude/compassionate-lovelace-4rr7wk/install.sh | bash
#
# Bootstraps the whole stack: clones the repo (when piped from curl), installs
# dependencies, generates real secrets, brings up PostgreSQL, applies the
# schema, seeds the catalogue, and starts the site.
#
# Safe to re-run: an existing .env is never overwritten, and the seed upserts.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MAHDI-byte64/Vps-sell.git}"
BRANCH="${BRANCH:-claude/compassionate-lovelace-4rr7wk}"
TARGET_DIR="${TARGET_DIR:-vps-sell}"
MODE="dev"              # dev | prod | none
DB_MODE="auto"          # auto | docker | external
DB_URL="${DATABASE_URL:-}"
DOCKER_DB_URL="postgresql://vpssell:vpssell_dev_password@localhost:5432/vpssell?schema=public"
MIN_NODE_MAJOR=20

# ----------------------------- output helpers --------------------------------

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

STEP=0
step()  { STEP=$((STEP + 1)); printf '\n%s[%d/7]%s %s%s%s\n' "$CYAN" "$STEP" "$RESET" "$BOLD" "$1" "$RESET"; }
info()  { printf '      %s\n' "$1"; }
muted() { printf '      %s%s%s\n' "$DIM" "$1" "$RESET"; }
ok()    { printf '      %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()  { printf '      %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()   { printf '\n%serror:%s %s\n\n' "$RED" "$RESET" "$1" >&2; exit 1; }

usage() {
  cat <<'USAGE'
ابرسرور installer

Usage:
  install.sh [options]

Options:
  --dir <path>      Directory to clone into            (default: vps-sell)
  --branch <name>   Branch to clone
  --db-url <url>    Use an existing PostgreSQL instead of the Docker one
  --docker-db       Force the bundled Docker PostgreSQL
  --prod            Build and run the production server instead of dev
  --no-start        Set everything up but do not start the server
  -h, --help        Show this help

Environment:
  REPO_URL, BRANCH, TARGET_DIR, DATABASE_URL are read as defaults.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)       TARGET_DIR="${2:?--dir needs a path}"; shift 2 ;;
    --branch)    BRANCH="${2:?--branch needs a name}"; shift 2 ;;
    --db-url)    DB_URL="${2:?--db-url needs a URL}"; DB_MODE="external"; shift 2 ;;
    --docker-db) DB_MODE="docker"; shift ;;
    --prod)      MODE="prod"; shift ;;
    --no-start)  MODE="none"; shift ;;
    -h|--help)   usage; exit 0 ;;
    *)           die "unknown option: $1  (try --help)" ;;
  esac
done

printf '\n%s  ابرسرور — VPS storefront installer%s\n' "$BOLD" "$RESET"

# ------------------------------ 1. preflight ---------------------------------

step "بررسی پیش‌نیازها / Checking prerequisites"

command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node ${MIN_NODE_MAJOR}+ from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || die "npm is not installed (it ships with Node.js)."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ] \
  || die "Node ${MIN_NODE_MAJOR}+ is required, found $(node -v)."
ok "Node $(node -v), npm $(npm -v)"

# ------------------------- 2. locate or clone the repo -----------------------

step "دریافت کد / Fetching the project"

# When the script is run from inside a checkout, work in place. Piped through
# curl there is no checkout, so clone one.
if [ -f "package.json" ] && node -p 'require("./package.json").name' 2>/dev/null | grep -qx 'vps-sell'; then
  PROJECT_DIR="$PWD"
  ok "Using the checkout in $PROJECT_DIR"
else
  command -v git >/dev/null 2>&1 || die "git is not installed."
  if [ -d "$TARGET_DIR/.git" ]; then
    info "Updating the existing clone in $TARGET_DIR"
    git -C "$TARGET_DIR" fetch --depth 1 origin "$BRANCH" \
      || die "Could not fetch branch '$BRANCH'."
    # Reset only tracked files; .env and node_modules are untracked and survive.
    git -C "$TARGET_DIR" checkout -B "$BRANCH" FETCH_HEAD >/dev/null 2>&1 \
      || die "Could not check out '$BRANCH'."
  else
    [ -e "$TARGET_DIR" ] && die "'$TARGET_DIR' exists and is not a git clone. Use --dir to pick another path."
    info "Cloning $REPO_URL ($BRANCH)"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR" >/dev/null 2>&1 \
      || die "Clone failed. Check the URL, the branch name, and your network."
  fi
  PROJECT_DIR="$(cd "$TARGET_DIR" && pwd)"
  ok "Ready in $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# ---------------------------- 3. dependencies --------------------------------

step "نصب وابستگی‌ها / Installing dependencies"
muted "این مرحله ممکن است یک دقیقه طول بکشد"

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null
else
  npm install --no-audit --no-fund >/dev/null
fi
ok "$(node -p 'Object.keys({...require("./package.json").dependencies,...require("./package.json").devDependencies}).length') packages installed"

# ------------------------------ 4. secrets -----------------------------------

step "ساخت فایل تنظیمات / Preparing environment"

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
  else
    node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("base64"))'
  fi
}

if [ -f .env ]; then
  # Regenerating CREDENTIAL_SECRET would make every stored server password
  # unreadable, so an existing .env is always left exactly as it is.
  ok ".env already exists — left untouched"
  if grep -q 'change-me' .env 2>/dev/null; then
    warn "Your .env still contains placeholder secrets. Replace AUTH_SECRET and"
    warn "CREDENTIAL_SECRET before putting this online: openssl rand -base64 48"
  fi
  # A re-run must keep using whatever database the existing .env points at.
  if [ -z "$DB_URL" ]; then
    DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
  fi
else
  [ -f .env.example ] || die ".env.example is missing from the checkout."
  AUTH_SECRET="$(gen_secret)"
  CREDENTIAL_SECRET="$(gen_secret)"
  [ -n "$DB_URL" ] || DB_URL="$DOCKER_DB_URL"

  # Written with a heredoc rather than sed over the example so a generated
  # secret containing / or & can never break the substitution.
  cat > .env <<ENVEOF
# Generated by install.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
DATABASE_URL="${DB_URL}"

AUTH_SECRET="${AUTH_SECRET}"
CREDENTIAL_SECRET="${CREDENTIAL_SECRET}"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"

SEED_ADMIN_EMAIL="admin@vpssell.local"
SEED_ADMIN_PASSWORD="Admin@12345"
ENVEOF
  chmod 600 .env
  ok ".env created with freshly generated secrets"
fi

# ------------------------------ 5. database ----------------------------------

step "راه‌اندازی دیتابیس / Starting PostgreSQL"

[ -n "$DB_URL" ] || DB_URL="$DOCKER_DB_URL"

redact() { printf '%s' "$1" | sed -E 's#(//[^:]+:)[^@]+@#\1****@#'; }

# Ask the database itself rather than guessing from the URL. `pg` is already a
# dependency, so this needs nothing extra installed.
db_reachable() {
  DB_PROBE_URL="$1" node --input-type=module -e '
    import pg from "pg";
    const client = new pg.Client({
      connectionString: process.env.DB_PROBE_URL,
      connectionTimeoutMillis: 3000,
    });
    try {
      await client.connect();
      await client.end();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  ' >/dev/null 2>&1
}

# True only for the database docker-compose.yml itself provides.
is_bundled_db() {
  printf '%s' "$1" | grep -qE '://vpssell:[^@]+@(localhost|127\.0\.0\.1):5432/vpssell(\?|$)'
}

start_docker_db() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1 || return 1

  info "Starting the bundled PostgreSQL container"
  docker compose up -d db >/dev/null 2>&1 || return 1

  info "Waiting for it to accept connections"
  for _ in $(seq 1 60); do
    db_reachable "$DB_URL" && return 0
    sleep 1
  done
  return 1
}

if [ "$DB_MODE" != "docker" ] && db_reachable "$DB_URL"; then
  ok "Connected to PostgreSQL"
  muted "$(redact "$DB_URL")"
elif [ "$DB_MODE" = "docker" ] || is_bundled_db "$DB_URL"; then
  if start_docker_db; then
    ok "PostgreSQL is up on localhost:5432"
  else
    warn "Could not start the bundled PostgreSQL with Docker."
    info "Start Docker Desktop (or the docker daemon) and run this again, or"
    info "point the installer at a database you already have:"
    info "  ./install.sh --db-url postgresql://user:pass@host:5432/dbname"
    die "No database available."
  fi
else
  warn "Could not reach the database in your configuration:"
  muted "$(redact "$DB_URL")"
  info "Check that it is running and that the credentials are right, then re-run."
  die "No database available."
fi

# --------------------------- 6. schema and seed ------------------------------

step "ساخت جدول‌ها و داده‌های اولیه / Applying schema and seeding"

npm run setup >/dev/null 2>&1 || {
  warn "Setup failed. Re-running with full output so you can see why:"
  npm run setup
  die "Database setup failed."
}
ok "Schema applied, catalogue and accounts seeded"

# ------------------------------ 7. launch ------------------------------------

step "اجرا / Launching"

ADMIN_EMAIL="$(grep -E '^SEED_ADMIN_EMAIL=' .env | head -1 | cut -d= -f2- | tr -d '"' || echo 'admin@vpssell.local')"
ADMIN_PASSWORD="$(grep -E '^SEED_ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2- | tr -d '"' || echo 'Admin@12345')"

summary() {
  cat <<SUMMARY

  ${GREEN}${BOLD}آماده است / Ready${RESET}

  ${BOLD}سایت${RESET}          http://localhost:3000
  ${BOLD}پنل مدیریت${RESET}     http://localhost:3000/fa/admin

  ${BOLD}مدیر${RESET}          ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}
  ${BOLD}مشتری نمونه${RESET}    demo@vpssell.local  /  Demo@12345

  ${YELLOW}پیش از انتشار عمومی رمز مدیر را عوض کنید.${RESET}
  ${DIM}Change the admin password before putting this online.${RESET}

  ${DIM}npm run dev        سرور توسعه
  npm run build      بیلد production
  npm run db:studio  مرورگر دیتابیس${RESET}

SUMMARY
}

case "$MODE" in
  none)
    summary
    info "Start it when you are ready:  cd $(basename "$PROJECT_DIR") && npm run dev"
    ;;
  prod)
    info "Building the production bundle"
    npm run build >/dev/null || die "Build failed."
    ok "Build complete"
    summary
    exec npm start
    ;;
  dev)
    summary
    exec npm run dev
    ;;
esac
