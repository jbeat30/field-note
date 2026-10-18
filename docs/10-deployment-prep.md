# 배포 준비와 운영 이행 체크리스트

상용 전환 전에 필요한 클라우드 서비스와 환경 변수를 한 곳에 정리한 문서. 키·비밀 값은 저장소에 두지 않고 사용자가 배포 환경의 비밀 저장소에 직접 채운다. 변수 목록의 원본은 `.env.example`과 `apps/api/src/env.ts`

## 1. 필요한 서비스

| 구성          | 용도                                                      | 요구 사항                                                                                       | 결정        |
| ------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------- |
| 웹 호스팅     | 정적 웹(`apps/web` 빌드 결과)과 API 같은 도메인 제공      | HTTPS, API를 `/api`로 프록시해 같은 출처 유지 (쿠키·CSRF Origin 검증 전제)                      | 공급자 미정 |
| API 서버      | Node 24 상시 실행 (`pnpm --filter @field-note/api start`) | 상시 프로세스 (작업 큐 pg-boss가 같은 프로세스에서 돎), 헬스 체크 경로 있음                     | 공급자 미정 |
| PostgreSQL    | 업무 데이터, 세션, 작업 큐                                | 버전은 로컬 docker-compose와 맞춤, 일일 백업·복구 시험, 계정 6개 생성 권한 필요                 | 공급자 미정 |
| 객체 저장소   | 사진·문서 원본과 썸네일                                   | S3 호환, presigned PUT·GET, 버킷 CORS(웹 주소의 PUT·GET·HEAD, Content-Type 헤더 허용) 직접 설정 | 공급자 미정 |
| 메일 발송     | 인증 코드·비밀번호 재설정·알림                            | SMTP 계정, 발신 도메인 SPF·DKIM 설정                                                            | 공급자 미정 |
| 소셜 로그인   | 카카오·네이버·구글                                        | 각 개발자 콘솔에 앱 등록, 리다이렉트 `{APP_ORIGIN}/api/v1/auth/{kakao\|naver\|google}/callback` | 앱 미등록   |
| 도메인·인증서 | 서비스 주소                                               | 호스팅이 자동 발급하면 별도 준비 불필요                                                         | 미정        |
| 점검 작업     | 백업·삭제·복구 시험 (`ops/crontab.example`)               | 서버 스케줄러에서 `pnpm backup create`, `pnpm operator purge-due`, `pnpm backup drill` 실행     | 미정        |

공급자를 고르는 기준: 상시 프로세스를 돌릴 수 있는가, DB 백업·복구가 되는가, 국내 사용자 지연, 개인정보 국외 이전 여부(처리방침 `pendingItems`와 연결). 공급자가 정해지면 처리방침의 수탁·위탁·국외 이전 항목을 채우고 약관 버전을 올린다

## 2. 환경 변수

`NODE_ENV=production`에서는 `env.ts`가 로컬 주소·기본 비밀번호·debug 로그·http 주소를 거부하고 기동을 멈춘다

### api 서버가 읽는 값

| 변수                                       | 필수           | 운영 값                                                                                                                        |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                                 | 필수           | `production`                                                                                                                   |
| `PORT`                                     | 선택           | 호스팅이 지정하는 포트                                                                                                         |
| `LOG_LEVEL`                                | 선택           | `info` 이상 (debug·trace 불가)                                                                                                 |
| `APP_ORIGIN`                               | 필수           | 서비스 웹 주소 (https)                                                                                                         |
| `TRUST_PROXY_HOPS`                         | 프록시 뒤 필수 | 앞단 프록시 단계 수 (CloudFront → 로드 밸런서 → API면 2). 0이면 모든 사용자가 프록시 IP 하나로 보여 요청 횟수 제한을 함께 쓴다 |
| `DATABASE_URL`                             | 필수           | 앱 계정 `field_note_app` 접속 주소                                                                                             |
| `DATABASE_AUTH_URL`                        | 필수           | 회사 범위 밖 전용 계정 `field_note_auth`                                                                                       |
| `DATABASE_QUEUE_URL`                       | 필수           | 작업 큐 계정 `field_note_queue`                                                                                                |
| `DATABASE_MIGRATE_URL`                     | 필수           | 소유 계정 `field_note` (기동 검사에 필요)                                                                                      |
| `S3_ENDPOINT`·`S3_REGION`·`S3_BUCKET`      | 필수           | 객체 저장소 공급자 값                                                                                                          |
| `S3_ACCESS_KEY`·`S3_SECRET_KEY`            | 필수           | 버킷 전용 키 (접근 키 20자·비밀 키 40자 형식)                                                                                  |
| `SMTP_HOST`·`SMTP_PORT`·`SMTP_FROM`        | 필수           | 메일 공급자 값, 발신 주소는 인증된 도메인                                                                                      |
| `SMTP_USER`·`SMTP_PASSWORD`                | 운영 필수      | 메일 공급자 계정                                                                                                               |
| `CODE_HASH_SECRET`                         | 필수           | 32자 이상 무작위 (바꾸면 미사용 인증 코드 무효)                                                                                |
| `TOTP_ENCRYPTION_KEY`                      | 필수           | 32자 이상 무작위 (2단계 인증 키 암호화용, 바꾸면 켜 둔 2단계 인증이 모두 확인 불가가 되므로 정해진 뒤에는 유지·백업)           |
| `OAUTH_COOKIE_SECRET`                      | 필수           | 32자 이상 무작위                                                                                                               |
| `KAKAO_*`·`NAVER_*`·`GOOGLE_*` (ID·시크릿) | 선택           | 앱 등록 후 채움. 쌍이 없으면 해당 로그인 꺼짐                                                                                  |

