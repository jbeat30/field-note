# API 문서와 Postman 사용법

API를 읽고, 호출해 보고, 문서를 갱신하는 방법만 적는다.

## 1. 문서가 만들어지는 과정

```
라우트 정의(apps/api/src/routes/*.ts)
  → pnpm openapi:generate
  → packages/shared/openapi/openapi.json   (API 계약의 원본)
  → packages/shared/openapi/schema.d.ts    (웹이 쓰는 타입)
  → pnpm postman:generate → postman/       (Postman 컬렉션·환경)
```

- 손으로 고치는 파일은 라우트 정의뿐이다. `openapi.json`·`schema.d.ts`·`postman/`은 생성물이라 직접 고치지 않는다
- 라우트를 바꾸고 `pnpm openapi:generate`를 안 돌리면 `pnpm test`(OpenAPI 계약 시험)와 CI가 실패한다. `pnpm openapi:check`로 최신인지만 확인할 수 있다

## 2. API 문서(Swagger) 보기

| 방법             | 주소·명령                                      | 호출(Try it out) |
| ---------------- | ---------------------------------------------- | ---------------- |
| 로컬 서버 (권장) | `pnpm dev` 후 `http://localhost:5173/api/docs` | 된다             |
| 로컬 api 직접    | `http://localhost:3000/api/docs`               | 읽기만 된다      |
| 서버 없이 파일로 | `openapi.json`을 Swagger Editor에 붙여 넣기    | 안 된다          |

- 로컬 데이터는 `pnpm infra:up`, `pnpm db:reset`으로 만든 시드 데이터다 (계정은 README 참고)
- `5173`으로 열어야 호출이 되는 이유: 상태를 바꾸는 요청은 서버가 `Origin`이 웹 주소(`http://localhost:5173`)와 같은지 검사한다. `3000`에서 열면 `Origin`이 달라 막힌다
- 호출 순서: 문서에서 `로그인·가입 > 아이디 로그인`을 먼저 실행하면 세션 쿠키가 브라우저에 저장되고, 이후 요청에 자동으로 실린다. `POST/PUT/PATCH/DELETE`에는 `X-Field-Note-Client: web` 헤더가 필요하다 (문서 상단 설명에 있다)
- **운영 서버는 문서 화면을 열지 않는다** (`/api/docs`가 404). 엔드포인트 목록이 공격에 쓰일 수 있어서다. `NODE_ENV=development`일 때만 켜진다
- 운영 API를 확인해야 하면 로컬 문서에 운영 주소를 더하지 않는다 (쿠키·Origin 검사 때문에 막히고, 보안을 느슨하게 풀지 않는다). 아래 Postman 운영 환경을 쓴다

## 3. 새 엔드포인트에 설명 달기

라우트를 등록할 때 이 값이 문서가 된다 (`apps/api/src/http/route.ts`의 `RouteSpec`).

| 값              | 규칙                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| `summary`       | 한 줄 한국어 설명. 비우지 않는다                                            |
| `auth`          | 로그인이 필요하면 `'required'`                                              |
| `request`       | `params`·`query`·`body`를 zod 스키마로. 필드 문구는 스키마에서 나온다       |
| `errors`        | 이 호출이 돌려줄 수 있는 오류 코드. 문서의 오류 응답 칸이 된다              |
| `idempotent`    | 재시도에 안전해야 하면 `true` (`Idempotency-Key` 헤더 요구)                 |
| 태그(문서 묶음) | 주소의 첫 마디로 자동. 새 첫 마디면 `openapi.ts`의 `TAG_LABELS`에 이름 추가 |

작성 후 `pnpm openapi:generate`를 실행하고 변경된 `openapi.json`·`schema.d.ts`를 함께 커밋한다.

## 4. Postman

컬렉션은 하나, 환경은 로컬·운영 둘이다. 모두 **Personal 작업 공간**에만 두고 공유하지 않는다.

### 가져오기

1. `pnpm postman:generate` → `postman/` 폴더에 파일 3개가 생긴다
   - `field-note.postman_collection.json` (요청 전체, 도메인별 폴더)
   - `field-note-local.postman_environment.json`, `field-note-prod.postman_environment.json`
2. Postman의 **Import**로 3개를 가져온다. 환경 두 개는 Postman MCP로 이미 Personal 작업 공간에 만들어 두었으니 중복되면 컬렉션만 가져오면 된다
3. 오른쪽 위에서 `field-note-local` 또는 `field-note-prod`를 고른다

### 환경 값

| 변수        | 로컬                    | 운영                     |
| ----------- | ----------------------- | ------------------------ |
| `baseUrl`   | `http://localhost:3000` | `https://<SITE_ADDRESS>` |
| `appOrigin` | `http://localhost:5173` | `baseUrl`과 같은 주소    |
| `loginId`   | (secret) 로그인 아이디  | (secret) 로그인 아이디   |
| `password`  | (secret) 비밀번호       | (secret) 비밀번호        |

- `loginId`·`password`는 **secret 변수**다. 값은 Postman 안에서만 입력하고 저장소·채팅·스크린샷에 남기지 않는다
- 운영 `baseUrl`·`appOrigin`은 서버 `.env`의 `SITE_ADDRESS` 값으로 바꾼다

### 호출 순서

1. `로그인·가입 > POST /auth/login`을 보낸다 → 세션 쿠키(`sid`)가 Postman 쿠키 저장소에 저장된다
2. 이후 요청을 보낸다. 상태를 바꾸는 요청에는 `X-Field-Note-Client`와 `Origin`이 컬렉션 사전 요청 스크립트로 자동으로 실린다
3. 경로 값(`:id` 등)은 요청의 **Path Variables**에 채운다. 필수 본문 항목은 각 요청 설명에 적혀 있고, 본문 값은 예시이므로 바꿔서 보낸다
4. 2단계 인증을 쓰는 계정은 로그인 본문에 `totpCode`를 더한다

### 운영 환경에서 지킬 것

- 데이터를 바꾸는 요청은 설명 첫 줄에 경고가 있다. 운영에서는 조회(`GET`) 위주로 쓰고, 변경 요청은 무엇이 바뀌는지 확인한 뒤 보낸다
- 시연·점검용 계정으로 먼저 시험하고, 실제 고객 데이터를 지우는 요청은 보내지 않는다
- 운영 `Origin` 검사는 느슨하게 풀지 않는다. 막히면 `appOrigin`이 `SITE_ADDRESS`와 같은지 확인한다

### 갱신

API가 바뀌면 `pnpm openapi:generate` → `pnpm postman:generate`를 실행하고 컬렉션을 다시 가져온다 (같은 이름이면 덮어쓰기를 고른다).

### Postman MCP로 작업 공간 다루기

- Claude Code에서 `/mcp`로 Postman 플러그인을 인증하면 환경·컬렉션을 조회·생성할 수 있다
- 만들기 전에 대상이 Personal 작업 공간(`visibility: personal`)인지 먼저 확인한다. 팀·공개 작업 공간에는 만들지 않는다
- 컬렉션 파일이 커서(약 220KB) MCP로 한 번에 올리지 않고 위의 Import를 쓴다
- Postman API 키는 본인 PC의 환경 변수에만 두고 저장소·채팅에 남기지 않는다
