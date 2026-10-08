import { expect, test, type Page } from '@playwright/test';

import { login, photoFile, seoulDate, uniqueName } from './helpers';

// 하루 일지 입력 3분 목표(서비스 기획서 §14, P2-9): 직원 공수 → 작업 내용 → 자재 → 사진을 모바일 크기에서 끝내는 데 걸리는 시간을 잰다.
// 사람이 아니라 스크립트가 하므로 사람의 속도를 흉내 낸다: 화면을 누르거나 고르기 전 0.8초 생각하고, 글자는 한 자에 0.2초(분당 300자)로 치고,
// 휴대폰의 사진 고르기 창에 걸리는 시간을 5초로 본다. 실제 사람의 시간은 실사용 시험에서 다시 잰다.
const GOAL_SECONDS = 180;
const THINK_MS = 800;
const TYPE_MS_PER_CHAR = 200;
const PHOTO_PICKER_MS = 5000;

const WORK_NOTE = '3층 외장 패널 설치, 창호 주변 코킹 마감';

type Stopwatch = { taps: number; typedChars: number };

const createUser = (page: Page, watch: Stopwatch) => ({
  // 누르기·고르기 한 번 (생각 시간 포함)
  tap: async (action: () => Promise<unknown>) => {
    await page.waitForTimeout(THINK_MS);
    await action();
    watch.taps += 1;
  },
  // 글자 입력 (칸을 누른 뒤 한 자씩)
  type: async (locator: ReturnType<Page['getByLabel']>, text: string) => {
    await page.waitForTimeout(THINK_MS);
    await locator.click();
    watch.taps += 1;
    await locator.pressSequentially(text, { delay: TYPE_MS_PER_CHAR });
    watch.typedChars += text.length;
  },
});

// 시험 준비는 서버에 직접 만들어 둔다(측정 대상이 아님): 진행 중 프로젝트, 투입 직원 3명, 지난 반입이 있는 자재
const prepare = async (page: Page) => {
  const headers = { 'X-Field-Note-Client': 'web', Origin: 'http://localhost:5173' };
  const post = async (path: string, data: object) => {
    const response = await page.request.post(`/api/v1${path}`, { data, headers });

    expect(response.ok(), `${path} → ${response.status()}`).toBe(true);

    return response.json();
  };
  const get = async (path: string) => (await page.request.get(`/api/v1${path}`)).json();
  const clientId = (await get('/partners?kind=CLIENT')).items[0].id as string;
  const employees = (await get('/employees')).items as { id: string; name: string }[];
  const project = await post('/projects', {
    name: uniqueName('E2E 측정 현장'),
    siteName: '측정 현장',
    clientId,
    managerId: employees[0]!.id,
    contractDate: seoulDate(-30),
    plannedStart: seoulDate(-14),
    plannedEnd: seoulDate(60),
  });

  await post(`/projects/${project.id}/status`, {
    toStatus: 'IN_PROGRESS',
    effectiveOn: seoulDate(-14),
  });

  for (const employee of employees.slice(0, 3)) {
    await post(`/projects/${project.id}/assignments`, {
      employeeId: employee.id,
      startDate: seoulDate(-14),
      endDate: seoulDate(60),
    });
  }

  const material = await post('/materials', {
    name: uniqueName('측정 강판'),
    spec: '1.0T',
    unit: '장',
  });

  await post(`/projects/${project.id}/material-records`, {
    materialId: material.id,
    recordDate: seoulDate(-1),
    kind: 'RECEIVED',
    quantity: 100,
  });

  return { projectId: project.id as string, materialName: material.name as string };
};

test('하루 일지(공수·내용·자재·사진)를 모바일 화면에서 3분 안에 입력한다', async ({ page }) => {
  await login(page);

  const { projectId, materialName } = await prepare(page);
  const watch: Stopwatch = { taps: 0, typedChars: 0 };
  const user = createUser(page, watch);

  // 프로젝트 화면에서 시작 (현장에서 일지를 쓰러 프로젝트를 연 상태)
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole('heading', { name: /E2E 측정 현장/ })).toBeVisible();

  const started = Date.now();

  // 1) 빠른 추가 → 오늘 일지
  await user.tap(() => page.getByRole('button', { name: '빠른 추가' }).click());
  await user.tap(() => page.getByRole('link', { name: '오늘 일지' }).click());
  await expect(page.getByRole('checkbox', { name: /출근/ }).first()).toBeChecked();

  // 2) 직원 공수: 투입 직원이 채워져 있으니 작업 구분만 일괄 지정하고 한 명은 반일
  await user.tap(() => page.getByLabel('작업 구분 일괄 지정').selectOption({ label: '설치' }));
  await user.tap(() => page.getByRole('button', { name: '모두 적용' }).click());
  await user.tap(() => page.getByRole('button', { name: '반일' }).first().click());

  // 3) 작업 내용
  await user.type(page.getByLabel('작업 내용'), WORK_NOTE);

  // 4) 저장
  await user.tap(() => page.getByRole('button', { name: '저장', exact: true }).click());
  await expect(page.getByText(/저장했습니다 \(버전 1\)/)).toBeVisible();

  // 5) 자재: 최근 쓴 자재를 한 번 눌러 수량만 적고 저장
  await user.tap(() => page.getByRole('button', { name: new RegExp(materialName) }).click());
  await user.type(page.getByLabel('수량'), '12');
  await user.tap(() => page.getByRole('button', { name: '자재 1건 저장' }).click());
  await expect(page.getByText('사용 12장')).toBeVisible();

  // 6) 사진: 빠른 추가의 "사진"으로 사진첩에 가서 구분을 고르고 두 장을 올림
  await user.tap(() => page.getByRole('button', { name: '빠른 추가' }).click());
  await user.tap(() => page.getByRole('link', { name: '사진', exact: true }).click());
  await user.tap(() => page.getByLabel('구분', { exact: true }).selectOption({ label: '작업 후' }));

  const photoStarted = Date.now();

  await page.waitForTimeout(PHOTO_PICKER_MS);
  await page
    .getByLabel('사진 파일 선택')
    .setInputFiles([photoFile('측정-1.jpg'), photoFile('측정-2.jpg')]);
  watch.taps += 1;
  await expect(page.getByText('2장을 모두 올렸습니다')).toBeVisible({ timeout: 60_000 });
  const photoStepMs = Date.now() - photoStarted;

  const seconds = (Date.now() - started) / 1000;
  const summary = `하루 일지 입력 ${seconds.toFixed(1)}초 (목표 ${GOAL_SECONDS}초), 누르기·고르기 ${watch.taps}번, 글자 ${watch.typedChars}자, 사진 두 장 올리기 ${(photoStepMs / 1000).toFixed(1)}초(고르기 창 ${PHOTO_PICKER_MS / 1000}초 포함)`;

  console.log(`[실측] ${summary}`);
  await test.info().attach('timing', { body: summary });

  expect(seconds).toBeLessThan(GOAL_SECONDS);
});
