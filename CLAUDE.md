# field-note

현장 팀 프로젝트 관리 서비스 (pnpm 모노레포). 기획서는 `docs/planning/`, 개발 순서는 `docs/01-development-plan.md`.

## 규칙

- 코드·주석은 jbeat-conventions 규칙을 따른다 (한국어 명사형, 마침표 없음)
- 의존성은 정확한 버전으로 고정하고 정식 릴리스만 쓴다 (`^` 금지, Prisma는 7.10.0, TypeScript는 6.0.3)
- 회사 ID는 세션에서만 얻는다. 요청 본문·주소·헤더로 받지 않는다
- 커밋 메시지는 `타입: 한국어 설명` 형식으로 사람이 쓴 것처럼 작성하고, Claude Code 안내 문구·Co-Authored-By는 넣지 않는다

## 브랜치 전략 (`docs/02-git-workflow.md`)

- `main`·`feature/*`·`release/*`에 직접 푸시하지 않는다
- `main`에서 `feature/<버전>`을 만들고, 기능 브랜치 `<타입>-<작업명>` (예: `feat-login-page`) PR로 모은다. 버전 범위가 끝나면 `main`에서 만든 `release/<버전>`으로 `feature/<버전>` PR → `release/<버전>` → `main` PR
- 모든 PR은 CI 통과 필수, 버전은 SemVer

## 명령

- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build`
- `pnpm dev` (api :3000, web :5173)

## 작업 진행 절차

사용자가 "머지했어 다음 진행해줘"처럼 요청하면 아래 순서로 이어서 진행한다. 새 세션이면 먼저 `docs/03-progress.md`의 "다음 작업"과 `git log`·`gh pr list`로 현재 위치를 확인한다

1. **상태 확인**: 머지된 PR을 반영해 `git checkout feature/<버전> && git pull origin feature/<버전>`로 최신화한다. 릴리즈 흐름 중이면 `docs/02-git-workflow.md`의 4~6번 순서를 따른다 (`release/<버전>` 생성 → feature → release PR → 버전 올림 `fix-release-version-<버전>` PR(squash) → release → main PR(merge commit), 태그·Release는 main 머지 시 자동 생성)
2. **브랜치**: `feature/<버전>`에서 `<타입>-<작업명>` 브랜치를 만든다
3. **구현**: `docs/01-development-plan.md`의 다음 작업(ID)을 구현한다. 규칙은 shared의 순수 함수로 두어 서버와 목업이 함께 쓴다. 새 엔드포인트는 `pnpm openapi:generate`, 새 회사 범위 테이블은 RLS·`PURGE_POLICY`·격리 테스트 목록까지 반영한다
4. **검증**: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:stories`를 모두 통과시키고, 화면이 있으면 실제 API·DB와 Chromium(Playwright)으로 직접 확인한다. 새 화면·컴포넌트에는 Storybook 스토리를 만든다
5. **문서**: README, `docs/04-data-model.md`(스키마 변경 시), `docs/03-progress.md`(완료·다음 작업·메모)를 같은 PR에서 갱신한다. 문서만 바꾸는 PR을 따로 쌓지 않는다
6. **커밋·PR**: `타입: 한국어 설명 (작업 ID)` 커밋(첨부 문구 없음) → 푸시 → `gh pr create --base feature/<버전>` (본문은 개요·변경 사항·검증·참고, 개조식). PR 본문은 임시 파일로 만들어 `--body-file`로 넘긴다
7. **보고**: 한국어로 구현 내용·검증 결과·남은 일을 짧게 보고하고, 사용자가 "머지했어"라고 할 때까지 기다린다. 다음 작업을 미리 시작하지 않는다
8. **합의가 필요한 일**: GitHub 저장소 보호 설정 변경, 운영 서버·카카오 앱 등록(운영 서버 작업 때로 미룸)은 사용자와 합의 후에만 한다

### 로컬 실행 요령

- 인프라·DB: `pnpm infra:up`, 데이터 초기화는 `pnpm db:reset` (시드 계정 `hanbit` / `Hanbit-demo-2026!`)
- 사용자의 다른 앱이 3000번 포트를 쓸 수 있다. 충돌하면 이전 프로세스를 정리하고(`pkill -f tsx; pkill -f vite`) api는 `cd apps/api && PORT=3001 pnpm exec tsx --env-file-if-exists=../../.env src/main.ts`, web은 `cd apps/web && API_PROXY_TARGET=http://localhost:3001 pnpm exec vite`로 띄운다
- 임시 파일(PR 본문, 검증 스크립트)은 세션 scratchpad에 둔다. Playwright 스크립트는 `apps/web` 안에서 실행하고 끝나면 지운다
- 스토리 최초 실행 전 `pnpm --filter @field-note/web exec playwright install chromium`
