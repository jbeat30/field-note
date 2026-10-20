import { expect, test } from '@playwright/test';

import { DEMO_LOGIN } from './helpers';

const signIn = async (page: import('@playwright/test').Page) => {
  await page.getByLabel('아이디').fill(DEMO_LOGIN.loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO_LOGIN.password);
  await page
    .getByRole('button', { name: /로그인/ })
    .first()
    .click();
};

test('로그인하지 않고 열었던 화면으로 로그인 뒤에 돌아온다', async ({ page }) => {
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page);

  await expect(page).toHaveURL(/\/employees$/);
});

test('주소에 넣은 이동 대상은 무시하고 홈으로 간다', async ({ page }) => {
  await page.goto('/login?next=https://evil.example&from=//evil.example&returnTo=/employees');
  await signIn(page);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: '한빛판금' })).toBeVisible();
});
