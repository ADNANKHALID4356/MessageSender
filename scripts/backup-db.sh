#!/usr/bin/env bash
# =============================================================
# backup-db.sh — PostgreSQL database backup
#
# Creates a compressed SQL dump and retains backups for
# RETENTION_DAYS (default: 30).
#
# Usage:
#   bash scripts/backup-db.sh [output_dir]
#
# Cron example (daily at 02:30):
#   30 2 * * * bash /opt/messagesender/scripts/backup-db.sh >> /opt/messagesender/logs/backup.log 2>&1
# =============================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${1:-${REPO_ROOT}/backups}"
DB_CONTAINER="messagesender_postgres"
DB_USER="messagesender"
DB_NAME="messagesender_db"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

log()  { echo -e "[$(date +%H:%M:%S)] ${BLUE}${*}${NC}"; }
ok()   { echo -e "[$(date +%H:%M:%S)] ${GREEN}✅ ${*}${NC}"; }
warn() { echo -e "[$(date +%H:%M:%S)] ${YELLOW}⚠️  ${*}${NC}"; }
fail() { echo -e "[$(date +%H:%M:%S)] ${RED}❌ ${*}${NC}"; exit 1; }

# ── Check prerequisites ───────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker is not installed"

if ! docker ps --filter "name=${DB_CONTAINER}" --filter "status=running" -q | grep -q .; then
  fail "Container '${DB_CONTAINER}' is not running. Is the stack up?"
fi

# ── Create backup directory ───────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── Perform backup ────────────────────────────────────────────
log "Starting backup → ${BACKUP_FILE}"

docker exec "${DB_CONTAINER}" \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${BACKUP_FILE}"
# Capture both exit codes: [0]=docker/pg_dump, [1]=gzip
PG_EXIT=${PIPESTATUS[0]}
GZ_EXIT=${PIPESTATUS[1]}

if [[ "${PG_EXIT}" -ne 0 ]] || [[ "${GZ_EXIT}" -ne 0 ]] || [[ ! -s "${BACKUP_FILE}" ]]; then
  rm -f "${BACKUP_FILE}"
  fail "pg_dump failed (pg_dump exit=${PG_EXIT}, gzip exit=${GZ_EXIT}) or produced an empty file"
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | awk '{print $1}')
ok "Backup created: $(basename "${BACKUP_FILE}") (${BACKUP_SIZE})"

# ── Prune old backups ─────────────────────────────────────────
log "Pruning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -print -delete 2>/dev/null | wc -l)
if [[ "${DELETED}" -gt 0 ]]; then
  ok "Deleted ${DELETED} old backup(s)"
else
  log "No old backups to prune"
fi

# ── List current backups ──────────────────────────────────────
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | awk '{print $1}')
log "Backups on disk: ${BACKUP_COUNT} file(s), total ${TOTAL_SIZE}"

ok "Backup complete"
