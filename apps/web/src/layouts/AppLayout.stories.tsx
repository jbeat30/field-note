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
    // 빠른 추가(+)도 모바일 전용이라 DOM에서 찾음
    await expect(canvasElement.querySelector('button[aria-label="빠른 추가"]')).not.toBeNull();
  },
};

// 테마 버튼이 밝게 ↔ 어둡게로 바뀜
export const ThemeSwitch: Story = {
  play: async ({ canvasElement }) => {
    useThemeStore.getState().setMode('light');
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: '어두운 화면으로 전환' }),
    );
    await expect(useThemeStore.getState().mode).toBe('dark');
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: '밝은 화면으로 전환' }),
    );
    await expect(useThemeStore.getState().mode).toBe('light');
  },
};
