# field-note

현장 팀(판금·전기·목공 등)의 관리자가 **프로젝트별 투입 인원·공수·작업 기록·자재·사진·지출**을 수첩처럼 남기는 서비스.

- 프로젝트마다 작업 달력에서 하루 기록(누가 몇 시간 무슨 일을 했는지, 자재, 사진, 메모, 비용)을 쓴다
- 인력 배치 타임라인, 월 공수표, 직원 단가·프로젝트 인건비 추정, 알림, 마감·보증·보수 관리
- 회사마다 데이터가 완전히 분리되고(DB 행 단위 격리), 휴대폰에서 한 손으로 쓰는 것을 기준으로 설계

## 구성

| 경로              | 내용                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `apps/web`        | React 19 + Vite SPA (Tailwind, Radix, TanStack Query, 목업 서버 MSW, Storybook) |
| `apps/api`        | Express 5 + Prisma 7 + PostgreSQL (행 수준 보안), 작업 큐 pg-boss               |
| `packages/shared` | Zod 스키마, 공통 타입, 서버·목업이 함께 쓰는 계산 규칙(공수·단가·알림 등)       |
| `packages/config` | tsconfig·ESLint·Jest 공통 설정                                                  |
| `docs`            | 기획서, 개발 순서, 진행 현황, 데이터 모델, 기능 상세                            |

## AI와 함께 개발하기 (바이브 코딩)

[Claude Code](https://claude.com/claude-code)와 대화하며 만든다. 방향과 기준은 사람이 정하고, 구현·검증·문서는 AI가 하고, 마지막 확인은 사람이 한다.

1. **문서가 먼저**: 서비스·기술 기획서와 개발 순서(`docs/`)를 기준으로 "다음 작업 진행해줘" 식으로 요청한다. 기획이 바뀌면 문서(`docs/08~09-renewal-plan*.md`)부터 고친다
2. **한 단계씩 구현 → 검증 → 보고**: AI가 구현하고 타입·린트·테스트·빌드와 실제 DB·브라우저(Playwright) 확인을 거쳐 결과를 보고한다. 화면은 내가 직접 보고 "이건 이렇게 바꿔줘"라고 피드백한다
3. **확인하면 커밋, 묶어서 PR**: 내가 확인한 단계만 커밋하고, PR과 릴리즈(`feature` → `release` → `main`)는 범위가 끝난 뒤 한 번에 올린다. 머지는 항상 내가 한다
4. **규칙은 파일로**: 작업 절차와 금지 사항은 `CLAUDE.md`, 코드 스타일은 [jbeat-conventions](https://github.com/jbeat30/jbeat-conventions)에 둬서 매번 설명하지 않아도 같은 기준이 적용된다
5. **자동 검증이 막아 준다**: 다른 회사 자료가 보이지 않는지(실제 PostgreSQL 격리 테스트), 새 테이블에 보호 정책이 빠지지 않았는지, API 문서와 라우트가 일치하는지, 컴포넌트 동작·접근성(Storybook)을 PR마다 CI가 검사한다
6. **진행은 문서에 남긴다**: 대화가 길어져 끊겨도 `docs/03-progress.md`(완료·다음 작업·메모)로 이어서 작업한다

## 시작하는 방법

준비물: Node 24 이상, pnpm 12.9.1(`packageManager`로 고정), Docker (아래 B와 `pnpm test`에 필요)

### A. 화면만 빠르게 (목업 모드)

```bash
pnpm install
pnpm dev:mock       # http://localhost:5173/login  (백엔드 없이 브라우저 안의 가짜 서버가 응답)
```

### B. 실제 DB·API까지

```bash
pnpm install
pnpm env:init       # .env 생성 (DB 비밀번호·저장소 키를 새로 만듦, Git에 올라가지 않음)
pnpm infra:up       # Docker로 DB·객체 저장소·메일 서버 기동
pnpm db:setup       # 테이블 생성 + DB 계정 비밀번호 설정
pnpm db:seed        # 더미 회사·계정 입력
pnpm dev            # api(:3000) + web(:5173)
```

- 로그인: `hanbit` / `Hanbit-demo-2026!` (한빛판금), `saeron` / `Saeron-demo-2026!`
- API 문서 `http://localhost:3000/api/docs`, 메일 확인(Mailpit) `http://localhost:8025`
- 3000번 포트가 사용 중이면 `PORT=3001`로 api를 띄우고 web은 `API_PROXY_TARGET=http://localhost:3001`로 실행한다
- DB를 처음 상태로: `pnpm db:reset`

### 검증

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm test            # Docker 필요 (회사 격리 등 DB 테스트가 임시 컨테이너를 띄움)
pnpm test:stories    # Storybook 동작·접근성 (최초 1회 pnpm --filter @field-note/web exec playwright install chromium)
pnpm e2e             # 실제 서버로 핵심 흐름 확인 (infra:up·db:setup·db:seed 뒤에)
```

## 문서

- [기획서 분석](docs/00-analysis.md) · [개발 순서](docs/01-development-plan.md) · [브랜치·릴리즈 전략](docs/02-git-workflow.md)
- [진행 현황](docs/03-progress.md) · [데이터 모델](docs/04-data-model.md) · [백업·복구](docs/05-backup-restore.md)
- [기능·운영 상세 (API 규칙, 화면별 동작, 운영자 CLI, 환경 변수 등)](docs/07-feature-reference.md)
- [서비스 기획서 v2.4](docs/planning/service-plan-v2.4.md) · [기술 기획서 v0.5](docs/planning/tech-plan-v0.5.md)
