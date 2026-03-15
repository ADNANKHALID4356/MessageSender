#!/usr/bin/env bash
# =============================================================
# vps-deploy.sh — First-time & update deployment of MessageSender
#
# Usage:
#   bash scripts/vps-deploy.sh <repo_url> [app_dir] [branch]
#
# Example:
#   bash scripts/vps-deploy.sh \
#     https://github.com/ADNANKHALID4356/MessageSender.git \
#     /opt/messagesender \
#     main
#
# What this script does:
#   1. Clones the repo (or pulls latest if already cloned)
#   2. Creates .env.prod from template if missing, then pauses
#   3. Generates secrets interactively if .env.prod has placeholders
#   4. Backs up the database (if running)
#   5. Builds Docker images
#   6. Starts all services
#   7. Waits for health checks with retries
#   8. Prints a deployment summary
# =============================================================

set -euo pipefail

# ── Arguments ──────────────────────────────────────────────────
REPO_URL="${1:-}"
APP_DIR="${2:-/opt/messagesender}"
BRANCH="${3:-main}"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

TOTAL_STEPS=8

log()  { echo -e "\n${BOLD}${BLUE}[DEPLOY]${NC} ${*}"; }
ok()   { echo -e "        ${GREEN}✅ ${*}${NC}"; }
warn() { echo -e "        ${YELLOW}⚠️  ${*}${NC}"; }
fail() { echo -e "        ${RED}❌ ${*}${NC}"; exit 1; }

# ── Usage guard ────────────────────────────────────────────────
if [[ -z "${REPO_URL}" ]]; then
  echo "Usage: bash scripts/vps-deploy.sh <repo_url> [app_dir] [branch]"
  echo ""
  echo "Example:"
  echo "  bash scripts/vps-deploy.sh https://github.com/ADNANKHALID4356/MessageSender.git"
  exit 1
fi

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}   MessageSender — VPS Deploy                          ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "  Repo   : ${REPO_URL}"
echo -e "  Dir    : ${APP_DIR}"
echo -e "  Branch : ${BRANCH}"
echo -e "  Time   : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Step 1: Prerequisites check ─────────────────────────────────
log "[1/${TOTAL_STEPS}] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || fail "Docker not installed. Run: sudo bash scripts/vps-setup-ubuntu.sh"
command -v git    >/dev/null 2>&1 || fail "git not installed"
ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
ok "git $(git --version | awk '{print $3}')"

# ── Step 2: Clone or pull repository ───────────────────────────
log "[2/${TOTAL_STEPS}] Preparing repository..."
mkdir -p "${APP_DIR}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Cloning repository..."
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  ok "Repository cloned"
else
  log "Updating existing repository..."
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
  ok "Repository updated"
fi

COMMIT=$(git -C "${APP_DIR}" rev-parse --short HEAD)
ok "HEAD: ${COMMIT}"

# ── Step 3: Environment file ────────────────────────────────────
log "[3/${TOTAL_STEPS}] Checking environment file..."

if [[ ! -f "${APP_DIR}/.env.prod" ]]; then
  warn ".env.prod not found — creating from template..."
  cp "${APP_DIR}/.env.prod.example" "${APP_DIR}/.env.prod"
  chmod 600 "${APP_DIR}/.env.prod"

  echo ""
  echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"
  echo -e "${YELLOW}  ACTION REQUIRED: Fill in .env.prod before continuing   ${NC}"
  echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"
  echo ""
  echo "  Quickest way: let the generator fill in all secrets:"
  echo ""
  echo -e "    ${BLUE}bash ${APP_DIR}/scripts/generate-secrets.sh --write --force${NC}"
  echo ""
  echo "  Then edit the remaining fields (URLs, Facebook, SMTP):"
  echo ""
  echo -e "    ${BLUE}vim ${APP_DIR}/.env.prod${NC}"
  echo ""
  echo "  When done, re-run this script."
  echo ""
  exit 1
fi

# Detect placeholder values still in .env.prod
if grep -qE 'CHANGE_ME|your_.*_id|your_.*_secret|your_.*_token|your_smtp_' "${APP_DIR}/.env.prod"; then
  echo ""
  echo -e "${RED}────────────────────────────────────────────────────────${NC}"
  echo -e "${RED}  ERROR: .env.prod still contains placeholder values     ${NC}"
  echo -e "${RED}────────────────────────────────────────────────────────${NC}"
  echo ""
  echo "  Placeholder values found:"
  grep -n -E 'CHANGE_ME|your_.*_id|your_.*_secret|your_.*_token|your_smtp_' \
    "${APP_DIR}/.env.prod" | head -10 || true
  echo ""
  echo "  Run the secret generator:"
  echo -e "    ${BLUE}bash ${APP_DIR}/scripts/generate-secrets.sh --write --force${NC}"
  echo ""
  echo "  Then update domain-specific values:"
  echo "    FRONTEND_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL"
  echo "    FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, SMTP_HOST, ..."
  echo ""
  exit 1
