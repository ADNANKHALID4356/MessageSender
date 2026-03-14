#!/usr/bin/env bash
set -euo pipefail

# Ubuntu VPS bootstrap for MessageSender
# Installs: Docker Engine, Docker Compose plugin, Nginx, UFW, Git

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash scripts/vps-setup-ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/7] Updating apt cache..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release software-properties-common

echo "[2/7] Installing base packages..."
apt-get install -y git ufw nginx

echo "[3/7] Installing Docker repository key..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "[4/7] Adding Docker apt repository..."
ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

echo "[5/7] Installing Docker Engine + Compose plugin..."
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "[6/7] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[7/7] Enabling Nginx..."
systemctl enable nginx
systemctl restart nginx

echo "Bootstrap complete."
echo "Next steps:"
echo "1) Clone repo on VPS"
echo "2) Create .env.prod"
echo "3) Run scripts/vps-deploy.sh"
