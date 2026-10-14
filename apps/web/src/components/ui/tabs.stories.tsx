import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { SegmentedControl } from './segmented-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = { title: 'UI/Tabs·SegmentedControl', component: Tabs } satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabsExample: Story = {
  render: () => (
    <Tabs defaultValue="info">
      <TabsList aria-label="프로젝트 보기">
        <TabsTrigger value="info">기본 정보</TabsTrigger>
        <TabsTrigger value="members">투입</TabsTrigger>
      </TabsList>
      <TabsContent value="info">기본 정보 내용</TabsContent>
      <TabsContent value="members">투입 내용</TabsContent>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('tab', { name: '투입' }));
    await expect(canvas.getByText('투입 내용')).toBeVisible();
  },
};

const Segmented = () => {
  const [value, setValue] = useState('month');

  return (
    <SegmentedControl
      aria-label="집계 단위"
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'day', label: '일' },
        { value: 'week', label: '주' },
        { value: 'month', label: '월' },
      ]}
    />
  );
};

export const Segment: Story = {
  render: () => <Segmented />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('radio', { name: '주' }));
    await expect(canvas.getByRole('radio', { name: '주' })).toBeChecked();
    // 선택된 항목을 다시 눌러도 선택이 풀리지 않음
    await userEvent.click(canvas.getByRole('radio', { name: '주' }));
    await expect(canvas.getByRole('radio', { name: '주' })).toBeChecked();
  },
};
