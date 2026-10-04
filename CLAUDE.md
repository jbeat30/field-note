# field-note

현장 팀 프로젝트 관리 서비스 (pnpm 모노레포). 기획서는 `docs/planning/`, 개발 순서는 `docs/01-development-plan.md`.

## 규칙

- 코드·주석은 jbeat-conventions 규칙을 따른다 (한국어 명사형, 마침표 없음)
- 의존성은 정확한 버전으로 고정하고 정식 릴리스만 쓴다 (`^` 금지, Prisma는 7.10.0, TypeScript는 6.0.3)
- 회사 ID는 세션에서만 얻는다. 요청 본문·주소·헤더로 받지 않는다
- 커밋 메시지는 `타입: 한국어 설명` 형식으로 사람이 쓴 것처럼 작성하고, Claude Code 안내 문구·Co-Authored-By는 넣지 않는다

## 브랜치 전략 (`docs/02-git-workflow.md`)

- `main`·`feature/*`·`release/*`에 직접 푸시하지 않는다
- `feature/<버전>` → 기능 브랜치 `<타입>/<버전>/<작업명>` PR → 테스트 통과 후 `release/<버전>` → `main` PR
- 모든 PR은 CI 통과 필수, 버전은 SemVer

## 명령

- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build`
- `pnpm dev` (api :3000, web :5173)
