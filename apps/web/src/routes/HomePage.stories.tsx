import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { signIn } from '../mocks/state';

import { HomePage } from './HomePage';

const meta = {
  title: 'Pages/홈',
  component: HomePage,
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 정리 안 된 메모함과 끝내지 않은 할 일 건수를 알려 주고 메모함으로 이동
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/정리 안 된 메모 3건/)).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /메모함/ })).toHaveAttribute('href', '/inbox');
  },
};
