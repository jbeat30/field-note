import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { SortableItem, SortableList } from './sortable-list';

const NAMES: Record<string, string> = { a: '판금공', b: '용접공', c: '보통인부' };

const Example = () => {
  const [ids, setIds] = useState(['a', 'b', 'c']);

  return (
    <SortableList
      ids={ids}
      onReorder={setIds}
      getLabel={(id) => NAMES[id] ?? ''}
      aria-label="직종 순서"
      className="divide-y divide-border"
    >
      {ids.map((id) => (
        <SortableItem key={id} id={id} label={NAMES[id] ?? ''} className="flex items-center gap-1">
          {(handle) => (
            <>
              {handle}
              <span>{NAMES[id]}</span>
            </>
          )}
        </SortableItem>
      ))}
    </SortableList>
  );
};

const meta = {
  title: 'UI/SortableList',
  component: SortableList,
  args: { ids: [], onReorder: () => {}, getLabel: () => '', children: null },
  render: () => <Example />,
} satisfies Meta<typeof SortableList>;

export default meta;

type Story = StoryObj<typeof meta>;

const order = (canvasElement: HTMLElement) =>
  within(canvasElement)
    .getAllByRole('listitem')
    .map((item) => item.textContent);

// 키보드: 손잡이에서 Space로 집고 방향키로 옮긴 뒤 Space로 놓음
export const KeyboardReorder: Story = {
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('button', { name: '판금공 순서 끌어서 바꾸기' });

    handle.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');
    await waitFor(() => expect(order(canvasElement)).toEqual(['용접공', '판금공', '보통인부']));
  },
};
