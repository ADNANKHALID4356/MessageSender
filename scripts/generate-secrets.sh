#!/usr/bin/env bash
# =============================================================
# generate-secrets.sh — Generate all required production secrets
#
# Usage:
#   bash scripts/generate-secrets.sh                  # Print secrets
#   bash scripts/generate-secrets.sh --write          # Write to .env.prod
#   bash scripts/generate-secrets.sh --write --force  # Overwrite existing .env.prod
#
# Requires: openssl (standard on Linux/macOS)
# =============================================================

set -euo pipefail

WRITE=false
FORCE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.prod"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

for arg in "$@"; do
  case "${arg}" in
    --write) WRITE=true ;;
    --force) FORCE=true ;;
    --help)
      echo "Usage: bash scripts/generate-secrets.sh [--write] [--force]"
      echo ""
      echo "  --write   Write generated secrets to .env.prod"
      echo "  --force   Overwrite existing .env.prod (only with --write)"
      exit 0 ;;
    *) echo "Unknown option: ${arg}" && exit 1 ;;
  esac
done

# Check openssl
command -v openssl >/dev/null 2>&1 || { echo -e "${RED}Error: openssl not found. Install it first.${NC}"; exit 1; }

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}   MessageSender — Production Secret Generator      ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Generate secrets ──────────────────────────────────────
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
ENCRYPTION_KEY=$(openssl rand -hex 32)
WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)

# Print them
echo -e "${GREEN}Generated secrets:${NC}"
echo ""
echo -e "  ${BOLD}POSTGRES_PASSWORD${NC}             = ${YELLOW}${POSTGRES_PASSWORD}${NC}"
echo -e "  ${BOLD}REDIS_PASSWORD${NC}                = ${YELLOW}${REDIS_PASSWORD}${NC}"
echo ""
echo -e "  ${BOLD}JWT_SECRET${NC}                    = ${YELLOW}${JWT_SECRET}${NC}"
echo -e "  ${BOLD}JWT_REFRESH_SECRET${NC}            = ${YELLOW}${JWT_REFRESH_SECRET}${NC}"
echo ""
echo -e "  ${BOLD}ENCRYPTION_KEY${NC}                = ${YELLOW}${ENCRYPTION_KEY}${NC}"
echo -e "  ${BOLD}FACEBOOK_WEBHOOK_VERIFY_TOKEN${NC} = ${YELLOW}${WEBHOOK_VERIFY_TOKEN}${NC}"
echo ""
echo -e "${YELLOW}⚠️  ENCRYPTION_KEY must NEVER be changed after first deployment.${NC}"
echo -e "   Store all secrets securely in a password manager."
echo ""

if [[ "${WRITE}" == "true" ]]; then
  if [[ -f "${ENV_FILE}" ]] && [[ "${FORCE}" != "true" ]]; then
    echo -e "${RED}Error: ${ENV_FILE} already exists.${NC}"
    echo "       Use --force to overwrite, or edit it manually."
    exit 1
  fi

  if [[ ! -f "${REPO_ROOT}/.env.prod.example" ]]; then
    echo -e "${RED}Error: .env.prod.example not found at ${REPO_ROOT}${NC}"
    exit 1
  fi

  echo -e "${BLUE}Writing secrets to ${ENV_FILE}...${NC}"

  # Copy template and substitute placeholder values
  cp "${REPO_ROOT}/.env.prod.example" "${ENV_FILE}"

  # Replace placeholder values with generated secrets.
  # macOS sed -i requires an explicit backup suffix; we use a temp file to be portable.
  _sed_replace() {
    local pattern="$1" replacement="$2" file="$3"
    local tmp
    tmp=$(mktemp)
    if sed "s|${pattern}|${replacement}|g" "${file}" > "${tmp}"; then
      # Only replace the original if sed produced a non-empty result
      if [[ ! -s "${tmp}" ]]; then
        rm -f "${tmp}"
        echo -e "${RED}Error: sed produced empty output for pattern '${pattern}'${NC}"
        exit 1
      fi
      mv "${tmp}" "${file}"
    else
      rm -f "${tmp}"
      echo -e "${RED}Error: sed failed for pattern '${pattern}'${NC}"
      exit 1
    fi
  }

  _sed_replace "CHANGE_ME_strong_postgres_password"                                    "${POSTGRES_PASSWORD}"    "${ENV_FILE}"
  _sed_replace "CHANGE_ME_strong_redis_password"                                       "${REDIS_PASSWORD}"       "${ENV_FILE}"
  _sed_replace "CHANGE_ME_64_hex_chars_minimum_32_bytes"                               "${JWT_SECRET}"           "${ENV_FILE}"
  _sed_replace "CHANGE_ME_different_64_hex_chars"                                      "${JWT_REFRESH_SECRET}"   "${ENV_FILE}"
  _sed_replace "CHANGE_ME_exactly_64_hex_characters_00000000000000000000000000000000" "${ENCRYPTION_KEY}"       "${ENV_FILE}"
  _sed_replace "your_webhook_verify_token"                                              "${WEBHOOK_VERIFY_TOKEN}" "${ENV_FILE}"

  # Secure the file
  chmod 600 "${ENV_FILE}"

  echo -e "${GREEN}✅ .env.prod created at: ${ENV_FILE}${NC}"
  echo ""
  echo -e "${YELLOW}Next: edit .env.prod and fill in the remaining values:${NC}"
  echo "   FRONTEND_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL"
  echo "   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET"
  echo "   SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM"
  echo ""
else
  echo -e "${BLUE}To write these to .env.prod automatically, run:${NC}"
  echo ""
  echo "   bash scripts/generate-secrets.sh --write"
  echo ""
fi