### 운영자·점검 작업만 쓰는 값 (api 서버에는 넣지 않음)

| 변수                                                  | 용도                                        | 둘 곳                      |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------- |
| `DATABASE_OPERATOR_URL`                               | `pnpm operator`로 회사·초대 발급, 계정 복구 | 운영자 PC                  |
| `DATABASE_PURGE_URL`                                  | `pnpm operator purge-due` 삭제·익명화       | 점검 작업(스케줄러) 환경   |
| `BACKUP_DIR`·`BACKUP_RETENTION_DAYS`·`BACKUP_PG_MODE` | 백업 위치·보관 기간·도구 방식               | 점검 작업 환경 (모두 선택) |

운영자 DB 접속은 공개 인터넷에 DB를 열지 않는 방식(공급자의 사설 연결·SSH 터널·허용 IP 제한 중 택일)으로 한다. 어느 방식을 쓸지는 DB 공급자 결정 뒤에 정한다

### 웹

웹 빌드는 비밀 값이 없다. `VITE_*` 변수를 쓰지 않으며 API 주소는 같은 도메인의 `/api`

## 3. 처음 배포할 때 순서 (요약, 상세 확인 항목은 §4)

1. DB 생성 후 마이그레이션 이미지(§5.1)로 `db:setup`을 실행해 마이그레이션 적용과 앱·전용 계정 비밀번호 설정
2. 객체 저장소 버킷 생성과 CORS 설정
3. api 환경 변수 주입 후 기동, 헬스 체크 확인
4. `pnpm operator`로 첫 회사·관리자 초대 링크 발급
5. 점검 작업 3개 등록 (`ops/crontab.example`), 백업 복구 시험 1회 실행
6. 메일 발송 실제 수신 확인, 소셜 앱 등록 후 로그인 확인
7. 처리방침 `pendingItems` 채우고 약관 버전 올림

## 4. 운영 이행 체크리스트

### 4.1 배포 전 (사용자 준비와 확인)

- [ ] §1 표의 "미정" 항목 결정 (호스팅·DB·객체 저장소·메일·도메인)과 계정 가입
- [ ] DB의 소유 계정이 `CREATE ROLE`을 할 수 있어야 한다. 마이그레이션이 앱·전용 계정 5개(`field_note_app`·`auth`·`operator`·`queue`·`purge`)를 만들기 때문이다 (관리형 DB의 기본 관리자 계정이면 대개 가능)
- [ ] 비밀 값은 배포 환경의 비밀 저장소에 직접 생성해 넣는다 (`pnpm env:init`은 로컬 전용). `CODE_HASH_SECRET`·`OAUTH_COOKIE_SECRET`·`TOTP_ENCRYPTION_KEY`는 32자 이상 무작위
- [ ] 이미지(또는 실행 환경)에 `tsx`와 `prisma` CLI가 있어야 한다. 현재 두 패키지가 devDependencies이고 `start`·`db:setup`이 `tsx`로 실행되므로 개발 의존성을 포함해 설치하거나 0.11.0에서 빌드 방식을 정한다
- [ ] 객체 저장소 버킷은 공개하지 않고, CORS에 웹 주소의 PUT·GET·HEAD와 `Content-Type` 헤더를 허용
- [ ] 메일 발신 도메인 SPF·DKIM 설정과 발신 주소 인증
- [ ] 소셜 로그인은 각 콘솔에 리다이렉트 `{APP_ORIGIN}/api/v1/auth/{kakao|naver|google}/callback`을 등록한 뒤 ID·시크릿을 채운다 (이 쌍이 없으면 그 제공자 로그인은 운영에서 꺼진다)
- [ ] 이전 배포가 있다면 DB 백업을 먼저 만든다 (`pnpm backup create`). 마이그레이션은 앞으로만 간다

### 4.2 배포 직후 확인

