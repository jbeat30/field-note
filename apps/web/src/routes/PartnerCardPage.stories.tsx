import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { DEMO_PARTNERS } from '../mocks/demoSource';
import { signIn } from '../mocks/state';

import { PartnerCardPage } from './PartnerCardPage';

const routerFor = (name: string) => ({
  initialEntries: [`/partners/${DEMO_PARTNERS.find((partner) => partner.name === name)!.id}`],
  path: '/partners/:id',
});

const meta = {
  title: 'Pages/명부 카드',
  component: PartnerCardPage,
  parameters: { router: routerFor('가나다건설') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof PartnerCardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: /가나다건설/ })).toBeInTheDocument();
    // 카드에서는 담당자·연락처·메모가 보이고 전화 걸기 링크가 있음
    await expect(canvas.getByLabelText('담당자')).toHaveValue('윤소장');
    await expect(canvas.getByLabelText('연락처')).toHaveValue('02-0000-0101');
    await expect(canvas.getByLabelText('메모')).toHaveValue('원청. 현장 출입증 사전 신청 필요');
    await expect(canvas.getByRole('link', { name: /전화 걸기/ })).toHaveAttribute(
      'href',
      'tel:02-0000-0101',
    );
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const EditAndSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const contact = await canvas.findByLabelText('담당자');

    await userEvent.clear(contact);
    await userEvent.type(contact, '신소장');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('담당자')).toHaveValue('신소장');
  },
};

export const ClearOptionalFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('연락처'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.queryByRole('link', { name: /전화 걸기/ })).not.toBeInTheDocument();
  },
};

export const InvalidPhone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const phone = await canvas.findByLabelText('연락처');

    await userEvent.clear(phone);
    await userEvent.type(phone, '전화번호');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText(/숫자와 - \( \) \+ 만 입력/)).toBeInTheDocument();
  },
};

export const DuplicateNameInSameKind: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText('상호');

    await userEvent.clear(name);
    await userEvent.type(name, '미래오피스');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(
      await canvas.findByText('같은 구분에 이미 같은 상호가 있습니다'),
    ).toBeInTheDocument();
  },
};

export const EmptyName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('상호'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('상호를 입력해 주세요')).toBeInTheDocument();
  },
};

export const HideAndRestore: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '숨기기' }));

    await expect(await canvas.findByText(/숨겼습니다/)).toBeInTheDocument();
    // 카드는 그대로 열리고 숨김 표시만 붙음
    await expect(canvas.getByRole('heading', { name: /가나다건설/ })).toHaveTextContent('숨김');

    await userEvent.click(canvas.getByRole('button', { name: '다시 사용' }));

    await expect(await canvas.findByText('다시 사용합니다')).toBeInTheDocument();
  },
};

export const HiddenPartnerCard: Story = {
  parameters: { router: routerFor('옛날상가') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: /옛날상가/ })).toHaveTextContent(
      '숨김',
    );
    await expect(canvas.getByRole('button', { name: '다시 사용' })).toBeInTheDocument();
  },
};

export const NotFound: Story = {
  parameters: {
    router: {
      initialEntries: ['/partners/0198d000-0000-7000-8000-000000000999'],
      path: '/partners/:id',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '업체를 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  },
};
