#!/usr/bin/env bash
# 서버 보안·상태 점검: 열린 포트, SSH 설정, 방화벽, 자동 업데이트, 컨테이너 상태, 디스크, 최근 백업
#   sudo ./deploy/scripts/server-check.sh
# 통과/실패를 한 줄씩 출력하고 실패가 하나라도 있으면 종료 코드 1
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAILED=0

pass() { echo "통과  $*"; }
fail() { echo "실패  $*"; FAILED=1; }

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo로 실행해 주세요 (열린 포트와 SSH 설정을 읽으려면 필요)" >&2
  exit 1
fi

# 바깥에서 닿는 TCP 포트(루프백 제외)
OPEN="$(ss -H -tln | awk '{print $4}' | grep -Ev '^(127\.|\[::1\]|::1)' | sed 's/.*://' | sort -un | tr '\n' ' ')"
UNEXPECTED=""
for port in $OPEN; do
  case "$port" in
    22 | 80 | 443) ;;
    *) UNEXPECTED="$UNEXPECTED$port " ;;
  esac
done
if [ -z "$UNEXPECTED" ]; then pass "바깥에서 닿는 포트가 22·80·443뿐 ($OPEN)"; else fail "예상 밖 포트가 열려 있음: $UNEXPECTED"; fi

if echo " $OPEN " | grep -q ' 5432 '; then fail "DB 포트(5432)가 바깥에 열려 있음"; else pass "DB 포트(5432)가 바깥에 열려 있지 않음"; fi

SSHD="$(sshd -T 2>/dev/null)"
if echo "$SSHD" | grep -q '^passwordauthentication no'; then pass "SSH 비밀번호 로그인 금지"; else fail "SSH 비밀번호 로그인이 허용됨"; fi
if echo "$SSHD" | grep -q '^permitrootlogin no'; then pass "SSH 루트 로그인 금지"; else fail "SSH 루트 로그인이 허용됨"; fi

if ufw status | grep -q '^Status: active'; then pass "방화벽(ufw) 켜짐"; else fail "방화벽(ufw)이 꺼져 있음"; fi
if fail2ban-client status sshd >/dev/null 2>&1; then pass "fail2ban sshd 감시 중"; else fail "fail2ban sshd 감시가 꺼져 있음"; fi
if grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null; then pass "자동 보안 업데이트 켜짐"; else fail "자동 보안 업데이트가 꺼져 있음"; fi

COMPOSE=(docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$ROOT/deploy/.env")
for service in db api web; do
  if [ -n "$("${COMPOSE[@]}" ps --status running --quiet "$service" 2>/dev/null)" ]; then
    pass "컨테이너 $service 실행 중"
  else
    fail "컨테이너 $service 가 실행 중이 아님"
  fi
done

for file in .env ops.env; do
  if [ -f "$ROOT/deploy/$file" ] && [ "$(stat -c %a "$ROOT/deploy/$file")" = "600" ]; then
    pass "deploy/$file 권한 600"
  else
    fail "deploy/$file 권한이 600이 아니거나 파일이 없음"
  fi
done

USED="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
if [ "$USED" -lt 80 ]; then pass "디스크 사용 ${USED}%"; else fail "디스크 사용 ${USED}% (80% 이상)"; fi

if [ -n "$(find "$ROOT/deploy/backups" -maxdepth 1 -mindepth 1 -type d -mtime -2 2>/dev/null | head -1)" ]; then
  pass "최근 2일 안에 만든 백업이 있음"
else
  fail "최근 2일 안에 만든 백업이 없음"
fi

if [ -f /var/run/reboot-required ]; then fail "재부팅이 필요한 업데이트가 있음 (sudo reboot)"; else pass "재부팅 필요 없음"; fi

exit "$FAILED"
