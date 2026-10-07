import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DEMO_EMPLOYEES } from '../mocks/demoSource';
import { findAccount, getEmployees, getOptions, saveOptions, signIn } from '../mocks/state';

import { EmployeeCardPage } from './EmployeeCardPage';

const idOf = (name: string) => DEMO_EMPLOYEES.find((employee) => employee.name === name)!.id;
const routerFor = (name: string) => ({
  initialEntries: [`/employees/${idOf(name)}`],
  path: '/employees/:id',
});

const meta = {
  title: 'Pages/직원 카드',
  component: EmployeeCardPage,
  parameters: { router: routerFor('정판금') },
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof EmployeeCardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: /정판금/ })).toBeInTheDocument();
    // 카드에서는 생년월일·연락처·메모가 보임
    await expect(canvas.getByLabelText('연락처')).toHaveValue('010-0000-0001');
    await expect(canvas.getByLabelText('생년월일')).toHaveValue('1978-04-12');
    await expect(canvas.getByLabelText('직종')).toHaveDisplayValue('판금공');
    await expect(canvas.getByLabelText('직원 구분')).toHaveDisplayValue('정직원');
    await expect(
      canvas.getByText(/주민등록번호·계좌번호·급여는 저장하지 않습니다/),
    ).toBeInTheDocument();
    // 바꾸기 전에는 저장할 수 없음
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};

export const EditAndSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = await canvas.findByLabelText('직책');

    await userEvent.clear(title);
    await userEvent.type(title, '팀장');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('직책')).toHaveValue('팀장');
  },
};

export const ClearOptionalFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('연락처'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('저장했습니다')).toBeInTheDocument();
    await expect(canvas.getByLabelText('연락처')).toHaveValue('');
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

export const EmptyName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.clear(await canvas.findByLabelText('이름'));
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));

    await expect(await canvas.findByText('이름을 입력해 주세요')).toBeInTheDocument();
  },
};

export const LeaveAndReturn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '휴직 처리' }));
    await userEvent.click(canvas.getByRole('button', { name: '휴직 확인' }));

    await expect(await canvas.findByText('휴직 처리했습니다')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /복직/ }));

    await expect(await canvas.findByText('재직 상태로 돌렸습니다')).toBeInTheDocument();
  },
};

// 퇴사는 확인 단계를 한 번 더 거치고, 퇴사일이 채워지며 기록은 그대로 남음
export const ResignAndRehire: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '퇴사 처리' }));
    // 확인 전에는 아직 바뀌지 않음
    await expect(
      getEmployees(findAccount('hanbit')!).find((item) => item.id === idOf('정판금'))?.status,
    ).toBe('ACTIVE');
    await userEvent.click(canvas.getByRole('button', { name: '퇴사 확인' }));

    await expect(await canvas.findByText(/퇴사 처리했습니다/)).toBeInTheDocument();
    await expect(await canvas.findByLabelText('퇴사일')).not.toHaveValue('');
    await expect(canvas.getByLabelText('이름')).toHaveValue('정판금');

    await userEvent.click(canvas.getByRole('button', { name: /재입사/ }));

    await expect(await canvas.findByText('재직 상태로 돌렸습니다')).toBeInTheDocument();
    await waitFor(() => expect(canvas.queryByLabelText('퇴사일')).not.toBeInTheDocument());
  },
};

export const CancelResign: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: '퇴사 처리' }));
    await userEvent.click(canvas.getByRole('button', { name: '취소' }));

    await expect(await canvas.findByRole('button', { name: '퇴사 처리' })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '퇴사 확인' })).not.toBeInTheDocument();
  },
};

export const LeftEmployee: Story = {
  parameters: { router: routerFor('박퇴사') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('퇴사일')).toHaveValue('2026-08-31');
    await expect(canvas.getByRole('button', { name: /재입사/ })).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '퇴사 처리' })).not.toBeInTheDocument();
  },
};

// 이미 쓰는 직종이 나중에 숨김 처리돼도 카드에는 그대로 보임
export const HiddenJobTypeStillShown: Story = {
  loaders: [
    () => {
      signIn('hanbit');

      const account = findAccount('hanbit')!;

      saveOptions(
        account,
        getOptions(account).map((item) =>
          item.kind === 'JOB_TYPE' && item.name === '판금공' ? { ...item, isActive: false } : item,
        ),
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByLabelText('직종')).toHaveDisplayValue('판금공 (숨김)');
  },
};

export const NotFound: Story = {
  parameters: {
    router: {
      initialEntries: ['/employees/0198d000-0000-7000-8000-000000000999'],
      path: '/employees/:id',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole('heading', { name: '직원을 찾을 수 없습니다' }),
    ).toBeInTheDocument();
  },
};
