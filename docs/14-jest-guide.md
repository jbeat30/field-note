# Jest 가이드 (단위·API 시험)

로직을 검증하는 시험이다. 화면 모양과 동작은 Storybook(`docs/16-storybook-guide.md`), 화면 전체 흐름은 Playwright(`docs/15-playwright-guide.md`)가 맡는다.

## 1. 실행

```bash
pnpm test                                  # 전체 (API 시험은 Docker 필요)
pnpm exec jest packages/shared             # 폴더 하나
pnpm exec jest apps/api/src/routes/photoRoutes   # 파일 하나 (앞부분만 써도 됨)
pnpm exec jest apps/api -t "사진 등록"      # 시험 이름으로 골라서
pnpm exec jest --watch apps/web/src/photos # 저장할 때마다 다시 실행
```

- API 시험은 Docker Desktop이 켜져 있어야 한다 (실행 중 PostgreSQL 컨테이너를 한 번 띄워 모든 시험이 나눠 쓴다)
- Windows에서 `Failed to load native binding`이 나면 `export SWC_NATIVE_BINDING_CACHE=C:/Users/<이름>/.swc-cache` 후 다시 실행한다
- 느리면 `pnpm exec jest <경로>`로 필요한 파일만 돌리고, 마지막에 `pnpm test`로 전체를 한 번 확인한다

## 2. 어디에 무엇을 쓰나

| 위치              | 시험 대상                                      | 환경                   |
| ----------------- | ---------------------------------------------- | ---------------------- |
| `packages/shared` | 서버·웹이 함께 쓰는 순수 규칙 (날짜·집계·검증) | 순수 함수, 가장 빠름   |
| `apps/web`        | 목업 서버 계약, 대기열·초안 같은 화면 밖 로직  | Node + msw             |
| `apps/api`        | 서비스·라우트·DB 규칙, 회사 간 격리            | Node + 실제 PostgreSQL |

- 시험 파일은 코드 옆에 `이름.test.ts`로 둔다
- 규칙은 `packages/shared`의 순수 함수로 만들고 거기서 시험하는 것이 가장 쉽고 빠르다 (서버와 목업이 같은 규칙을 쓴다)
- 화면 동작(클릭·입력·문구)은 Jest가 아니라 Storybook 스토리로 시험한다

## 3. 순수 규칙 시험 (복사해서 고치기)

`packages/shared/src/<이름>.test.ts`:

```ts
import { isStagedExpired, FILE_STAGED_TTL_SECONDS } from './files';

const NOW = new Date('2026-10-22T03:00:00Z');
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe('isStagedExpired', () => {
  it('24시간이 지나면 만료다', () => {
    expect(isStagedExpired(ago(FILE_STAGED_TTL_SECONDS), NOW)).toBe(true);
  });

  it('그 전에는 만료가 아니다', () => {
    expect(isStagedExpired(ago(60), NOW)).toBe(false);
  });
});
```

- `describe`는 대상, `it`은 "~하면 ~다" 문장으로 쓴다
- 현재 시각은 `new Date()`를 직접 쓰지 말고 `NOW` 같은 고정 값을 함수 인자로 넘긴다 (함수가 `now`를 받도록 만들어 두면 시험이 쉽다)
- 경계 값(정확히 24시간, 하루 전/후), 빈 값, 깨진 입력을 꼭 하나씩 넣는다

## 4. API 라우트 시험 (복사해서 고치기)

기존 파일(예: `apps/api/src/routes/photoRoutes.test.ts`)의 `setup()`을 그대로 쓰는 것이 가장 빠르다. 새 파일이 필요하면 그 파일의 `harness`·`signedUp`·`setup` 세 함수를 복사한다.

```ts
it('검사를 마친 파일은 폼에 연결되기 전까지 임시 보관이다', async () => {
  const s = await setup(); // 회사·프로젝트·로그인까지 준비
  const fileId = await s.photoFile(); // 업로드와 검사 통과까지

  expect((await s.get(`/files/${fileId}`)).body.status).toBe('STAGED');
  expect((await s.post(`/projects/${s.projectId}/photos`, { fileId })).status).toBe(201);
});
```

- 시험마다 `setup()`으로 새 회사를 만들므로 시험끼리 데이터가 섞이지 않는다
- DB를 직접 고쳐야 하면 `db.owner`(소유 계정)를 쓴다. 키가 복합이면 `update` 대신 `updateMany({ where: { id } })`
- 시간이 필요한 시험은 서비스에 `now: () => NOW`를 넘겨 고정한다. 이미 DB에 기록된 시각(`createdAt`)을 과거로 바꿀 때는 `db.owner`로 수정한다
- 저장소(R2/RustFS)는 `createMemoryStorage()`, 작업 큐는 `createMemoryQueue()`로 대체한다 (처리기를 등록하면 보낸 작업을 바로 실행)

## 5. 새 엔드포인트를 만들 때 꼭 하는 것

1. 라우트 시험: 정상, 입력 오류, 로그인 없음(401), 없는 자료(404)
2. **회사 격리 시험**: `apps/api/src/routes/isolationEndpoints.test.ts`의 목록에 한 줄 추가한다. 목록에 없으면 "모든 엔드포인트는 격리 시험 목록에 있다" 시험이 실패한다
3. `pnpm openapi:generate` 후 `openapi.json`·`schema.d.ts`를 함께 커밋한다 (안 하면 계약 시험이 실패)

## 6. 자주 나는 문제

| 증상                                           | 원인·해결                                                       |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `Could not find a working container runtime`   | Docker Desktop이 꺼져 있음. 켜고 다시 실행                      |
| `Failed to load native binding` (swc)          | `SWC_NATIVE_BINDING_CACHE` 설정 (위 1번)                        |
| `shared DB가 없음`                             | `jest`를 직접 쓰지 말고 루트에서 `pnpm test`나 `pnpm exec jest` |
| 시험이 가끔만 실패                             | 고정되지 않은 시각·순서·다른 시험의 데이터에 기대고 있음        |
| 새 엔드포인트인데 "격리 시험 목록" 시험이 실패 | 5번의 2번을 안 함                                               |
