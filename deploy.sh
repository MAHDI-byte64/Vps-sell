#!/usr/bin/env bash
#
# ابرسرور — استقرار خودکار روی سرور واقعی، با دامنه و SSL
#
#   curl -fsSL https://raw.githubusercontent.com/MAHDI-byte64/Vps-sell/claude/compassionate-lovelace-4rr7wk/deploy.sh | sudo bash
#
# Run this ON the production server (as root, over SSH) once you already
# own a domain and have pointed its DNS A record at this server's IP.
#
# It installs everything the site needs — Docker, a firewall, swap if the
# box is short on RAM — clones the project, generates real secrets, and
# brings the whole stack up behind Caddy, which gets the HTTPS certificate
# itself. It cannot register a domain for you: that needs a registrar
# account and a payment method, which this script deliberately never asks
# for. Point your domain's DNS here first, then run this.
#
# Safe to re-run: an existing .env is never rewritten, and every step below
# is idempotent.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/MAHDI-byte64/Vps-sell.git}"
BRANCH="${BRANCH:-claude/compassionate-lovelace-4rr7wk}"
TARGET_DIR="${TARGET_DIR:-/opt/vpssell}"
MIN_RAM_MB=1900          # below this, add a swapfile before building
SWAP_SIZE_MB=2048
DOMAIN=""
SSL_EMAIL=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ASSUME_YES=0

# ----------------------------- output helpers --------------------------------

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
  YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; CYAN=""; RESET=""
fi

STEP=0
TOTAL_STEPS=7
step()  { STEP=$((STEP + 1)); printf '\n%s[%d/%d]%s %s%s%s\n' "$CYAN" "$STEP" "$TOTAL_STEPS" "$RESET" "$BOLD" "$1" "$RESET"; }
info()  { printf '      %s\n' "$1"; }
muted() { printf '      %s%s%s\n' "$DIM" "$1" "$RESET"; }
ok()    { printf '      %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()  { printf '      %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()   { printf '\n%serror:%s %s\n\n' "$RED" "$RESET" "$1" >&2; exit 1; }

usage() {
  cat <<'USAGE'
ابرسرور — production deploy with domain + automatic HTTPS

Usage:
  deploy.sh --domain <domain> --email <email> [options]

Required (or answered interactively when run over a real terminal):
  --domain <domain>       The domain whose DNS A record already points here
  --email  <email>        Used for the Let's Encrypt account and as the
                           admin login, unless --admin-email overrides it

Options:
  --admin-email <email>   Admin login email, if different from --email
  --admin-password <pw>   Admin login password (default: generated)
  --dir <path>            Install directory              (default: /opt/vpssell)
  --branch <name>         Branch to deploy
  --repo <url>            Git repository to clone
  -y, --yes               Never prompt; fail instead of asking
  -h, --help              Show this help

What this script will NOT do: buy or register the domain itself. That
needs a registrar account and a payment method. Point the domain's DNS
A record at this server's IP before running this.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)         DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --email)          SSL_EMAIL="${2:?--email needs a value}"; shift 2 ;;
    --admin-email)    ADMIN_EMAIL="${2:?--admin-email needs a value}"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="${2:?--admin-password needs a value}"; shift 2 ;;
    --dir)            TARGET_DIR="${2:?--dir needs a path}"; shift 2 ;;
    --branch)         BRANCH="${2:?--branch needs a name}"; shift 2 ;;
    --repo)           REPO_URL="${2:?--repo needs a URL}"; shift 2 ;;
    -y|--yes)         ASSUME_YES=1; shift ;;
    -h|--help)        usage; exit 0 ;;
    *)                die "unknown option: $1  (try --help)" ;;
  esac
done

printf '\n%s  ابرسرور — production deploy%s\n' "$BOLD" "$RESET"

# ------------------------------ 0. preflight ---------------------------------

[ "$(id -u)" -eq 0 ] || die "Run this as root (or with sudo):  sudo bash deploy.sh"

[ -f /etc/os-release ] || die "Can't identify the OS (no /etc/os-release). This script targets Ubuntu/Debian."
# shellcheck disable=SC1091
. /etc/os-release
case "${ID:-}:${ID_LIKE:-}" in
  ubuntu*|debian*|*:*debian*) : ;;
  *) die "This script targets Ubuntu/Debian (found: ${PRETTY_NAME:-unknown}). Everything past here assumes apt." ;;
esac

# A prompt that works even when the script arrived through `curl | bash`,
# where stdin is the piped script, not the keyboard — read from the
# controlling terminal directly instead.
prompt() {
  local message="$1" reply=""
  if [ "$ASSUME_YES" = "1" ] || [ ! -e /dev/tty ]; then
    return 1
  fi
  read -r -p "      $message" reply < /dev/tty || return 1
  printf '%s' "$reply"
}