- [ ] `GET /api/v1/health`가 200 (서버 기동 검사: 로컬 주소·기본 비밀번호·http 주소·debug 로그가 있으면 기동 자체가 멈춘다)
- [ ] `/api/docs`가 404 (운영에서는 API 문서 화면을 열지 않는다)
- [ ] 응답 헤더에 `X-Content-Type-Options: nosniff`·`X-Frame-Options: DENY`·`Referrer-Policy: no-referrer`, 세션 쿠키에 `HttpOnly; Secure; SameSite=Lax`
- [ ] 서로 다른 두 곳(예: 사무실·휴대폰 데이터)에서 접속해 한쪽의 로그인 실패가 다른 쪽을 막지 않는다 (`TRUST_PROXY_HOPS` 확인). 로그인 기기 목록에 실제 접속 IP가 보여야 한다
- [ ] 첫 회사·관리자 초대 링크 발급(`pnpm operator`) → 가입 → 로그인 → 비밀번호 재설정 메일이 실제로 도착
- [ ] 사진·문서 업로드(브라우저가 버킷에 직접 PUT)와 내려받기, 업로드 후 검사 통과·썸네일 생성
- [ ] 월 공수 엑셀·회사 전체 데이터 내려받기가 앞단 제한 시간 안에 끝난다 (L-5 기준 3년치 약 7초)
- [ ] 점검 작업 3개 등록 (`ops/crontab.example`)과 `pnpm backup drill` 1회 성공
- [ ] 처리방침 `pendingItems`(수탁·위탁·국외 이전)를 채우고 약관 버전을 올린다

### 4.3 되돌리기

- 애플리케이션은 이전 이미지로 되돌린다. 데이터 구조(마이그레이션)는 되돌리는 명령이 없다. 이미 적용한 마이그레이션 파일은 고치지 않고, 문제가 있으면 새 마이그레이션으로 고치거나 배포 전 백업으로 복구한다
- 복구 절차와 시험은 `docs/05-backup-restore.md`

### 4.4 정기 점검

- 매주 `pnpm backup drill` 결과 확인 (실패하면 종료 코드가 0이 아님)
- 비밀 값을 바꾸면 영향이 있다: `CODE_HASH_SECRET`은 발송된 미사용 인증 코드가 무효가 되고, `TOTP_ENCRYPTION_KEY`는 켜 둔 2단계 인증이 확인 불가가 되어 해당 사용자는 복구 링크로만 들어올 수 있고, `OAUTH_COOKIE_SECRET`은 진행 중인 소셜 로그인이 실패한다. 객체 저장소 키는 새 키를 먼저 발급해 교체한 뒤 이전 키를 지운다
- 의존성 취약점은 CI의 `pnpm audit --prod`가 매 PR에서 확인

## 5. 0.11.0에서 정리한 배포 준비

### 5.1 API 실행 이미지

`apps/api/Dockerfile`이 서버 이미지와 마이그레이션 이미지를 만든다. 저장소 루트에서 빌드한다.

```bash
docker build -f apps/api/Dockerfile -t field-note-api .                      # 서버 (기본)
docker build -f apps/api/Dockerfile --target migrate -t field-note-migrate . # DB 마이그레이션 작업
```

- **서버 이미지**: `node:24-bookworm-slim`, 운영 의존성만 설치(`prisma` CLI·테스트 도구 없음), 일반 사용자(`node`)로 실행, 소스를 `tsx`로 바로 실행한다. 컴파일 단계가 없고 `tsx`는 운영 의존성이다. Prisma 클라이언트(`src/generated`)는 저장소에 없어 이미지를 만들 때 생성한다
- **헬스 체크**: 이미지에 `HEALTHCHECK`가 있고 `/api/v1/health`를 본다. 호스팅의 헬스 체크 경로도 같은 값(`/api/v1/health`)으로 지정한다. 기동 중 DB 연결이나 환경 변수가 잘못되면 프로세스가 바로 종료한다
- **종료**: `node`가 PID 1이라 종료 신호(SIGTERM)를 받으면 바로 정리하고 끝난다 (로컬 확인: 약 0.6초, 종료 코드 0)
- **마이그레이션 이미지**: `prisma` CLI를 포함하고 기본 명령이 `db:setup`이다. 배포 때 소유 계정(`DATABASE_MIGRATE_URL`)과 계정 비밀번호용 접속 값(`DATABASE_URL`·`DATABASE_AUTH_URL`·`DATABASE_OPERATOR_URL`·`DATABASE_QUEUE_URL`·`DATABASE_PURGE_URL`)을 넣어 한 번 실행한다. 서버 이미지에는 소유 계정 접속 값을 넣지 않는다
- **빌드 검사**: CI의 `image` 작업이 두 이미지가 빌드되는지 확인한다 (배포는 하지 않음)
- **로컬 확인한 것**: 서버 이미지를 띄워 헬스 체크가 healthy가 되고, 로그인(argon2)이 동작하며, `NODE_ENV=production`에서 로컬 주소·http 주소 같은 값은 기동을 거부함을 확인했다. 마이그레이션 이미지는 로컬 DB에 실행해 "적용할 마이그레이션 없음"과 계정 비밀번호 설정까지 확인했다
- **점검 작업의 백업 도구**: `pnpm backup`은 PostgreSQL 클라이언트 도구(`pg_dump` 등)가 있어야 하고, DB 서버와 같은 주 버전이어야 한다. 이 이미지에는 넣지 않았다. 관리형 DB의 자동 백업을 쓰거나 도구가 있는 곳에서 실행하는 방식은 공급자에 따라 정한다

