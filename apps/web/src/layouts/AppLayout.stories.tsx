import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { expect, userEvent, within } from 'storybook/test';

import { handlers } from '../mocks/handlers';
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

// 공개 시연 계정으로 로그인하면 모든 화면 위에 가상 데이터 안내가 보임
export const DemoBanner: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/me', () =>
          HttpResponse.json({
            displayName: 'Tester',
            email: 'jbeatfield@gmail.com',
            isEmailVerified: true,
            companyName: 'Test Company',
            isDemo: true,
          }),
        ),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('note')).toHaveTextContent('모든 데이터는 가상');
  },
};

// 왼쪽 메뉴 아래 내 정보를 누르면 설정과 로그아웃이 열림 (로그아웃은 설정까지 가지 않아도 가능)
export const ProfileMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '내 메뉴' }));

    const menu = within(document.body);

    await expect(await menu.findByRole('menuitem', { name: '설정' })).toHaveAttribute(
      'href',
      '/settings',
    );
    await expect(menu.getByRole('menuitem', { name: '로그아웃' })).toBeInTheDocument();
    // 열린 메뉴는 나머지 화면을 보조 기술에서 가리므로 닫은 상태에서 접근성 검사가 돌게 함
    await userEvent.keyboard('{Escape}');
  },
};

// 좁은 화면은 더보기 시트에 내 정보와 로그아웃 버튼이 있음
export const MoreSheetLogout: Story = {
  play: async ({ canvasElement }) => {
    const moreButton = canvasElement.querySelector('nav[aria-label="하단 메뉴"] button');

    await userEvent.click(moreButton as HTMLElement);
    await expect(
      await within(document.body).findByRole('button', { name: '로그아웃' }),
    ).toBeInTheDocument();
  },
};

// 넓은 화면 머리 한 줄에 찾기, 알림, 프로젝트 등록이 순서대로 있음
export const TopBar: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = await canvas.findByRole('link', { name: '찾기' });
    const register = canvas.getByRole('link', { name: '프로젝트 등록' });

    await expect(search).toHaveAttribute('href', '/search');
    await expect(register).toHaveAttribute('href', '/projects/new');
    await expect(
      search.compareDocumentPosition(register) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

// 사이드바를 접으면 이름이 사라지고 아이콘 메뉴만 남으며, 다시 펼 수 있음
export const SidebarCollapse: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = within(await canvas.findByRole('navigation', { name: '주 메뉴' }));

    await userEvent.click(await canvas.findByRole('button', { name: '사이드바 접기' }));
    await expect(nav.getByRole('link', { name: '프로젝트' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav.queryByText('프로젝트 관리')).not.toBeVisible();
    await userEvent.click(await canvas.findByRole('button', { name: '사이드바 펼치기' }));
    await expect(await canvas.findByRole('button', { name: '사이드바 접기' })).toBeInTheDocument();
  },
};
