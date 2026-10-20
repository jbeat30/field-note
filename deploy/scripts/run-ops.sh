#!/usr/bin/env bash
# 점검 작업(백업·복구 시험·해지 회사 삭제)을 ops 컨테이너에서 실행하는 크론용 래퍼
#   ./deploy/scripts/run-ops.sh <작업 이름> <명령...>
#   예) ./deploy/scripts/run-ops.sh backup pnpm backup create
# 겹쳐 실행되지 않게 잠그고, 결과를 deploy/logs/<작업 이름>.log에 남기며,
# 실패하면 ops.env의 ALERT_MAIL_TO로 알림 메일을 보낸다 (설정이 없으면 로그만 남음)
set -uo pipefail

if [ "$#" -lt 2 ]; then
  echo "사용법: run-ops.sh <작업 이름> <명령...>" >&2
  exit 2
fi

NAME="$1"
shift
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/deploy/logs"
LOG="$LOG_DIR/$NAME.log"
COMPOSE=(docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$ROOT/deploy/.env")

# 로그 폴더에 쓸 수 없으면 잠금·로그가 모두 실패하므로 조용히 넘어가지 않고 오류로 끝냄 (크론이 백업을 못 돌리는 일을 막음)
if ! mkdir -p "$LOG_DIR" 2>/dev/null || ! touch "$LOG" "$LOG_DIR/.$NAME.lock" 2>/dev/null; then
  echo "[run-ops] $LOG_DIR 에 쓸 수 없음 (폴더 소유자가 이 계정인지 확인: sudo chown -R \$USER $LOG_DIR)" >&2
  exit 1
fi

exec 9>"$LOG_DIR/.$NAME.lock"
if ! flock -n 9; then
  echo "$(date -Is) $NAME 이전 작업이 아직 실행 중이라 건너뜀" >>"$LOG"
  exit 0
fi

echo "== $(date -Is) 시작 $NAME: $*" >>"$LOG"
"${COMPOSE[@]}" run --rm -T ops "$@" >>"$LOG" 2>&1
CODE=$?
echo "== $(date -Is) 끝 $NAME 종료 코드 $CODE" >>"$LOG"

if [ "$CODE" -ne 0 ]; then
  TAIL="$(tail -n 40 "$LOG")"
  printf '%s\n' "$TAIL" | "${COMPOSE[@]}" run --rm -T ops pnpm alert:mail "[필드노트] 점검 작업 실패: $NAME" >>"$LOG" 2>&1 || true
fi

exit "$CODE"
