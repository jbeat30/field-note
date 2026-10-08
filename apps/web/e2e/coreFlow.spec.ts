import { expect, test } from '@playwright/test';

import { login, photoFile, seoulDate, selectByText, uniqueName } from './helpers';

// 핵심 흐름(기술 기획서 §13): 로그인 → 프로젝트 → 투입 → 일지 일괄 입력(공수·자재) → 사진 업로드 → 저장 → 작업일보
test('로그인부터 일지 저장·작업일보까지 핵심 흐름이 이어진다', async ({ page }) => {
  const projectName = uniqueName('E2E 판금 공사');
  // 자재 이름은 회사 안에서 겹칠 수 없으므로 시험마다 다르게 (같은 DB로 다시 돌려도 되게)
  const materialName = uniqueName('E2E 강판');
  const today = seoulDate();

  await login(page);

  await test.step('프로젝트 등록', async () => {
    await page.goto('/projects/new');
    await page.getByLabel('프로젝트명').fill(projectName);
    await page.getByLabel('현장 이름').fill('E2E 현장');
    await selectByText(page, '고객', '가나다건설');
    await page.getByLabel('담당자', { exact: true }).selectOption({ index: 1 });
    await page.getByLabel('계약일').fill(seoulDate(-30));
    await page.getByLabel('시작 예정일').fill(seoulDate(-7));
    await page.getByLabel('종료 예정일').fill(seoulDate(60));
    await page.getByRole('button', { name: '프로젝트 등록' }).click();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  });

  const projectId = page.url().split('/projects/')[1]!;

  await test.step('작업 시작으로 바꾸면 일지를 쓸 수 있게 된다', async () => {
    await page.getByRole('button', { name: '작업 시작' }).click();
    await page.getByLabel('실제 시작일').fill(seoulDate(-7));
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page.getByText('현재 상태').locator('xpath=following-sibling::dd[1]')).toHaveText(
      '진행',
    );
  });

  await test.step('직원 두 명을 투입', async () => {
    for (const name of ['정판금', '최설치']) {
      const form = page.getByRole('form', { name: '투입 등록' });

      await selectByText(page, '직원', name);
      await form.getByLabel('투입 시작일').fill(seoulDate(-7));
      await form.getByLabel('투입 종료일').fill(seoulDate(60));
      await form.getByRole('button', { name: '투입 등록' }).click();
      await expect(page.getByRole('list', { name: '투입 목록' }).getByText(name)).toBeVisible();
    }
  });

  await test.step('일지 일괄 입력: 투입 직원이 채워지고 작업 구분·공수·내용을 한 번에 정해 저장', async () => {
    await page.goto(`/work-logs?project=${projectId}&date=${today}`);
    await expect(page.getByRole('checkbox', { name: '정판금 출근' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: '최설치 출근' })).toBeChecked();

    await page.getByLabel('작업 구분 일괄 지정').selectOption({ label: '설치' });
    await page.getByRole('button', { name: '모두 적용' }).click();
    await page.getByLabel('작업 내용').fill('3층 외장 패널 설치');
    await page.getByLabel('작업 구역').fill('3층 301호');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByText(/저장했습니다 \(버전 1\)/)).toBeVisible();
  });

  await test.step('같은 화면에서 자재를 새로 만들어 반입·사용을 입력', async () => {
    await page.getByRole('button', { name: '새 자재' }).click();
    await page.getByLabel('자재명').fill(materialName);
    await page.getByRole('button', { name: '자재 추가하고 입력 행에 넣기' }).click();
    await page.getByLabel('구분', { exact: true }).selectOption({ label: '반입' });
    await page.getByLabel('수량').fill('100');
    await page.getByRole('button', { name: '자재 1건 저장' }).click();
    await expect(page.getByText('반입 100장')).toBeVisible();

    await page.getByRole('button', { name: materialName }).click();
    await page.getByLabel('수량').fill('12.5');
    await page.getByRole('button', { name: '자재 1건 저장' }).click();
    await expect(page.getByText('사용 12.5장')).toBeVisible();
  });

  await test.step('사진을 올리면 사진첩에 나타난다', async () => {
    await page.goto(`/projects/${projectId}/photos`);
    await page.getByLabel('구분', { exact: true }).selectOption({ label: '작업 후' });
    await page.getByLabel('구역 (선택)').fill('3층 301호');
    await page
      .getByLabel('사진 파일 선택')
      .setInputFiles([photoFile('e2e-1.jpg'), photoFile('e2e-2.jpg')]);
    await expect(page.getByText('2장을 모두 올렸습니다')).toBeVisible({ timeout: 60_000 });
    // 썸네일은 서버가 검사한 뒤 만들어지므로 나타날 때까지 기다림
    await expect(page.getByRole('button', { name: /작업 후.*사진 열기/ })).toHaveCount(2, {
      timeout: 30_000,
    });
  });

  await test.step('작업일보에 일지·공수·자재·사진이 모인다', async () => {
    await page.goto(`/projects/${projectId}/daily-report?date=${today}`);

    const report = page.getByRole('article', { name: '작업일보' });

    await expect(report.getByText('3층 외장 패널 설치')).toBeVisible();
    await expect(report.getByText('합계 (2명)')).toBeVisible();
    await expect(report.getByText(materialName, { exact: false }).first()).toBeVisible();
    await expect(report.getByText('12.5장')).toBeVisible();
    // 사진 검사가 끝나 썸네일이 실리면 이미지가 나타남
    await expect(report.locator('img')).toHaveCount(2, { timeout: 30_000 });
  });
});
