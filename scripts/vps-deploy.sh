#!/usr/bin/env bash
set -euo pipefail

# Deploy MessageSender on Ubuntu VPS using Docker Compose
# Usage:
#   bash scripts/vps-deploy.sh <repo_url> [app_dir] [branch]
# Example:
#   bash scripts/vps-deploy.sh https://github.com/your-user/your-repo.git /opt/messagesender main

REPO_URL="${1:-}"
APP_DIR="${2:-/opt/messagesender}"
BRANCH="${3:-main}"

if [[ -z "${REPO_URL}" ]]; then
  echo "Usage: bash scripts/vps-deploy.sh <repo_url> [app_dir] [branch]"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Run scripts/vps-setup-ubuntu.sh first."
  exit 1
fi

echo "[1/6] Preparing app directory..."
mkdir -p "${APP_DIR}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "[2/6] Cloning repository..."
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  echo "[2/6] Updating existing repository..."
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
fi

if [[ ! -f "${APP_DIR}/.env.prod" ]]; then
  echo "[3/6] .env.prod not found. Creating from template..."
  cp "${APP_DIR}/.env.prod.example" "${APP_DIR}/.env.prod"
  echo "Please edit ${APP_DIR}/.env.prod with real production values, then re-run this script."
  exit 1
fi

echo "[4/6] Building images..."
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${APP_DIR}/docker-compose.prod.yml" --env-file "${APP_DIR}/.env.prod" build

echo "[5/6] Starting services..."
docker compose -f "${APP_DIR}/docker-compose.yml" -f "${APP_DIR}/docker-compose.prod.yml" --env-file "${APP_DIR}/.env.prod" up -d

echo "[6/6] Health checks..."
sleep 8
curl -fsS http://127.0.0.1:4000/api/v1/health || true
curl -fsS http://127.0.0.1:3000 || true

echo
echo "Deployment complete."
echo "Use this to inspect containers:"
echo "docker compose -f ${APP_DIR}/docker-compose.yml -f ${APP_DIR}/docker-compose.prod.yml --env-file ${APP_DIR}/.env.prod ps"
