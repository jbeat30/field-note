import { expect, test } from '@playwright/test';

import { DEMO_LOGIN, login } from './helpers';

// 5단계 흐름: 설정의 저장 용량 현황과 해지 전 전체 데이터 내려받기
test('설정에서 저장 용량을 보고 전체 데이터를 엑셀로 내려받는다', async ({ page }) => {
  await login(page);
  await page.goto('/settings?tab=company');

  await test.step('저장 용량 현황이 보인다', async () => {
    await expect(page.getByRole('heading', { name: '저장 용량' })).toBeVisible();
  });

  await test.step('현재 비밀번호를 넣고 전체 데이터를 내려받으면 엑셀 파일이 받아진다', async () => {
    await page.getByLabel('현재 비밀번호').last().fill(DEMO_LOGIN.password);

    const download = page.waitForEvent('download');

    await page.getByRole('button', { name: '전체 데이터 내려받기' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await expect(page.getByText(/파일을 내려받았습니다/)).toBeVisible();
  });
});
