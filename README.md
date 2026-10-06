# field-note

현장직 팀(판금·전기·목공 등)의 관리자가 프로젝트별 투입 인원·공수·작업일지·자재·사진을 수첩처럼 기록하는 서비스.

## 구성

| 경로              | 내용                             |
| ----------------- | -------------------------------- |
| `apps/web`        | React 19 + Vite 8 (SPA)          |
| `apps/api`        | Express 5 API 서버               |
| `packages/shared` | Zod 스키마, 공통 타입, 공수 계산 |
| `packages/config` | tsconfig·ESLint·Jest 공통 설정   |
| `docs`            | 기획서, 분석, 개발 순서 설계     |

## AI와 함께 개발하기 (바이브 코딩)

이 프로젝트는 [Claude Code](https://claude.com/claude-code)를 개발 파트너로 쓰는 바이브 코딩으로 만들고 있다. 코드를 AI에게 맡기되, 방향과 품질 기준은 사람이 먼저 정하고 자동 검증으로 막는 방식이다.

### 역할 분담

| 사람이 정한다                                        | AI가 수행한다                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| 서비스·기술 기획서, 개발 순서, 기술 선택과 버전      | 작업 단위(`T0-1`, `P0-1` …)별 구현, 테스트, 문서 갱신                  |
| 브랜치 전략, 머지 방식, 릴리즈 시점                  | 브랜치·커밋·PR 작성, CI 결과 확인                                      |
| 위험한 변경(저장소 설정, 외부 서비스 대체 등)의 승인 | 대안 조사와 선택지 제시 (예: 사용 불가한 MinIO 이미지를 RustFS로 교체) |
| 모든 PR의 머지                                       | 변경 요약과 알려진 한계 보고                                           |

### 방식

1. **문서가 먼저다**: 기획서 2종(`docs/planning`)과 개발 순서(`docs/01-development-plan.md`)가 기준이고, AI는 이를 읽고 작업 단위를 하나씩 진행한다
2. **규칙은 파일로 고정한다**: 프로젝트 규칙은 `CLAUDE.md`에, 코드·주석 스타일은 [jbeat-conventions](https://github.com/jbeat30/jbeat-conventions) 플러그인(`.claude/settings.json`)에 둔다. 매번 말로 설명하지 않아도 같은 기준이 적용된다
3. **작은 PR로 쪼갠다**: 작업 하나가 PR 하나다. 사람이 리뷰하고 머지를 승인한 뒤에만 다음으로 넘어간다
4. **검증은 자동으로 한다**: AI가 쓴 코드는 사람이 일일이 읽기 전에 아래를 먼저 통과해야 한다
   - 타입 검사, 린트, 포맷, 단위·통합 테스트, 빌드 (CI에서 PR마다 실행)
   - **회사 간 데이터 격리 테스트**: 실제 PostgreSQL을 띄워 다른 회사 자료가 보이지 않는지, 새 테이블에 격리 정책이 빠지지 않았는지 검사
   - API 문서와 라우트 일치 검사, 컴포넌트 동작·접근성 검사(Storybook)
5. **정해진 길로만 쓰게 만든다**: 라우트는 등록 함수로만 추가되고(검증·인증·응답 파싱이 자동 적용), 업무 쿼리는 `withCompany`로만 실행된다. 어기면 린트나 테스트가 실패한다

### 지금까지

- `v0.1.0` 기술 0 — 준비(모노레포, 로컬 인프라, 회사 격리 DB, API·웹 공통 틀, 세션)를 PR 14개로 릴리즈했다
- 진행 상황은 `docs/03-progress.md`에 매번 기록해서, 새 세션에서도 이어서 작업할 수 있다

## 시작하기

### 1. 먼저 준비할 것

- Node 24 이상
- pnpm 12.9.1 (`packageManager`로 고정)
- Docker (macOS는 Docker Desktop). DB·파일 저장소·메일 수신기를 Docker로 띄운다

### 2. 처음 한 번만 하는 설정

```bash
pnpm install              # 패키지 설치
pnpm prepare              # 커밋 훅(husky) 연결
cp .env.example .env      # 환경 변수 파일 만들기 (.env는 Git에 올라가지 않음)
pnpm infra:up             # 로컬 인프라 실행 (DB 준비를 위해 먼저 필요)
pnpm db:setup             # DB 테이블 생성 + 앱 전용 DB 계정 비밀번호 설정
```

`.env`의 기본값은 아래 로컬 인프라와 맞춰져 있어서 그대로 써도 된다.

### 3. 개발 서버 실행

```bash
pnpm dev
```

이 명령 하나로 다음이 차례로 실행된다.

1. Docker가 꺼져 있으면 Docker Desktop을 자동으로 켠다 (macOS)
2. PostgreSQL·RustFS·Mailpit 컨테이너를 띄운다
3. api(`localhost:3000`)와 web(`localhost:5173`)을 띄운다

종료할 때는 `Ctrl+C`로 서버를 끄고, 컨테이너까지 끄려면 `pnpm infra:down`을 실행한다.

### 자주 쓰는 명령

| 명령              | 하는 일                                                |
| ----------------- | ------------------------------------------------------ |
| `pnpm dev`        | 인프라 + api + web 전부 실행                           |
| `pnpm dev:api`    | api만 실행 (인프라가 꺼져 있으면 먼저 `pnpm infra:up`) |
| `pnpm dev:web`    | web만 실행                                             |
| `pnpm infra:up`   | 로컬 인프라(Docker 컨테이너)만 실행                    |
| `pnpm infra:down` | 로컬 인프라 종료                                       |
| `pnpm typecheck`  | 타입 검사                                              |
| `pnpm lint`       | 코드 검사                                              |
| `pnpm test`       | 테스트                                                 |
| `pnpm build`      | 빌드                                                   |

## 로컬 인프라

`docker-compose.yml`로 실행되며, 운영 환경 대신 쓰는 개발용 대역이다.

| 서비스     | 역할                                  | 접속 주소                                               |
| ---------- | ------------------------------------- | ------------------------------------------------------- |
| PostgreSQL | 데이터베이스                          | `localhost:5432` (계정·비밀번호·DB명 모두 `field_note`) |
| RustFS     | 사진·자료 저장소 (S3 호환)            | API `localhost:9000`, 관리 화면 `localhost:9001`        |
| Mailpit    | 보낸 메일을 받아 보여주는 가짜 메일함 | 메일 수신 `localhost:1025`, 확인 화면 `localhost:8025`  |

- 메일은 실제로 발송되지 않는다. 인증 메일 등은 `localhost:8025`에서 확인한다
- MinIO 공식 이미지가 더 이상 배포되지 않아 호환 제품인 RustFS를 쓴다

## DB와 회사 격리

- DB 계정이 세 개다
  - **소유 계정**(`DATABASE_MIGRATE_URL`): 테이블을 만드는 마이그레이션 전용
  - **앱 계정**(`DATABASE_URL`): 업무 쿼리용. 다른 회사 데이터를 볼 수 없게 DB가 막고, 세션 테이블은 접근할 수 없다
  - **회사 범위 밖 전용 계정**(`DATABASE_AUTH_URL`): 로그인 전처럼 회사를 아직 모르는 시점의 세션 조회 전용. 업무 테이블 권한이 없다
- 업무 쿼리는 반드시 `withCompany(prisma, 회사ID, (tx) => …)`가 넘겨주는 `tx`로만 실행한다. 이 밖에서 조회하면 아무 행도 보이지 않는다
- `pnpm test`의 격리·스키마 검사 테스트는 Docker로 임시 PostgreSQL을 띄운다. Docker가 꺼져 있으면 실패한다
- Prisma 클라이언트는 `pnpm typecheck`·`pnpm test`가 자동으로 생성한다 (`src/generated`, Git 제외)

## API 규칙

- 모든 라우트는 `routeRegistry.add(spec, handler)`로만 등록한다. 등록하면 속도 제한 → 입력 검증 → 로그인 확인 → 멱등 키 → 응답 스키마 파싱이 정해진 순서로 자동 적용된다
- 같은 정의에서 API 문서(OpenAPI)가 만들어진다. 결과물은 `packages/shared/openapi/`에 커밋하며, 라우트를 바꾸고 `pnpm openapi:generate`를 안 하면 테스트가 실패한다
- 오류 응답은 항상 `{ error: { code, message, details? } }` 형식이다. 사용자 문구는 `apps/api/src/http/errorMessages.ts`에 모은다
- 쓰기 요청은 `Idempotency-Key` 헤더가 필요하다. 네트워크가 끊겨 같은 요청을 다시 보내도 한 번만 처리된다
- 개발 서버(`NODE_ENV=development`)에서는 `http://localhost:3000/api/docs`에서 API 문서를 볼 수 있다

## 웹 규칙

- 서버에서 받은 데이터는 React Query, 화면·임시 상태(작성 중 초안 포함)는 Zustand에 둔다. 서버 데이터를 Zustand에 복사하지 않는다
- 쿼리 키는 `query/queryKeys.ts`에서만 만든다
- 로그아웃·계정 전환 시 `resetClientState`를 호출해 캐시·화면 상태·IndexedDB 초안을 모두 비운다. 저장소를 새로 만들면 이 함수에 추가한다
- API 호출은 `api/client.ts`(서버 문서에서 생성된 타입)로만 한다. 쓰기 요청에는 멱등 키가 자동으로 붙는다
- 공통 UI 부품과 핵심 컴포넌트는 Storybook 스토리를 만든다(기본·빈 상태·로딩·오류·긴 텍스트 등). 스토리에는 가짜 데이터만 쓰고, 접근성 위반은 실패로 처리된다
- Vite 환경 변수는 `src/env.ts`로만 접근한다
- 서비스 워커는 앱 껍데기만 캐시하며 업무 데이터는 오프라인으로 쓰지 않는다

## 로그인 세션

- 세션은 PostgreSQL `sessions` 테이블에 저장하고, 브라우저에는 `sid` 쿠키(HttpOnly, SameSite=Lax, 운영은 Secure)만 둔다. 토큰 원문은 저장하지 않고 해시만 저장한다
- 회사 ID는 세션에만 기록되며, 요청의 경로·쿼리·헤더·본문으로는 받지 않는다. API 문서에 회사 ID 입력이 생기면 테스트가 실패한다
- 쓰기 요청(POST·PUT·PATCH·DELETE)은 CSRF 방어를 위해 `X-Field-Note-Client: web` 헤더가 필요하고, Origin이 있으면 `APP_ORIGIN`과 같아야 한다. 웹 API 클라이언트가 자동으로 붙인다
- 회사 범위 밖 전용 계정을 쓰는 코드는 `apps/api/src/session/`처럼 정해진 위치에만 둔다. 다른 곳에서 DB 클라이언트를 직접 만들면 린트가 막는다
- 로그인(가입)은 P0-3에서 추가한다. 지금은 세션 저장소, 쿠키, 로그아웃, 인증 확인까지 구현돼 있다

## 환경 변수

- 목록과 기본값은 `.env.example`에 있다. 변수를 추가·변경하면 이 파일도 함께 고친다
- api는 시작할 때 `apps/api/src/env.ts`로 값을 검사한다. 빠졌거나 형식이 틀리면 어떤 변수가 문제인지 알려주고 실행을 멈춘다

## 문서

- [기획서 분석](docs/00-analysis.md)
- [개발 순서 설계](docs/01-development-plan.md)
- [데이터 모델](docs/04-data-model.md)
- [진행 현황](docs/03-progress.md)
- [서비스 기획서 v2.4](docs/planning/service-plan-v2.4.md) / [기술 기획서 v0.5](docs/planning/tech-plan-v0.5.md)
