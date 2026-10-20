#!/usr/bin/env bash
# 배포·갱신·되돌리기: 같은 순서로 실행한다
#   ./deploy/scripts/deploy.sh [git 태그 또는 브랜치]
# 순서: (이미 실행 중이면) 배포 전 백업 → 코드 맞추기 → 이미지 빌드 → DB 시작 → 마이그레이션 → api·웹 시작 → 헬스 체크
# 되돌리기는 이전 태그를 넣어 같은 명령을 실행한다. 이미 적용된 마이그레이션은 되돌리지 않으므로
# 새 마이그레이션이 들어간 배포를 되돌릴 때는 docs/05-backup-restore.md의 복구 절차를 따른다
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
REF="${1:-}"
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file deploy/.env)
log() { echo "[deploy] $*"; }

for file in deploy/.env deploy/ops.env; do
  if [ ! -f "$file" ]; then
    echo "$file이 없습니다. ./deploy/scripts/init-env.sh를 먼저 실행하세요" >&2
    exit 1
  fi
  if grep -v '^[[:space:]]*#' "$file" | grep -q '=<'; then
    echo "$file에 <꺾쇠> 자리표시자가 남아 있습니다. 실제 값으로 채워 주세요:" >&2
    grep -v '^[[:space:]]*#' "$file" | grep '=<' | cut -d= -f1 >&2
    exit 1
  fi
done

if [ -n "$REF" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "저장소에 수정된 파일이 있어 코드를 바꿀 수 없습니다 (git status 확인)" >&2
    exit 1
  fi
  log "코드를 $REF 로 맞추기"
  git fetch --tags --quiet origin
  git checkout --quiet --detach "$REF"
fi

VERSION="$(git describe --tags --always 2>/dev/null || echo unknown)"
log "배포 버전: $VERSION"

# 이미 DB가 떠 있으면 배포 전 백업 (첫 배포는 건너뜀)
if [ -n "$("${COMPOSE[@]}" ps --status running --quiet db 2>/dev/null)" ]; then
  log "배포 전 백업"
  "$ROOT/deploy/scripts/run-ops.sh" predeploy-backup pnpm backup create
fi

log "이미지 빌드"
"${COMPOSE[@]}" build api web migrate ops

log "DB 시작"
"${COMPOSE[@]}" up -d --wait db

log "마이그레이션과 계정 비밀번호 설정"
"${COMPOSE[@]}" run --rm migrate

log "api·웹 시작"
"${COMPOSE[@]}" up -d --wait api web

SITE="$(grep '^SITE_ADDRESS=' deploy/.env | cut -d= -f2-)"
log "헬스 체크 https://$SITE/api/v1/health (인증서 발급에 1~2분 걸릴 수 있음)"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://$SITE/api/v1/health" >/dev/null 2>&1; then
    log "정상 응답. 배포 완료 ($VERSION)"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 5
done

echo "헬스 체크가 통과하지 않았습니다. 로그 확인: docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs --tail 100 web api" >&2
exit 1