fi

ok ".env.prod is ready"

# ── Step 4: Backup database (if running) ───────────────────────
log "[4/${TOTAL_STEPS}] Backing up database..."
if docker ps --filter "name=messagesender_postgres" --filter "status=running" -q | grep -q .; then
  BACKUP_DIR="${APP_DIR}/backups"
  mkdir -p "${BACKUP_DIR}"
  BACKUP_FILE="${BACKUP_DIR}/pre-deploy_${COMMIT}_$(date +%Y%m%d_%H%M%S).sql.gz"
  docker exec messagesender_postgres pg_dump -U messagesender messagesender_db | gzip > "${BACKUP_FILE}"
  BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | awk '{print $1}')
  ok "Backup: $(basename "${BACKUP_FILE}") (${BACKUP_SIZE})"
else
  warn "Database not running — skipping backup (first deploy)"
fi

# ── Step 5: Build Docker images ─────────────────────────────────
log "[5/${TOTAL_STEPS}] Building Docker images..."
docker compose \
  -f "${APP_DIR}/docker-compose.yml" \
  -f "${APP_DIR}/docker-compose.prod.yml" \
  --env-file "${APP_DIR}/.env.prod" \
  build --pull
ok "Images built"

# ── Step 6: Start services ──────────────────────────────────────
log "[6/${TOTAL_STEPS}] Starting services..."
docker compose \
  -f "${APP_DIR}/docker-compose.yml" \
  -f "${APP_DIR}/docker-compose.prod.yml" \
  --env-file "${APP_DIR}/.env.prod" \
  up -d --remove-orphans
ok "Services started"

# ── Step 7: Health checks with retries ─────────────────────────
log "[7/${TOTAL_STEPS}] Waiting for services to become healthy..."
MAX_RETRIES=18    # 18 × 10s = 3 minutes max
RETRY_DELAY=10

# Backend health
BACKEND_OK=false
echo "  Polling backend health endpoint..."
for i in $(seq 1 "${MAX_RETRIES}"); do
  if curl -fsS "http://127.0.0.1:4000/api/v1/health" >/dev/null 2>&1; then
    BACKEND_OK=true
    ok "Backend is healthy (attempt ${i}/${MAX_RETRIES})"
    break
  fi
  printf "    Attempt %d/%d — waiting %ds...\r" "${i}" "${MAX_RETRIES}" "${RETRY_DELAY}"
  sleep "${RETRY_DELAY}"
done
echo ""

if [[ "${BACKEND_OK}" != "true" ]]; then
  echo ""
  echo -e "${RED}Backend health check failed after $((MAX_RETRIES * RETRY_DELAY))s${NC}"
  echo "  Backend logs:"
  docker logs messagesender_backend --tail 30 2>&1 | sed 's/^/    /'
  fail "Deployment failed — backend did not become healthy"
fi

# Frontend health
FRONTEND_OK=false
echo "  Polling frontend..."
for i in $(seq 1 "${MAX_RETRIES}"); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000" 2>/dev/null; then
    FRONTEND_OK=true
    ok "Frontend is healthy (attempt ${i}/${MAX_RETRIES})"
    break
  fi
  printf "    Attempt %d/%d — waiting %ds...\r" "${i}" "${MAX_RETRIES}" "${RETRY_DELAY}"
  sleep "${RETRY_DELAY}"
done
echo ""

if [[ "${FRONTEND_OK}" != "true" ]]; then
  echo ""
  echo -e "${RED}Frontend health check failed after $((MAX_RETRIES * RETRY_DELAY))s${NC}"
  echo "  Frontend logs:"
  docker logs messagesender_frontend --tail 30 2>&1 | sed 's/^/    /'
  fail "Deployment failed — frontend did not become healthy"
fi

# ── Step 8: Summary ─────────────────────────────────────────────
log "[8/${TOTAL_STEPS}] Deployment summary"

echo ""
docker compose \
  -f "${APP_DIR}/docker-compose.yml" \
  -f "${APP_DIR}/docker-compose.prod.yml" \
  --env-file "${APP_DIR}/.env.prod" \
  ps
echo ""

echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   Deployment complete!                                  ${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
ok "Commit  : ${COMMIT}"
ok "Backend : http://127.0.0.1:4000/api/v1/health"
ok "Frontend: http://127.0.0.1:3000"
echo ""
echo -e "${BOLD}Useful commands:${NC}"
echo "  docker compose -f ${APP_DIR}/docker-compose.yml -f ${APP_DIR}/docker-compose.prod.yml --env-file ${APP_DIR}/.env.prod logs -f"
echo "  docker compose -f ${APP_DIR}/docker-compose.yml -f ${APP_DIR}/docker-compose.prod.yml --env-file ${APP_DIR}/.env.prod ps"
echo ""
echo -e "${BOLD}Next:${NC} Configure Nginx + SSL — see docs/VPS_DEPLOYMENT.md → Step 8"
echo ""
