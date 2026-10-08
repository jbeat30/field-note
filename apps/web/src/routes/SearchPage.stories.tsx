import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_PROJECTS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { SearchPage } from './SearchPage';

const projectId = DEMO_PROJECTS.find((project) => project.name === 'A동 외장 판금 공사')!.id;

const meta = {
  title: 'Pages/통합 검색',
  component: SearchPage,
  parameters: { router: { initialEntries: ['/search'], path: '/search' } },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof SearchPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyPrompt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText('검색어')).toHaveFocus();
    await expect(canvas.getByText('찾을 말을 입력해 주세요')).toBeInTheDocument();
  },
};

// 글자를 치면 잠깐 뒤 프로젝트·직원·자료 등 종류별 결과가 나온다
export const TypeToSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('검색어'), '정판금');

    await expect(await canvas.findByRole('link', { name: /정판금/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/employees/'),
    );
    await expect(canvas.getByRole('heading', { name: '직원', level: 2 })).toBeInTheDocument();
  },
};

export const FindsAcrossTypes: Story = {
  parameters: { router: { initialEntries: ['/search?q=공사'], path: '/search' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '프로젝트', level: 2 }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /A동 외장 판금 공사/ })).toBeInTheDocument();
  },
};

export const NoMatch: Story = {
  parameters: { router: { initialEntries: ['/search?q=없는검색어'], path: '/search' } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/에 맞는 결과가 없습니다/),
    ).toBeInTheDocument();
  },
};

// 프로젝트 안 검색: 프로젝트·직원은 찾지 않고 그 프로젝트의 메모·자료·일지만
export const SearchInsideProject: Story = {
  parameters: {
    router: {
      initialEntries: [`/search?project=${projectId}&q=${encodeURIComponent('시공도')}`],
      path: '/search',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: '자료', level: 2 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/안에서 메모·자료·일지만 찾습니다/)).toBeInTheDocument();
    await expect(canvas.queryByRole('heading', { name: '프로젝트' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByRole('link', { name: '전체에서 찾기' })).toHaveAttribute(
        'href',
        expect.stringContaining('/search?q='),
      ),
    );
  },
};
