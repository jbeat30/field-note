import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';

import { Button } from './button';
import { Modal } from './modal';

const meta = { title: 'UI/Modal', component: Modal } satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

const Example = ({ variant }: { variant: 'dialog' | 'sheet' }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>열기</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="삭제할까요"
        description="삭제하면 되돌릴 수 없습니다"
        variant={variant}
      >
        <Button variant="danger" onClick={() => setOpen(false)}>
          삭제
        </Button>
      </Modal>
    </>
  );
};

const openAndClose = async (canvasElement: HTMLElement) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: '열기' }));
  await expect(await screen.findByRole('dialog', { name: '삭제할까요' })).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect(screen.queryByRole('dialog')).toBeNull();
};

export const Dialog: Story = {
  args: { open: false, onOpenChange: () => {}, title: '', children: null },
  render: () => <Example variant="dialog" />,
  play: ({ canvasElement }) => openAndClose(canvasElement),
};

export const Sheet: Story = {
  args: { open: false, onOpenChange: () => {}, title: '', children: null },
  render: () => <Example variant="sheet" />,
  play: ({ canvasElement }) => openAndClose(canvasElement),
};
