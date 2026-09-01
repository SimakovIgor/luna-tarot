#!/usr/bin/env bash
# Bootstrap чистого Ubuntu 22.04 на is*hosting (1 vCPU / 1 GB).
# Ставит swap, Docker и firewall. Ничего не собирает: образы приезжают готовыми.
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Запусти под root"
  exit 1
fi

echo "[1/4] swap 4G"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10
grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf

echo "[2/4] пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates ufw

echo "[3/4] docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

echo "[4/4] firewall"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p /opt/luna-tarot

echo "готово"
free -h
docker --version
