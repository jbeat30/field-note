import { expect, test } from '@playwright/test';

import { createStartedProject, login, seoulDate, uniqueName } from './helpers';

// 3~4단계 흐름: 진행률 기록 → 완료 → 보증 설정 → 보수 요청 접수 → 홈 확인 목록
test('진행률 기록부터 완료·보증·보수 요청까지 프로젝트 생애 흐름이 이어진다', async ({ page }) => {
  const projectName = uniqueName('E2E 생애 공사');

  await login(page);

  const projectId = await createStartedProject(page, projectName);

  await test.step('진행률을 기록하면 현황의 진행률이 바뀐다', async () => {
    await page.goto(`/projects/${projectId}/overview`);
    await page.getByRole('button', { name: '진행률 바꾸기' }).click();
    await page.getByRole('button', { name: '50%', exact: true }).click();
    await page.getByRole('button', { name: '진행률 기록' }).click();
    await expect(
      page.getByText('진행률', { exact: true }).locator('xpath=following-sibling::dd[1]'),
    ).toContainText('50');
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

  await test.step('보증을 설정하면 보증 기간이 정해진다', async () => {
    await page.goto(`/projects/${projectId}/warranty`);

    const form = page.getByRole('form', { name: '보증 설정' });

    await form.getByLabel('보증 기간 (개월)').fill('12');
    await form.getByRole('button', { name: '보증 설정 저장' }).click();
    await expect(page.getByText('보증 설정을 저장했습니다')).toBeVisible();
  });

  await test.step('보증 시작으로 바꾸면 보증 중 상태가 된다', async () => {
    await page.goto(`/projects/${projectId}/overview`);
    await page.getByRole('button', { name: '보증 시작' }).click();

    const form = page.getByRole('form', { name: '보증 시작 확인' });

    await form.getByLabel('보증 시작일').fill(seoulDate(0));
    await form.getByLabel('프로젝트 요약을 확인했습니다').check();
    await form.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page.getByText('현재 상태').locator('xpath=following-sibling::dd[1]')).toHaveText(
      '보증 중',
    );
  });

  await test.step('보수 요청을 접수하면 목록에 나타난다', async () => {
    await page.goto(`/projects/${projectId}/repairs`);

    const form = page.getByRole('form', { name: '보수 요청 접수' });

    await form.getByLabel('요청자').fill('E2E 관리사무소');
    await form.getByLabel('요청 내용').fill('E2E 외장 패널 틈새 누수');
    await form.getByRole('button', { name: '접수하기' }).click();
    await expect(page.getByText('E2E 외장 패널 틈새 누수')).toBeVisible();
  });
});
