import { expect, test } from '@playwright/test';

import { login } from './helpers';

// 넓은 화면(데스크톱)에서 새 화면 틀의 핵심 동작: 사이드바 접기, 홈 머리의 검색, 프로젝트 머리
test.use({ viewport: { width: 1440, height: 900 } });

test('사이드바를 접고 펼 수 있고 접어도 현재 메뉴가 구분된다', async ({ page }) => {
  await login(page);

  const sidebar = page.locator('aside');
  const openedWidth = (await sidebar.boundingBox())?.width ?? 0;

  await page.getByRole('button', { name: '사이드바 접기' }).click();

  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBeLessThan(openedWidth);
  await expect(
    page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '대시보드' }),
  ).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: '사이드바 펼치기' }).click();

  await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBe(openedWidth);
});

test('홈 머리의 검색 알약으로 찾으면 검색 결과 화면으로 간다', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('heading', { name: /안녕하세요/ })).toBeVisible();
  await page.getByRole('searchbox', { name: '찾기' }).fill('판금');
  await page.getByRole('search').getByRole('button', { name: '찾기' }).click();

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole('heading', { name: '프로젝트', level: 2 })).toBeVisible();
});

test('프로젝트 목록 머리에서 등록 알약으로 등록 화면에 간다', async ({ page }) => {
  await login(page);
  await page.goto('/projects');

  await page.getByRole('link', { name: '프로젝트 등록' }).click();

  await expect(page).toHaveURL(/\/projects\/new$/);
  await expect(page.getByRole('heading', { name: '프로젝트 등록', level: 1 })).toBeVisible();
});
