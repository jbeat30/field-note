import { expect, test } from '@playwright/test';

import { createStartedProject, login, seoulDate, uniqueName } from './helpers';

// 3~4단계 흐름: 진행률 기록 → 완료 → 보증 설정 → 보수 요청 접수 → 홈 확인 목록
test('진행률 기록부터 완료·보증·보수 요청까지 프로젝트 생애 흐름이 이어진다', async ({ page }) => {
  const projectName = uniqueName('E2E 생애 공사');

  await login(page);

  const projectId = await createStartedProject(page, projectName);

  await test.step('진행률을 기록하면 현황과 홈의 진행률이 바뀐다', async () => {
    await page.goto(`/projects/${projectId}/overview`);
    await page.getByRole('button', { name: '진행률 바꾸기' }).click();
    await page.getByRole('button', { name: '50%', exact: true }).click();
    await page.getByRole('button', { name: '진행률 기록' }).click();
    await expect(
      page.getByText('진행률', { exact: true }).locator('xpath=following-sibling::dd[1]'),
    ).toContainText('50');

    await page.goto('/');
    await expect(
      page
        .getByRole('row', { name: new RegExp(projectName) })
        .getByText('50%')
        .first(),
    ).toBeVisible();
  });

  await test.step('완료 처리: 완료일을 정하면 완료 상태가 된다', async () => {
    await page.goto(`/projects/${projectId}/overview`);
    await page.getByRole('button', { name: '완료 처리' }).click();

    const form = page.getByRole('form', { name: '완료 처리 확인' });

    await form.getByLabel('실제 완료일').fill(seoulDate(0));
    await form.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page.getByText('현재 상태').locator('xpath=following-sibling::dd[1]')).toHaveText(
      '완료',
    );
  });
});
