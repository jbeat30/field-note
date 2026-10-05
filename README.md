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

## 환경 변수

- 목록과 기본값은 `.env.example`에 있다. 변수를 추가·변경하면 이 파일도 함께 고친다
- api는 시작할 때 `apps/api/src/env.ts`로 값을 검사한다. 빠졌거나 형식이 틀리면 어떤 변수가 문제인지 알려주고 실행을 멈춘다

## 문서

- [기획서 분석](docs/00-analysis.md)
- [개발 순서 설계](docs/01-development-plan.md)
- [진행 현황](docs/03-progress.md)
- [서비스 기획서 v2.4](docs/planning/service-plan-v2.4.md) / [기술 기획서 v0.5](docs/planning/tech-plan-v0.5.md)
