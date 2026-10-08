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

export const login = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(DEMO_LOGIN.loginId);
  await page.getByLabel('비밀번호').fill(DEMO_LOGIN.password);
  await page
    .getByRole('button', { name: /로그인/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: '한빛판금' })).toBeVisible();
};

/**
 * @description 시험마다 겹치지 않는 이름 (같은 DB로 여러 번 돌려도 이전 시험 데이터와 섞이지 않게)
 * @param prefix 이름 앞부분
 * @returns 예: "E2E 현장 482913"
 */
export const uniqueName = (prefix: string) => `${prefix} ${String(Date.now()).slice(-6)}`;

// 작은 JPEG 사진 (96x72). 브라우저가 열어 압축·변환하고 서버가 내용을 검사하므로 실제로 열리는 이미지여야 함
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
export const selectByText = async (page: Page, label: string, text: string) => {
  const select = page.getByLabel(label, { exact: true });
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value');

  expect(value, `${label}에 '${text}' 항목이 있어야 함`).toBeTruthy();
  await select.selectOption(value!);
};
