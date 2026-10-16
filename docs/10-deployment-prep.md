# 배포 준비 (0.9.1)

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

| 변수                                       | 필수      | 운영 값                                         |
| ------------------------------------------ | --------- | ----------------------------------------------- |
| `NODE_ENV`                                 | 필수      | `production`                                    |
| `PORT`                                     | 선택      | 호스팅이 지정하는 포트                          |
| `LOG_LEVEL`                                | 선택      | `info` 이상 (debug·trace 불가)                  |
| `APP_ORIGIN`                               | 필수      | 서비스 웹 주소 (https)                          |
| `DATABASE_URL`                             | 필수      | 앱 계정 `field_note_app` 접속 주소              |
| `DATABASE_AUTH_URL`                        | 필수      | 회사 범위 밖 전용 계정 `field_note_auth`        |
| `DATABASE_QUEUE_URL`                       | 필수      | 작업 큐 계정 `field_note_queue`                 |
| `DATABASE_MIGRATE_URL`                     | 필수      | 소유 계정 `field_note` (기동 검사에 필요)       |
| `S3_ENDPOINT`·`S3_REGION`·`S3_BUCKET`      | 필수      | 객체 저장소 공급자 값                           |
| `S3_ACCESS_KEY`·`S3_SECRET_KEY`            | 필수      | 버킷 전용 키 (접근 키 20자·비밀 키 40자 형식)   |
| `SMTP_HOST`·`SMTP_PORT`·`SMTP_FROM`        | 필수      | 메일 공급자 값, 발신 주소는 인증된 도메인       |
| `SMTP_USER`·`SMTP_PASSWORD`                | 운영 필수 | 메일 공급자 계정                                |
| `CODE_HASH_SECRET`                         | 필수      | 32자 이상 무작위 (바꾸면 미사용 인증 코드 무효) |
| `OAUTH_COOKIE_SECRET`                      | 필수      | 32자 이상 무작위                                |
| `KAKAO_*`·`NAVER_*`·`GOOGLE_*` (ID·시크릿) | 선택      | 앱 등록 후 채움. 쌍이 없으면 해당 로그인 꺼짐   |

### 운영자·점검 작업만 쓰는 값 (api 서버에는 넣지 않음)

| 변수                                                  | 용도                                        | 둘 곳                      |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------- |
| `DATABASE_OPERATOR_URL`                               | `pnpm operator`로 회사·초대 발급, 계정 복구 | 운영자 PC                  |
| `DATABASE_PURGE_URL`                                  | `pnpm operator purge-due` 삭제·익명화       | 점검 작업(스케줄러) 환경   |
| `BACKUP_DIR`·`BACKUP_RETENTION_DAYS`·`BACKUP_PG_MODE` | 백업 위치·보관 기간·도구 방식               | 점검 작업 환경 (모두 선택) |

운영자 DB 접속은 공개 인터넷에 DB를 열지 않는 방식(공급자의 사설 연결·SSH 터널·허용 IP 제한 중 택일)으로 한다. 어느 방식을 쓸지는 DB 공급자 결정 뒤에 정한다

### 웹

웹 빌드는 비밀 값이 없다. `VITE_*` 변수를 쓰지 않으며 API 주소는 같은 도메인의 `/api`

## 3. 처음 배포할 때 순서

1. DB 생성 후 `pnpm db:setup`으로 마이그레이션 적용과 앱·전용 계정 비밀번호 설정
2. 객체 저장소 버킷 생성과 CORS 설정
3. api 환경 변수 주입 후 기동, 헬스 체크 확인
4. `pnpm operator`로 첫 회사·관리자 초대 링크 발급
5. 점검 작업 3개 등록 (`ops/crontab.example`), 백업 복구 시험 1회 실행
6. 메일 발송 실제 수신 확인, 소셜 앱 등록 후 로그인 확인
7. 처리방침 `pendingItems` 채우고 약관 버전 올림

## 4. 아직 사용자 결정이 필요한 것

- 호스팅·DB·객체 저장소·메일 공급자 (§1 표의 "미정")
- 운영자 DB 접속 방식 (§2)
- 도메인
- 이월된 P4-8 TOTP 시점
