import { expect, test } from '@playwright/test';

import { login } from './helpers';

// 시드 프로젝트·직원
const PROJECT_ID = '0198d000-0000-7000-8000-000000000301';
const EMPLOYEE_ID = '0198d000-0000-7000-8000-000000000101';

// 모바일 폭(390px)에서 화면이 옆으로 밀려나지 않는지 확인할 주요 화면
const PAGES = [
  ['홈', '/'],
  ['프로젝트 목록', '/projects'],
  ['프로젝트 등록', '/projects/new'],
  ['프로젝트 현황', `/projects/${PROJECT_ID}/overview`],
  ['오늘 작업 내역', `/projects/${PROJECT_ID}/work/2026-10-17`],
  ['프로젝트 사진', `/projects/${PROJECT_ID}/photos`],
  ['프로젝트 자료', `/projects/${PROJECT_ID}/documents`],
  ['변경·추가 작업', `/projects/${PROJECT_ID}/change-works`],
  ['직원 목록', '/employees'],
  ['직원 서류', `/employees/${EMPLOYEE_ID}?tab=credentials`],
  ['명부', '/partners'],
  ['월 공수', '/monthly-hours'],
  ['인력 배치', '/staffing'],
  ['설정', '/settings'],
  ['회사 설정', '/settings?tab=company'],
] as const;

test('주요 화면이 모바일 폭에서 가로로 넘치지 않는다', async ({ page }) => {
  await login(page);

  for (const [name, path] of PAGES) {
    await test.step(name, async () => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow, `${name} 화면의 가로 넘침(px)`).toBeLessThanOrEqual(0);
    });
  }
});

// 표의 고정 열이 위쪽 머리글이나 하단 메뉴 위로 올라와 보이지 않는지 확인할 화면
const STICKY_TABLE_PAGES = [
  ['홈', '/'],
  ['인력 배치', '/staffing'],
  ['월 공수', '/monthly-hours'],
] as const;

test('스크롤해도 표가 머리글·하단 메뉴를 가리지 않는다', async ({ page }) => {
  await login(page);

  for (const [name, path] of STICKY_TABLE_PAGES) {
    await test.step(name, async () => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');

      // 200px씩 내려가며 머리글 아래쪽과 하단 메뉴 위쪽에 실제로 보이는 요소가 그 영역 것인지 확인
      const covered = await page.evaluate(async () => {
        const header = document.querySelector('header');
        const nav = document.querySelector('nav[aria-label="하단 메뉴"]');
        const found: string[] = [];

        if (!header || !nav) {
          return ['머리글 또는 하단 메뉴 없음'];
        }

        for (let y = 0; y <= document.documentElement.scrollHeight; y += 200) {
          window.scrollTo(0, y);
          await new Promise((resolve) => requestAnimationFrame(resolve));

          const top = document.elementFromPoint(40, header.getBoundingClientRect().bottom - 6);
          const bottom = document.elementFromPoint(40, nav.getBoundingClientRect().top + 6);

          if (top && !header.contains(top)) found.push(`머리글@${y}`);
          if (bottom && !nav.contains(bottom)) found.push(`하단 메뉴@${y}`);
        }

        return found;
      });

      expect(covered, `${name} 화면에서 가려진 곳`).toEqual([]);
    });
  }
});
