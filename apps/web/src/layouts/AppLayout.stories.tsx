import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route, Routes } from 'react-router';
import { expect, userEvent, within } from 'storybook/test';

import { useThemeStore } from '../stores/themeStore';

import { AppLayout } from './AppLayout';

const meta = {
  title: 'Layouts/AppLayout',
  component: AppLayout,
  parameters: { layout: 'fullscreen', router: { initialEntries: ['/projects'] } },
  decorators: [
    () => (
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="*" element={<p>본문 영역</p>} />
        </Route>
      </Routes>
    ),
  ],
} satisfies Meta<typeof AppLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

// 모바일: 하단 탭 메뉴에서 현재 화면이 강조되고 빠른 추가 버튼이 보임
export const Mobile: Story = {
  play: async ({ canvasElement }) => {
    // 스토리 실행 화면은 넓어서 하단 메뉴가 CSS로 숨겨질 수 있으므로 DOM에서 직접 찾음
    const current = canvasElement.querySelector(
      'nav[aria-label="하단 메뉴"] a[aria-current="page"]',
    );

    await expect(current).toHaveTextContent('프로젝트');
    await expect(within(canvasElement).getByRole('button', { name: '빠른 추가' })).toBeVisible();
  },
};

// 테마 버튼이 기기 설정 → 밝게 → 어둡게 순서로 바뀜
export const ThemeSwitch: Story = {
  play: async ({ canvasElement }) => {
    const toggle = () => within(canvasElement).getByRole('button', { name: /^화면 테마/ });

    useThemeStore.getState().setMode('light');
    await userEvent.click(toggle());
    await expect(useThemeStore.getState().mode).toBe('dark');
    await expect(toggle()).toHaveAccessibleName(/어둡게/);
    await userEvent.click(toggle());
    await expect(useThemeStore.getState().mode).toBe('system');
    useThemeStore.getState().setMode('light');
  },
};
