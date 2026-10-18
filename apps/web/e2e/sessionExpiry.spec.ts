import { expect, test } from '@playwright/test';

import { DEMO_LOGIN, login } from './helpers';

test('쓰던 중 로그인이 끝나면 안내와 함께 로그인 화면으로 가고, 다시 로그인하면 보던 화면으로 돌아온다', async ({
  page,
  context,
}) => {
  await login(page);

  // 화면이 아직 데이터를 받는 중이면 그 요청이 먼저 만료를 만나므로 조용해진 뒤에 진행
  await page.waitForLoadState('networkidle');

  // 다른 기기에서 로그아웃했거나 세션이 만료된 상황: 브라우저의 로그인 쿠키가 사라짐
  await context.clearCookies();
  await page
    .getByRole('navigation', { name: '하단 메뉴' })
    .getByRole('link', { name: '직원' })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('로그인이 끝났습니다')).toBeVisible();

  await page.getByLabel('아이디').fill(DEMO_LOGIN.loginId);
  await page.getByLabel('비밀번호', { exact: true }).fill(DEMO_LOGIN.password);
  await page
    .getByRole('button', { name: /로그인/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/employees$/);
});

test('연결이 끊기면 안내 띠가 보이고 연결되면 사라진다', async ({ page, context }) => {
  await login(page);

  await context.setOffline(true);
  await expect(page.getByText('인터넷에 연결되어 있지 않습니다')).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('인터넷에 연결되어 있지 않습니다')).toBeHidden();
});
