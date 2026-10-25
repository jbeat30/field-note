import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';
import { Chip } from './chip';

const meta = { title: 'UI/Badge·Chip', component: Badge } satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>진행 전</Badge>
      <Badge tone="primary">진행 중</Badge>
      <Badge tone="success">완료</Badge>
      <Badge tone="warning">임박</Badge>
      <Badge tone="danger">초과</Badge>
      <Badge tone="ink">베타</Badge>
    </div>
  ),
};

export const Chips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip selected>전체</Chip>
      <Chip>진행 중</Chip>
      <Chip>완료</Chip>
    </div>
  ),
};
