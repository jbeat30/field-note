# field-note

현장 팀(판금, 전기, 목공 등)의 관리자가 **프로젝트별 투입 인원, 공수, 작업 기록, 자재, 사진, 지출**을 수첩처럼 남기는 서비스입니다. 소스 코드를 공개하고 있으며, 실제 배포된 서비스는 사용자 피드백을 바탕으로 개선하는 베타 운영 단계입니다.

배포 버전은 `1.2.2`처럼 변경 이력을 구분하는 번호로 관리합니다. 서비스의 베타 운영 상태는 버전 번호와 별도로 안내합니다.

공개 시연에는 가상 데이터만 사용합니다. 시연 계정에 실제 개인정보나 현장 자료를 입력하지 마세요. 직접 실행하려면 아래 개발 환경을 준비하고, 비밀번호와 접근 키는 환경마다 새로 생성하세요.

- 프로젝트마다 작업 달력에서 하루 기록(누가 몇 시간 무슨 일을 했는지, 자재, 사진, 메모, 비용)을 쓴다
- 인력 배치 타임라인, 월 공수표, 직원 단가, 프로젝트 인건비 추정, 알림, 마감, 보증, 보수 관리
- 회사마다 데이터가 완전히 분리되고(DB 행 단위 격리), 휴대폰에서 한 손으로 쓰는 것을 기준으로 설계

## 구성

| 경로              | 내용                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `apps/web`        | React 19 + Vite SPA (Tailwind, Radix, TanStack Query, 목업 서버 MSW, Storybook) |
| `apps/api`        | Express 5 + Prisma 7 + PostgreSQL (행 수준 보안), 작업 큐 pg-boss               |
| `packages/shared` | Zod 스키마, 공통 타입, 서버와 목업이 함께 쓰는 계산 규칙(공수, 단가, 알림 등)   |
| `packages/config` | tsconfig, ESLint, Jest 공통 설정                                                |
| `deploy`          | 서버 한 대 배포용 Compose, Caddy, 스크립트와 환경 변수 템플릿                   |
| `docs`            | 기획서, 개발 순서, 진행 현황, 데이터 모델, 기능 상세, 배포 가이드               |

## 시작하는 방법

준비물: Node 24 이상, pnpm 12.9.1(`packageManager`로 고정), Docker (아래 B와 `pnpm test`에 필요)

### A. 화면만 빠르게 (목업 모드)

```bash
pnpm install
pnpm dev:mock       # http://localhost:5173/login  (백엔드 없이 브라우저 안의 가짜 서버가 응답)
```

### B. 실제 DB, API까지

```bash
pnpm install
pnpm env:init       # .env 생성 (DB 비밀번호, 저장소 키를 새로 만듦, Git에 올라가지 않음)
pnpm infra:up       # Docker로 DB, 객체 저장소, 메일 서버 기동
pnpm db:setup       # 테이블 생성 + DB 계정 비밀번호 설정
pnpm db:seed        # 더미 회사, 계정 입력
pnpm dev            # api(:3000) + web(:5173), 인프라가 꺼져 있으면 함께 기동
# 컨테이너가 이미 떠 있으면 pnpm dev:all (둘 다), pnpm dev:api, pnpm dev:web (각각)
```

- 로그인: `hanbit` / `Hanbit-demo-2026!` (한빛판금), `saeron` / `Saeron-demo-2026!`
- API 문서 `http://localhost:3000/api/docs`, 메일 확인(Mailpit) `http://localhost:8025`
- 3000번 포트가 사용 중이면 `PORT=3001`로 api를 띄우고 web은 `API_PROXY_TARGET=http://localhost:3001`로 실행한다
- DB를 처음 상태로: `pnpm db:reset`

## 개발 가이드

