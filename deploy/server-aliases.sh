# >>> field-note 운영 단축어 (서버에 로그인하면 바로 사용) >>>
# docker compose 앞부분을 줄인 것: fnc ps, fnc logs api ...
fnc() { docker compose -f /srv/field-note/deploy/docker-compose.yml --env-file /srv/field-note/deploy/.env "$@"; }

# ops 컨테이너로 운영자 명령 실행 (알려진 pnpm 경고 줄은 숨기고, 명령의 종료 코드는 그대로 돌려줌)
fn-ops() {
  fnc run --rm ops "$@" 2>&1 | grep -vE 'ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR|installing dependencies|Failed to remove /app/node_modules|^ +Permission denied \(os error 13\)|The install that runs before scripts failed|^Scope: all|\.env not found|^\$ |^\[\+\] run|Container field-note-prod-(db|ops-run)|^$'
  return "${PIPESTATUS[0]}"
}

# 새 회사와 관리자를 만들고 초대 링크를 보여 줌 (링크는 한 번만 표시됨)
#   new-company "회사 이름" "관리자 이름" [유효 일수]
new-company() {
  if [ "$#" -lt 2 ]; then echo '사용법: new-company "회사 이름" "관리자 이름" [유효 일수(기본 7)]'; return 2; fi
  fn-ops pnpm operator create-company --company "$1" --admin "$2" ${3:+--days "$3"}
}

# 초대 링크 다시 발급 (가입 전인 회사만, 기존 링크는 바로 무효)
#   reissue-invite <회사 ID> [유효 일수]
reissue-invite() {
  if [ "$#" -lt 1 ]; then echo '사용법: reissue-invite <회사 ID> [유효 일수(기본 7)]'; return 2; fi
  fn-ops pnpm operator reissue --company-id "$1" ${2:+--days "$2"}
}

# 회사 목록과 상태
list-companies() { fn-ops pnpm operator list; }
# <<< field-note 운영 단축어 <<<
