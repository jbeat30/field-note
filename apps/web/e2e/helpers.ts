import { expect, type Page } from '@playwright/test';

// 시드 계정 (pnpm db:seed, 가상 정보)
export const DEMO_LOGIN = { loginId: 'hanbit', password: 'Hanbit-demo-2026!' };

/**
 * @description 서울 기준 날짜(YYYY-MM-DD)에 일수를 더함 (시험 데이터의 날짜를 오늘 기준으로 만들기 위해)
 * @param days 더할 일수 (음수면 과거)
 * @returns YYYY-MM-DD
 */
export const seoulDate = (days = 0) => {
  const base = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));

  base.setUTCDate(base.getUTCDate() + days);

  return base.toISOString().slice(0, 10);
};

// 로그인 요청은 1분에 10번까지라, 시험이 빠르게 이어지면 제한 안내가 뜰 수 있음 (제한이 풀릴 때까지 기다렸다가 다시 시도)
const LOGIN_RETRY_WAIT_MS = 15_000;
const LOGIN_MAX_ATTEMPTS = 6;

export const login = async (page: Page) => {
  for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt += 1) {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(DEMO_LOGIN.loginId);
    await page.getByLabel('비밀번호', { exact: true }).fill(DEMO_LOGIN.password);
    await page
      .getByRole('button', { name: /로그인/ })
      .first()
      .click();

    const home = page.getByRole('heading', { name: '한빛판금' });
    const limited = page.getByText('요청이 너무 많습니다');

    await expect(home.or(limited)).toBeVisible();

    if (await home.isVisible()) {
      return;
    }

    await page.waitForTimeout(LOGIN_RETRY_WAIT_MS);
  }

  throw new Error('[e2e.login] 요청 제한이 풀리지 않아 로그인하지 못함');
};

/**
 * @description 시험마다 겹치지 않는 이름 (같은 DB로 여러 번 돌려도 이전 시험 데이터와 섞이지 않게)
 * @param prefix 이름 앞부분
 * @returns 예: "E2E 현장 482913"
 */
export const uniqueName = (prefix: string) => `${prefix} ${String(Date.now()).slice(-6)}`;

// 작은 JPEG 사진 (96x72), 브라우저가 열어 압축·변환하고 서버가 내용을 검사하므로 실제로 열리는 이미지여야 함
export const PHOTO_JPEG = Buffer.from(
  '/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCABIAGADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCAIy+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z',
  'base64',
);

/**
 * @description 사진 입력 칸에 올릴 파일 (이름 앞부분을 달리해 여러 장을 구분)
 * @param name 파일 이름 (.jpg)
 * @returns Playwright가 받는 업로드 파일
 */
export const photoFile = (name: string) => ({ name, mimeType: 'image/jpeg', buffer: PHOTO_JPEG });

/**
 * @description 선택 목록에서 글자가 들어 있는 항목을 고름 (항목 이름 뒤에 직책이 붙는 경우 등)
 * @param page 화면
 * @param label 목록의 접근성 이름
 * @param text 고를 항목에 들어 있는 글자
 */
export const selectByText = async (page: Page, label: string, text: string | number) => {
  await page.getByLabel(label, { exact: true }).click();

  // 목록은 화면 맨 위(portal)에 열림, 숫자는 몇 번째 항목(0부터), 글자는 이름 앞부분이 일치하는 항목
  const option =
    typeof text === 'number'
      ? page.getByRole('option').nth(text)
      : page.getByRole('option', {
          name: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        });

  await expect(option.first(), `${label}에 '${text}' 항목이 있어야 함`).toBeVisible();
  await option.first().click();
};

/**
 * @description 프로젝트를 등록하고 작업 시작 상태로 바꿈 (화면에서 직접)
 * @param page 로그인된 화면
 * @param name 프로젝트명
 * @returns 만든 프로젝트 ID
 */
export const createStartedProject = async (page: Page, name: string) => {
  await page.goto('/projects/new');
  await page.getByLabel('프로젝트명').fill(name);
  await page.getByLabel('현장 이름').fill('E2E 현장');
  await selectByText(page, '고객', '가나다건설');
  await selectByText(page, '담당자', 0);
  await page.getByLabel('계약일').fill(seoulDate(-30));
  await page.getByLabel('시작 예정일').fill(seoulDate(-7));
  await page.getByLabel('종료 예정일').fill(seoulDate(60));
  await page.getByRole('button', { name: '프로젝트 등록' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();

  const projectId = page.url().split('/projects/')[1]!;

  await page.getByRole('link', { name: '현황', exact: true }).click();
  await page.getByRole('button', { name: '작업 시작' }).click();
  await page.getByLabel('실제 시작일').fill(seoulDate(-7));
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await expect(page.getByText('현재 상태').locator('xpath=following-sibling::dd[1]')).toHaveText(
    '진행',
  );

  return projectId;
};