### 검증

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
pnpm test            # Docker 필요 (회사 격리 등 DB 테스트가 임시 컨테이너를 띄움)
pnpm test:stories    # Storybook 동작, 접근성 (최초 1회 pnpm --filter @field-note/web exec playwright install chromium)
pnpm e2e             # 실제 서버로 핵심 흐름 확인 (infra:up, db:setup, db:seed 뒤에)
```

PR마다 CI가 같은 검사를 돌리고, 다른 회사 자료가 보이지 않는지(실제 PostgreSQL 격리 테스트), 새 테이블에 보호 정책이 빠지지 않았는지, API 문서와 라우트가 일치하는지, 컴포넌트 동작, 접근성(Storybook)까지 확인한다.

### 작업 규칙

- 브랜치, PR, 릴리즈: `main` → `feature/<버전>` → 작업 브랜치(`<타입>-<작업명>`) 순으로 나누고, 모든 PR은 CI 통과가 필요하다 ([브랜치, 릴리즈 전략](docs/02-git-workflow.md))
- 코드, 주석, 커밋 규칙, 작업 진행 절차는 `CLAUDE.md`에 있다 (오류 문구는 `packages/shared/src/errorMessages.ts`의 상수로만 쓴다)
- 새 엔드포인트는 `pnpm openapi:generate`, 새 회사 범위 테이블은 RLS, 삭제 정책, 격리 테스트 목록까지 함께 반영한다
- 의존성은 정확한 버전으로 고정하고 정식 릴리스만 쓴다
- 진행 상황과 다음 작업은 `docs/03-progress.md`에 기록한다

## 서버 배포, 운영

서버 한 대에서 Docker Compose로 웹(Caddy), API, DB를 함께 띄우는 구성이다. 단계별 순서와 점검 목록은 [서버 배포 순서](docs/11-server-deploy.md)에 있다.

```bash
./deploy/scripts/server-setup.sh   # 서버 보안 설정 (방화벽, SSH 강화, Docker, 스왑)
./deploy/scripts/init-env.sh       # deploy/.env, deploy/ops.env 생성 (비밀 값 자동 생성)
# <꺾쇠> 값(R2, Gmail 등)은 서버에서 직접 채운다
./deploy/scripts/deploy.sh         # 이미지 빌드, 마이그레이션, 기동
sudo ./deploy/scripts/server-check.sh   # 포트, 권한, 상태 점검
```

- 회사, 초대 링크 발급, 약관 등록 같은 운영 작업은 운영자 CLI(`pnpm operator ...`)로 한다. 명령은 [기능, 운영 상세](docs/07-feature-reference.md)에 있다
- 백업(암호화, 서버 밖 사본)과 복구 시험은 [백업, 복구](docs/05-backup-restore.md)를 따른다
- 환경 변수 파일(`deploy/.env`, `deploy/ops.env`)과 키, 비밀번호는 서버에만 두고 저장소, 채팅에 남기지 않는다

### 공개 시연 환경

가상 데이터만 담은 `Test Company`를 두고 사람들이 둘러볼 수 있게 할 수 있다. 서버 `deploy/.env`에 `PUBLIC_DEMO_ENABLED=true`를 두면 로그인 화면에 시연 계정이 안내된다.

```bash
pnpm operator legal-register   # 약관 등록 (처음 한 번)
pnpm operator demo-reset       # 시연 회사를 만들거나 처음 상태로 되돌림 (서버에서는 ops 컨테이너로 실행, 크론이 매일 새벽 실행)
pnpm operator demo-remove      # 시연 환경을 끌 때 정리
```

해지, 비밀번호/이메일 변경, 2단계 인증, 소셜 연동, 기기 목록은 시연 계정에서 막혀 있다. 자세한 동작은 [기능, 운영 상세](docs/07-feature-reference.md)의 "공개 시연 환경"에 있다.

## 문서

- [기획서 분석](docs/00-analysis.md), [개발 순서](docs/01-development-plan.md), [브랜치, 릴리즈 전략](docs/02-git-workflow.md)
- [진행 현황](docs/03-progress.md), [데이터 모델](docs/04-data-model.md), [백업, 복구](docs/05-backup-restore.md)
- [기능, 운영 상세 (API 규칙, 화면별 동작, 운영자 CLI, 환경 변수 등)](docs/07-feature-reference.md)
- [배포 준비](docs/10-deployment-prep.md), [서버 배포 순서](docs/11-server-deploy.md)
- [서비스 기획서 v2.4](docs/planning/service-plan-v2.4.md), [기술 기획서 v0.5](docs/planning/tech-plan-v0.5.md)
- [API 문서, Postman](docs/13-api-docs.md), [Jest 가이드](docs/14-jest-guide.md), [Playwright 가이드](docs/15-playwright-guide.md), [Storybook 가이드](docs/16-storybook-guide.md)
