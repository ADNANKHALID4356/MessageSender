#!/usr/bin/env bash
# =============================================================
# vps-setup-ubuntu.sh — Bootstrap a fresh Ubuntu 22.04 VPS
#
# Installs and configures:
#   - System updates & base packages
#   - Docker Engine + Compose plugin
#   - Nginx + Certbot (Let's Encrypt)
#   - UFW firewall (SSH + HTTP + HTTPS only)
#   - fail2ban (brute-force protection)
#   - Swap space (if RAM <= 2 GB)
#   - Deploy user with Docker group access
#   - SSH hardening (key-only, no root login)
#
# Usage:
#   sudo bash scripts/vps-setup-ubuntu.sh [deploy_username]
#
# Arguments:
#   deploy_username  — Non-root user to create (default: deploy)
# =============================================================

set -euo pipefail

# ── Guard: must be root ────────────────────────────────────────
if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash scripts/vps-setup-ubuntu.sh"
  exit 1
fi

# ── Configuration ──────────────────────────────────────────────
DEPLOY_USER="${1:-deploy}"
export DEBIAN_FRONTEND=noninteractive

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

TOTAL_STEPS=10
step=0

log()  { step=$((step+1)); echo -e "\n${BOLD}${BLUE}[${step}/${TOTAL_STEPS}] ${*}${NC}"; }
ok()   { echo -e "    ${GREEN}✅ ${*}${NC}"; }
warn() { echo -e "    ${YELLOW}⚠️  ${*}${NC}"; }
fail() { echo -e "    ${RED}❌ ${*}${NC}"; exit 1; }

echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}   MessageSender — VPS Bootstrap (Ubuntu 22.04)        ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# ── 1. System update ──────────────────────────────────────────
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg lsb-release software-properties-common \
  git wget vim unzip tzdata
ok "System packages updated"

# ── 2. Set timezone to UTC ────────────────────────────────────
log "Setting timezone to UTC..."
timedatectl set-timezone UTC
ok "Timezone: $(timedatectl show --property=Timezone --value)"

# ── 3. Install base security packages ─────────────────────────
log "Installing security packages (fail2ban, unattended-upgrades)..."
apt-get install -y fail2ban unattended-upgrades

# Configure fail2ban for SSH
cat > /etc/fail2ban/jail.d/messagesender.conf << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
EOF

systemctl enable fail2ban
systemctl restart fail2ban
ok "fail2ban configured and running"

# Enable unattended security updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' \
  >> /etc/apt/apt.conf.d/50unattended-upgrades 2>/dev/null || true
ok "Automatic security updates enabled"

# ── 4. Create deploy user ─────────────────────────────────────
log "Creating deploy user '${DEPLOY_USER}'..."
if id "${DEPLOY_USER}" &>/dev/null; then
  warn "User '${DEPLOY_USER}' already exists — skipping creation"
else
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
  ok "User '${DEPLOY_USER}' created"
fi
usermod -aG sudo "${DEPLOY_USER}"
ok "User '${DEPLOY_USER}' added to sudo group"

# Set up SSH directory for deploy user
DEPLOY_HOME=$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)
mkdir -p "${DEPLOY_HOME}/.ssh"
chmod 700 "${DEPLOY_HOME}/.ssh"
touch "${DEPLOY_HOME}/.ssh/authorized_keys"
chmod 600 "${DEPLOY_HOME}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"
ok "SSH directory ready at ${DEPLOY_HOME}/.ssh"
echo ""
warn "ACTION REQUIRED: Add your public SSH key to ${DEPLOY_HOME}/.ssh/authorized_keys"
warn "  Run on your local machine: ssh-copy-id ${DEPLOY_USER}@<VPS_IP>"

# ── 5. SSH hardening ──────────────────────────────────────────
log "Hardening SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"
# Keep a backup
cp -n "${SSHD_CONFIG}" "${SSHD_CONFIG}.bak"

# Only change keys if not already set (safe to re-run)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/'    "${SSHD_CONFIG}"
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/'       "${SSHD_CONFIG}"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'                  "${SSHD_CONFIG}"
sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/'                      "${SSHD_CONFIG}"
sed -i 's/^#\?AllowAgentForwarding.*/AllowAgentForwarding no/'        "${SSHD_CONFIG}"

systemctl reload sshd
ok "SSH hardened: key-only auth, root login disabled"
warn "Verify SSH key login works BEFORE closing your root session!"

# ── 6. Swap space ─────────────────────────────────────────────
log "Checking memory and swap..."
RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_GB=$((RAM_KB / 1024 / 1024))
SWAP_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')

if [[ "${SWAP_KB}" -gt 0 ]]; then
  ok "Swap already configured (${SWAP_KB} KB) — skipping"
elif [[ "${RAM_GB}" -le 2 ]]; then
  SWAP_SIZE="2G"
  log "RAM <= 2 GB — adding ${SWAP_SIZE} swap..."
  fallocate -l "${SWAP_SIZE}" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
  sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
  ok "${SWAP_SIZE} swap file created and activated"
else
  ok "RAM = ${RAM_GB} GB — swap not required"
fi

# ── 7. Docker Engine ──────────────────────────────────────────
log "Installing Docker Engine + Compose plugin..."
if command -v docker >/dev/null 2>&1; then
  ok "Docker already installed ($(docker --version))"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
  ok "Docker installed ($(docker --version))"
fi

# Add deploy user to docker group
usermod -aG docker "${DEPLOY_USER}"
ok "User '${DEPLOY_USER}' added to docker group"

# ── 8. Nginx ──────────────────────────────────────────────────
log "Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
ok "Nginx installed and running"

# ── 9. Certbot (Let's Encrypt) ────────────────────────────────
log "Installing Certbot (Let's Encrypt)..."
apt-get install -y certbot python3-certbot-nginx
ok "Certbot installed ($(certbot --version 2>&1 | head -1))"

# ── 10. UFW Firewall ──────────────────────────────────────────
log "Configuring UFW firewall..."
# Always allow SSH first to avoid lockout
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# Internal ports (never expose to the internet)
# 3000, 4000, 5432, 6379 are blocked by default (accessed via Nginx proxy only)
ufw --force enable
ok "Firewall active — open ports: SSH, 80/tcp, 443/tcp"

# ── Final summary ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   Bootstrap complete!                                  ${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Add your SSH public key:"
echo -e "     ${BLUE}ssh-copy-id ${DEPLOY_USER}@<VPS_IP>${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Log in as the deploy user and run the first deploy:"
echo -e "     ${BLUE}ssh ${DEPLOY_USER}@<VPS_IP>${NC}"
echo -e "     ${BLUE}bash <(curl -fsSL https://raw.githubusercontent.com/ADNANKHALID4356/MessageSender/main/scripts/vps-deploy.sh) https://github.com/ADNANKHALID4356/MessageSender.git${NC}"
echo -e "     ${YELLOW}# or clone the repo first and run:${NC}"
echo -e "     ${BLUE}bash /opt/messagesender/scripts/vps-deploy.sh https://github.com/ADNANKHALID4356/MessageSender.git${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Configure Nginx and SSL:"
echo -e "     See ${BLUE}docs/VPS_DEPLOYMENT.md${NC} → Step 8"
echo ""
