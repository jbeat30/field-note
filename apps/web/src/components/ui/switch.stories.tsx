import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Switch } from './switch';

const Example = () => {
  const [checked, setChecked] = useState(false);

  return (
    <label className="flex items-center justify-between gap-3">
      메모 알림
      <Switch checked={checked} onCheckedChange={setChecked} />
    </label>
  );
};

const meta = { title: 'UI/Switch', component: Switch, render: () => <Example /> } satisfies Meta<
  typeof Switch
>;

export default meta;

type Story = StoryObj<typeof meta>;

// 글자를 눌러도 켜지고 꺼짐
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('switch', { name: '메모 알림' })).not.toBeChecked();
    await userEvent.click(canvas.getByText('메모 알림'));
    await expect(canvas.getByRole('switch', { name: '메모 알림' })).toBeChecked();
  },
};