valid_domain() { [[ "$1" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; }
valid_email()  { [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; }

if [ -z "$DOMAIN" ]; then
  DOMAIN="$(prompt "دامنه‌ای که خریده‌اید و DNS آن را به این سرور تنظیم کرده‌اید (مثلاً abrserver.ir): ")" \
    || die "No domain given. Pass one:  deploy.sh --domain yourdomain.com --email you@example.com"
fi
valid_domain "$DOMAIN" || die "'$DOMAIN' doesn't look like a valid domain."

if [ -z "$SSL_EMAIL" ]; then
  SSL_EMAIL="$(prompt "ایمیل شما (برای گواهی SSL و ورود به پنل مدیریت): ")" \
    || die "No email given. Pass one:  deploy.sh --domain yourdomain.com --email you@example.com"
fi
valid_email "$SSL_EMAIL" || die "'$SSL_EMAIL' doesn't look like a valid email address."

[ -n "$ADMIN_EMAIL" ] || ADMIN_EMAIL="$SSL_EMAIL"
valid_email "$ADMIN_EMAIL" || die "'$ADMIN_EMAIL' doesn't look like a valid email address."

ok "Domain: $DOMAIN"
ok "Email:  $SSL_EMAIL"

# -------------------------------- 1. DNS -------------------------------------

step "بررسی DNS دامنه / Checking DNS"

get_public_ip() {
  curl -fsS4 --max-time 5 https://icanhazip.com 2>/dev/null \
    || curl -fsS4 --max-time 5 https://ifconfig.me 2>/dev/null \
    || curl -fsS4 --max-time 5 https://api.ipify.org 2>/dev/null \
    || true
}

resolve_domain() {
  # getent uses whatever /etc/nsswitch.conf resolves with, and needs
  # nothing extra installed — unlike dig/host, which usually aren't.
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1; exit}'
}

SERVER_IP="$(get_public_ip)"
DOMAIN_IP="$(resolve_domain "$DOMAIN" || true)"

if [ -z "$SERVER_IP" ]; then
  warn "Could not determine this server's public IP — skipping the DNS check."
elif [ -z "$DOMAIN_IP" ]; then
  warn "'$DOMAIN' does not resolve yet."
  info "In your domain's DNS settings, add an A record: @ -> $SERVER_IP"
  info "This can take a few minutes to a few hours to spread (پخش DNS)."
  [ "$(prompt "با این حال ادامه بدهم؟ (y/N) ")" = "y" ] || die "Point the domain's DNS at $SERVER_IP, then run this again."
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
  warn "'$DOMAIN' points at $DOMAIN_IP, not this server ($SERVER_IP)."
  info "Update the A record, or continue if you just changed it and it hasn't spread yet."
  [ "$(prompt "ادامه بدهم؟ (y/N) ")" = "y" ] || die "Fix the DNS A record, then run this again."
else
  ok "$DOMAIN -> $SERVER_IP"
fi

# --------------------------- 2. system prerequisites -------------------------

step "نصب پیش‌نیازها / Installing prerequisites"

export DEBIAN_FRONTEND=noninteractive
muted "apt update (این مرحله کمی طول می‌کشد)"
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  ca-certificates curl gnupg git ufw >/dev/null
ok "git, curl, ufw ready"

# A 1 GB VPS reliably OOMs partway through `next build`; give it room to
# breathe rather than fail confusingly an hour in.
TOTAL_RAM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$TOTAL_RAM_MB" -lt "$MIN_RAM_MB" ] && [ ! -f /swapfile ]; then
  info "Only ${TOTAL_RAM_MB}MB RAM — adding a ${SWAP_SIZE_MB}MB swapfile so the build doesn't run out of memory."
  fallocate -l "${SWAP_SIZE_MB}M" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap enabled"
elif [ -f /swapfile ]; then
  ok "Swap already set up"
else
  ok "${TOTAL_RAM_MB}MB RAM is plenty"
fi

# --------------------------------- 3. Docker ---------------------------------

step "نصب Docker / Installing Docker"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  ok "Docker $(docker --version | grep -o '[0-9][0-9.]*' | head -1) already installed"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  ARCH="$(dpkg --print-architecture)"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker >/dev/null 2>&1 || true
  ok "Docker installed"
fi

# ------------------------------- 4. firewall ---------------------------------

step "تنظیم فایروال / Configuring the firewall"

# Allow whatever port this very SSH session is using, plus the standard one,
# before touching ufw's enabled state — never lock out the session running
# this script.
SSH_PORT="$(ss -tlnp 2>/dev/null | awk '/sshd/{split($4,a,":"); print a[length(a)]}' | sort -u | head -1)"
[ -n "$SSH_PORT" ] || SSH_PORT=22

ufw allow "$SSH_PORT"/tcp >/dev/null
[ "$SSH_PORT" = "22" ] || ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null

if ufw status | grep -q "^Status: active"; then
  ok "Firewall already active — SSH ($SSH_PORT), 80, 443 allowed"
else
  ufw --force enable >/dev/null
  ok "Firewall enabled — SSH ($SSH_PORT), 80, 443 allowed"
fi

# A stock Ubuntu image sometimes ships nginx or Apache pre-installed; either
# would hold port 80/443 and make Caddy fail to bind.
for svc in nginx apache2; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    systemctl stop "$svc"
    systemctl disable "$svc" >/dev/null 2>&1 || true
    warn "Stopped $svc — it was holding port 80/443."
  fi
done

# ------------------------------ 5. get the code ------------------------------

step "دریافت کد سایت / Fetching the project"

if [ -d "$TARGET_DIR/.git" ]; then
  info "Updating the existing checkout in $TARGET_DIR"
  git -C "$TARGET_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$TARGET_DIR" checkout -B "$BRANCH" FETCH_HEAD >/dev/null 2>&1
else
  [ -e "$TARGET_DIR" ] && die "'$TARGET_DIR' exists and is not a git checkout. Pass --dir to use another path."
  info "Cloning into $TARGET_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR" >/dev/null 2>&1
fi
ok "Ready in $TARGET_DIR"
cd "$TARGET_DIR"

# ------------------------------ 6. environment -------------------------------

step "ساخت فایل تنظیمات / Preparing environment"

gen_secret() { openssl rand -base64 48 | tr -d '\n'; }
# Alphanumeric only — safe to embed unescaped inside a postgresql:// URI.
# A base64 secret's /, + and = would otherwise corrupt the connection string.
gen_db_password()    { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32; }
gen_admin_password() { openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16; }

if [ -f .env ]; then
  # Regenerating CREDENTIAL_SECRET would make every already-stored server
  # password unreadable, so an existing .env is always left exactly as is —
  # re-running this script to pick up a code update must never touch it.
  ok ".env already exists — left untouched"
  ADMIN_PASSWORD="$(grep -E '^SEED_ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
  ADMIN_EMAIL="$(grep -E '^SEED_ADMIN_EMAIL=' .env | head -1 | cut -d= -f2- | tr -d '"' || echo "$ADMIN_EMAIL")"
else
  [ -n "$ADMIN_PASSWORD" ] || ADMIN_PASSWORD="$(gen_admin_password)"
  DB_PASSWORD="$(gen_db_password)"
  cat > .env <<ENVEOF
# Generated by deploy.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
POSTGRES_USER=vpssell
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=vpssell
DATABASE_URL="postgresql://vpssell:${DB_PASSWORD}@db:5432/vpssell?schema=public"

AUTH_SECRET="$(gen_secret)"
CREDENTIAL_SECRET="$(gen_secret)"

DOMAIN=${DOMAIN}
SSL_EMAIL="${SSL_EMAIL}"
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}

SEED_ADMIN_EMAIL="${ADMIN_EMAIL}"
SEED_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ENVEOF
  chmod 600 .env
  ok ".env created with freshly generated secrets"
fi

# ------------------------------- 7. launch -----------------------------------

step "اجرا / Building and starting"

muted "این مرحله چند دقیقه طول می‌کشد (بیلد سایت)"
docker compose --profile full up -d --build

info "Waiting for the database and app to come up"
for _ in $(seq 1 60); do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/fa >/dev/null 2>&1; then
    ok "App is serving on the server itself"
    break
  fi
  sleep 2
done

info "Waiting for Caddy to obtain the HTTPS certificate (up to ~2 min)"
CERT_OK=0
for _ in $(seq 1 60); do
  if curl -fsS --max-time 3 "https://${DOMAIN}/fa" >/dev/null 2>&1; then
    CERT_OK=1
    break
  fi
  sleep 2
done

# --------------------------------- summary -----------------------------------

if [ "$CERT_OK" = "1" ]; then
  ok "https://${DOMAIN} is live with a valid certificate"
else
  warn "https://${DOMAIN} isn't answering yet."
  info "This is usually DNS still spreading. Caddy keeps retrying on its own —"
  info "check again in a few minutes with:  curl -I https://${DOMAIN}"
  info "or watch it directly with:  docker compose -f ${TARGET_DIR}/docker-compose.yml logs -f caddy"
fi

cat <<SUMMARY

  ${GREEN}${BOLD}آماده است / Ready${RESET}

  ${BOLD}سایت${RESET}       https://${DOMAIN}
  ${BOLD}پنل مدیریت${RESET}  https://${DOMAIN}/fa/admin

  ${BOLD}مدیر${RESET}       ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}

  ${YELLOW}این رمز را همین حالا جایی امن ذخیره کنید و پس از اولین ورود عوضش کنید.${RESET}
  ${DIM}Save this password now and change it after your first login.${RESET}

  ${DIM}فایل $TARGET_DIR/.env حاوی کلیدهای رمزنگاری است — از آن بکاپ بگیرید؛
  بدون آن رمزهای ذخیره‌شده سرورهای مشتریان قابل بازیابی نخواهند بود.

  دوباره اجرا کردن این اسکریپت امن است: کد را به‌روزرسانی می‌کند و
  .env دست‌نخورده می‌ماند.

  docker compose -f $TARGET_DIR/docker-compose.yml logs -f     مشاهده لاگ‌ها
  docker compose -f $TARGET_DIR/docker-compose.yml restart app  ری‌استارت سایت${RESET}

SUMMARY
