import { expect, test } from '@playwright/test';

import { login } from './helpers';

test('프로젝트 등록에서 빈 채로 저장하면 맨 위 오류 칸으로 이동하고 날짜는 입력 안내가 나온다', async ({
  page,
}) => {
  await login(page);
  await page.goto('/projects/new');
  await page.getByRole('button', { name: '프로젝트 등록', exact: true }).click();

  await expect(page.getByLabel('프로젝트명')).toBeFocused();
  await expect(page.getByLabel('프로젝트명')).toBeInViewport();
  await expect(page.getByText('날짜를 입력해 주세요')).toHaveCount(3);
});
