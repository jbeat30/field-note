import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

import { chooseOption } from '../../lib/storyActions';

import { DateInput } from './date-input';
import { FormField } from './form-field';

const Example = ({ max }: { max?: string }) => {
  const [value, setValue] = useState('2026-10-13');

  return (
    <FormField label="작업일">
      <DateInput value={value} max={max} onChange={(event) => setValue(event.target.value)} />
    </FormField>
  );
};

const meta = {
  title: 'UI/DateInput',
  component: DateInput,
  render: () => <Example />,
} satisfies Meta<typeof DateInput>;

export default meta;

type Story = StoryObj<typeof meta>;

// 직접 입력하거나 달력에서 날짜를 고르면 같은 'YYYY-MM-DD' 값이 나옴
export const PickFromCalendar: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '달력 열기' }));
    await userEvent.click(await screen.findByRole('button', { name: /2026년 10월 20일/ }));
    await expect(canvas.getByLabelText('작업일')).toHaveValue('2026-10-20');
  },
};

// 달력 위쪽의 연도 선택으로 이전 달 넘기기 없이 다른 해로 이동
export const PickOtherYear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '달력 열기' }));
    await chooseOption(await screen.findByRole('combobox', { name: '연도 선택' }), '2024');
    await userEvent.click(await screen.findByRole('button', { name: /2024년 10월 8일/ }));
    await expect(canvas.getByLabelText('작업일')).toHaveValue('2024-10-08');
  },
};

export const TypeDirectly: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText('작업일');

    await userEvent.clear(input);
    await userEvent.type(input, '2026-11-05');
    await expect(input).toHaveValue('2026-11-05');
  },
};

export const ClearAndToday: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '달력 열기' }));
    await userEvent.click(await screen.findByRole('button', { name: '지우기' }));
    await expect(canvas.getByLabelText('작업일')).toHaveValue('');
  },
};

// max 이후 날짜는 고를 수 없음
export const MaxDate: Story = {
  render: () => <Example max="2026-10-15" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '달력 열기' }));
    await expect(await screen.findByRole('button', { name: /2026년 10월 16일/ })).toBeDisabled();
  },
};
