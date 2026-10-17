import { expect, test } from '@playwright/test';

import { login, seoulDate, selectByText, uniqueName } from './helpers';

// 4단계 흐름: 월 공수 확정·재오픈, 직원 서류 등록, 홈 확인 목록
// 같은 회사 데이터를 쓰는 다른 시험(오늘 작업 내역 저장)에 영향이 없도록 지난달을 확정하고 시험이 끝나면 되돌림
const PAST_MONTH = seoulDate(-31).slice(0, 7);
// 시드 직원 (정판금)
const EMPLOYEE_ID = '0198d000-0000-7000-8000-000000000101';

test('월 공수를 확정하고 재오픈하면 확정 상태가 바뀌고 이력이 남는다', async ({ page }) => {
  const reason = uniqueName('E2E 시험 뒤 되돌림');

  await login(page);
  await page.goto(`/monthly-hours?month=${PAST_MONTH}`);

  // 이전 시험이 중간에 멈춰 확정된 채 남았다면 먼저 되돌려 같은 출발 상태로 만듦
  const reopenForm = page.getByRole('form', { name: '재오픈' });

  if (await reopenForm.isVisible()) {
    await reopenForm.getByLabel('재오픈 사유 (필수)').fill('E2E 시작 전 정리');
    await reopenForm.getByRole('button', { name: /재오픈/ }).click();
    await expect(page.getByText('미확정')).toBeVisible();
  }

  await test.step('확정하면 확정됨으로 바뀐다', async () => {
    await page.getByRole('button', { name: `${PAST_MONTH} 공수 확정` }).click();

    // 임시 저장 작업 내역이 남은 달은 확인 체크가 필요함
    const draftCheck = page.getByLabel('임시 저장된 작업 내역이 남아 있어도 확정합니다');

    if (await draftCheck.isVisible()) {
      await draftCheck.check();
      await page.getByRole('button', { name: `${PAST_MONTH} 공수 확정` }).click();
    }

    await expect(page.getByText('확정됨')).toBeVisible();
  });

  await test.step('재오픈하면 사유와 함께 미확정으로 돌아간다', async () => {
    const form = page.getByRole('form', { name: '재오픈' });

    await form.getByLabel('재오픈 사유 (필수)').fill(reason);
    await form.getByRole('button', { name: /재오픈/ }).click();
    await expect(page.getByText('미확정')).toBeVisible();
    await expect(page.getByText(reason)).toBeVisible();
  });
});

test('직원 서류를 등록하면 목록에 나타난다', async ({ page }) => {
  const memo = uniqueName('E2E 서류 등록');

  await login(page);
  await page.goto(`/employees/${EMPLOYEE_ID}?tab=credentials`);

  await page.getByRole('button', { name: '서류 등록', exact: true }).click();

  const form = page.getByRole('form', { name: '서류 등록' });

  await selectByText(page, '서류 종류', '안전교육');
  await form.getByLabel('만료일 (선택)').fill(seoulDate(200));
  await form.getByLabel('메모 (선택)').fill(memo);
  await form.getByRole('button', { name: '서류 등록' }).click();
  await expect(page.getByText(memo)).toBeVisible();
});

test('홈의 확인할 일에서 알림 항목으로 바로 이동한다', async ({ page }) => {
  await login(page);

  const list = page.getByRole('region', { name: '확인할 일' });

  await expect(list.getByRole('listitem').first()).toBeVisible();
  await list.getByRole('link', { name: /이동$/ }).first().click();
  await expect(page).not.toHaveURL(/\/$/);
});
