#!/bin/bash
set -euo pipefail

# VPS 배포 스크립트
# 사용법: bash cicd/deploy.sh [VPS_HOST] [VPS_USER]
# 또는: make deploy

VPS_HOST="${1:-${VPS_HOST:?VPS_HOST is required}}"
VPS_USER="${2:-${VPS_USER:-root}}"

echo "Deploying to ${VPS_USER}@${VPS_HOST}..."

ssh "${VPS_USER}@${VPS_HOST}" << 'REMOTE'
  set -euo pipefail
  cd /opt/coin

  echo "Pulling latest images..."
  docker compose pull

  echo "Starting services..."
  docker compose up -d --remove-orphans

  echo "Waiting for health checks..."
  sleep 10
  docker compose ps

  echo "Cleaning old images..."
  docker image prune -f

  echo "Deploy complete!"
REMOTE