### 5.2 웹 응답 헤더 정책 (정적 호스팅·CDN에 설정)

API 응답에는 `X-Content-Type-Options`·`X-Frame-Options`·`Referrer-Policy`가 이미 붙는다. 정적 파일(`apps/web/dist`)을 내려주는 쪽에는 아래를 설정한다.

| 헤더                        | 값                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `STORAGE_ORIGIN=https://버킷주소 node scripts/csp-header.mjs`가 출력하는 값 (아래)                                                    |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (HTTPS가 확실히 동작한 뒤에 켠다. `preload`는 쓰지 않음)                                        |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                             |
| `Referrer-Policy`           | `no-referrer`                                                                                                                         |
| 캐시                        | `index.html`·`sw.js`·`manifest.webmanifest`는 `no-cache`, `assets/`는 `public, max-age=31536000, immutable` (파일 이름에 해시가 붙음) |

**CSP**

- `scripts/csp-header.mjs`는 `dist/index.html`의 인라인 스크립트(첫 화면 테마 적용)의 해시를 계산해 허용 목록에 넣는다. 빌드마다 다시 실행해 헤더 값을 갱신해야 한다
- 정책 요약: 스크립트는 같은 출처와 위 해시만, 이미지는 `data:`(2단계 인증 QR)·`blob:`(사진 압축·미리보기)·객체 저장소, 연결(`connect-src`)은 같은 출처와 객체 저장소(브라우저가 저장소로 직접 올림·내려받음), `object-src 'none'`, `frame-ancestors 'none'`. `style-src`는 화면 라이브러리가 요소의 `style` 속성을 쓰므로 `'unsafe-inline'`을 허용한다 (스크립트는 허용하지 않음)
- **`STORAGE_ORIGIN`은 사진·문서의 서명 주소가 가리키는 출처**와 같아야 한다 (예: `https://버킷.s3.리전.amazonaws.com`). 공급자를 정한 뒤 실제 주소로 확인한다. 다르면 사진·문서가 안 보이거나 올라가지 않는다
- **확인한 방법**: 빌드한 웹을 위 정책을 **강제**하는 서버로 내려주고 `/api`를 API로 전달해, Playwright e2e 11개 전체(사진·문서 올리기와 내려받기, 엑셀 내려받기, 2단계 인증 QR 포함)를 통과시키고 주요 화면을 둘러보며 위반 보고가 0건임을 확인했다
- 이 확인에서 zod의 `Function()` 시험이 위반 보고를 남기는 것을 찾았다. 기능에는 영향이 없었지만 콘솔 오류와 보고가 쌓이므로 브라우저에서만 이 시험을 끄도록 했다 (`packages/shared/src/zodBrowserConfig.ts`). `unsafe-eval`은 허용하지 않는다
- 처음에는 `Content-Security-Policy-Report-Only`로 켜서 위반 보고를 확인한 뒤 강제로 바꾸는 방식을 권한다 (실제 도메인·저장소 주소는 로컬과 다름)

## 6. 0.12.0 스테이징으로 넘기는 항목

공급자가 정해져야 처리할 수 있는 일이다

- 헤더 정책 적용: 선택한 호스팅·CDN에 §5.2의 헤더를 설정하고 실제 저장소 주소로 CSP 확인
- 앞단 요청 제한: 로그인 후 경로에는 요청 횟수 제한이 없으므로 WAF 등에서 정한다
- 회사 전체 데이터 내려받기 응답 시간: 데이터가 지금 규모의 5배쯤이면 앞단 기본 응답 대기(30초)를 넘으므로 대기 시간 상향 또는 작업 큐 방식 결정
- 직원 작업 이력의 기간 제한 (몇 년 더 쌓이면)
- 점검 작업(백업·삭제·복구 시험)을 돌릴 위치와 PostgreSQL 클라이언트 도구 준비
- 처리방침 `pendingItems`(보호책임자·수탁·위탁·국외 이전)와 약관 `pendingItems` 채우기

## 7. 아직 사용자 결정이 필요한 것

- 호스팅·DB·객체 저장소·메일 공급자 (§1 표의 "미정")
- 운영자 DB 접속 방식 (§2)
- 도메인
