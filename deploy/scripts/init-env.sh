#!/usr/bin/env bash
# 서버에서 환경 변수 파일(deploy/.env, deploy/ops.env)을 만든다. Node 없이 openssl만 쓴다
#   ./deploy/scripts/init-env.sh [--force]
# 템플릿의 {{토큰}}을 새로 만든 비밀 값으로 채우고, 같은 토큰은 두 파일에서 같은 값을 쓴다
# <꺾쇠>로 표시된 값(접속 주소·R2·Gmail)은 파일을 열어 직접 채운다 (값은 저장소·채팅에 남기지 않음)
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "[init-env] openssl이 필요합니다 (sudo apt-get install -y openssl)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/deploy"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

if [ "$FORCE" -eq 0 ] && { [ -e .env ] || [ -e ops.env ]; }; then
  echo "[init-env] deploy/.env 또는 ops.env가 이미 있어 건너뜀 (새로 만들려면 --force, DB 비밀번호가 바뀌므로 DB도 새로 만들어야 함)"
  exit 0
fi

# 토큰 이름별 값 (apps/api/src/config/envTemplate.ts와 같은 길이: 24바이트 또는 32바이트의 base64url)
random_url() { openssl rand -base64 "$1" | tr -d '\n=' | tr '+/' '-_'; }

declare -A VALUES

value_of() {
  local name="$1"
  if [ -z "${VALUES[$name]:-}" ]; then
    case "$name" in
      DB_*_PASSWORD) VALUES[$name]="$(random_url 24)" ;;
      CODE_HASH_SECRET | OAUTH_COOKIE_SECRET | TOTP_ENCRYPTION_KEY | BACKUP_ENCRYPTION_KEY)
        VALUES[$name]="$(random_url 32)" ;;
      *) echo "[init-env] 알 수 없는 토큰 $name" >&2; exit 1 ;;
    esac
  fi
  printf '%s' "${VALUES[$name]}"
}

render() {
  local template="$1" output="$2" content token
  content="$(cat "$template")"
  for token in $(grep -o '{{[A-Z0-9_]*}}' "$template" | sort -u | tr -d '{}'); do
    content="${content//\{\{$token\}\}/$(value_of "$token")}"
  done
  (umask 077 && printf '%s\n' "$content" >"$output")
  chmod 600 "$output"
  echo "[init-env] deploy/$output 생성 완료"
}

render env.example .env
render ops.env.example ops.env
echo "[init-env] <꺾쇠>로 표시된 값을 편집기로 직접 채우세요 (nano deploy/.env, nano deploy/ops.env)"
