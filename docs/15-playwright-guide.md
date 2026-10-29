# Playwright 가이드 (화면 전체 흐름 시험)

실제 서버, DB, 저장소와 Chromium(휴대폰 크기)으로 **반복해서 지켜야 하는 핵심 흐름**만 확인한다. 모든 화면을 여기서 시험하지 않는다 (화면 동작은 Storybook, 로직은 Jest).

## 1. 실행

```bash
pnpm infra:up && pnpm db:setup && pnpm db:seed   # 처음 한 번 (또는 pnpm db:reset)
pnpm --filter @field-note/web exec playwright install chromium   # 처음 한 번

pnpm e2e                                          # 전체
pnpm --filter @field-note/web exec playwright test coreFlow       # 파일 하나
pnpm --filter @field-note/web exec playwright test -g "로그인"     # 이름으로 골라서
pnpm --filter @field-note/web exec playwright test --headed       # 브라우저를 보면서
pnpm --filter @field-note/web exec playwright test --ui           # 단계별로 눌러 보며 디버깅
```

- 시험용 api는 3001번, 웹은 5173번으로 자동으로 뜬다 (이미 떠 있으면 그대로 쓴다). 포트는 `E2E_API_PORT`, `E2E_WEB_PORT`로 바꾼다
- 시험은 한 개씩 순서대로 돌아간다 (같은 회사 데이터를 함께 쓰므로 병렬 실행 안 함)
- 실패하면 `apps/web/test-results/`에 스크린샷, trace가 남는다. `npx playwright show-trace <trace.zip>`으로 연다

## 2. 언제 Playwright로 쓰나

| 쓴다                                            | 안 쓴다 (다른 도구로)                                  |
| ----------------------------------------------- | ------------------------------------------------------ |
| 로그인→작성→저장→목록 확인 같은 핵심 흐름       | 한 화면 안의 입력 검증, 문구 → Storybook               |
| 실제 서버와 맞물려야 확인되는 것 (세션, 업로드) | 계산, 규칙 → Jest                                      |
| 휴대폰 화면에서 깨지는지 (스크롤, 가려짐)       | 모양을 이리저리 눌러 보는 디버깅 → chrome-devtools MCP |

## 3. 시험 하나 쓰기 (복사해서 고치기)

`apps/web/e2e/<이름>.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

import { login, uniqueName } from './helpers';

test('프로젝트 등록에서 빈 채로 저장하면 맨 위 오류 칸으로 이동한다', async ({ page }) => {
  await login(page); // 시드 계정 hanbit으로 로그인
  await page.goto('/projects/new');
  await page.getByRole('button', { name: '프로젝트 등록', exact: true }).click();

  await expect(page.getByLabel('프로젝트명')).toBeFocused();
  await expect(page.getByText('날짜를 입력해 주세요')).toHaveCount(3);
});
```

- 요소는 **역할, 라벨, 글자**로 찾는다 (`getByRole`, `getByLabel`, `getByText`). CSS 클래스, 순서로 찾지 않는다 (접근성도 같이 확인된다)
- 기다림은 `expect(...).toBeVisible()`처럼 **기대로** 쓴다. `waitForTimeout`은 로그인 제한처럼 정말 시간이 필요할 때만 쓴다
- 이전 시험 데이터와 섞이지 않게 이름은 `uniqueName('E2E 현장')`처럼 만든다 (같은 DB로 여러 번 돌려도 된다)

## 4. 쓸 수 있는 도우미 (`e2e/helpers.ts`)

| 이름                               | 용도                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| `login(page)`                      | 시드 계정으로 로그인 (요청 제한에 걸리면 기다렸다 다시 시도) |
| `uniqueName(prefix)`               | 겹치지 않는 이름                                             |
| `seoulDate(days)`                  | 서울 기준 오늘±일수 (YYYY-MM-DD)                             |
| `photoFile(name)`                  | 업로드용 작은 JPEG (`setInputFiles`에 넘김)                  |
| `selectByText(page, 라벨, 글자)`   | 선택 목록에서 글자가 들어 있는 항목 고르기                   |
| `createStartedProject(page, 이름)` | 진행 중 상태의 프로젝트를 만들어 시작점으로 씀               |

파일 업로드 예: `await page.getByLabel('사진 파일 선택').setInputFiles(photoFile('a.jpg'));`

## 5. 자주 나는 문제

| 증상                              | 원인, 해결                                                           |
| --------------------------------- | -------------------------------------------------------------------- |
| 로그인에서 "요청이 너무 많습니다" | 로그인은 1분 10회 제한. `login`이 기다렸다 재시도하니 그대로 둔다    |
| 시드 데이터가 없다고 나옴         | `pnpm db:reset`                                                      |
| 3000번 포트가 이미 사용 중        | 시험은 3001번을 쓴다. 다른 앱이 3001을 쓰면 `E2E_API_PORT` 변경      |
| 요소가 안 눌림 (가려짐)           | 휴대폰 크기(390×844)라서 생긴 실제 문제일 수 있음. 스크롤, 겹침 확인 |
| 로컬에서만/CI에서만 실패          | CI는 1회 재시도. trace로 느린 단계(기다림 부족)를 찾는다             |
