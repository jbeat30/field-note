#!/usr/bin/env bash
# Docker 데몬 기동 보장 (macOS에서는 Docker Desktop 자동 실행)
set -euo pipefail

if docker info >/dev/null 2>&1; then
  exit 0
fi

if [ "$(uname)" = "Darwin" ]; then
  echo "[ensure-docker] Docker Desktop 실행"
  open -a Docker
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      exit 0
    fi
    sleep 2
  done
fi

echo "[ensure-docker] Docker 데몬에 연결할 수 없음" >&2
exit 1
