import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { resetMockCredentials } from '../mocks/credentialHandlers';
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
  loaders: [
    () => {
      // 스토리가 다시 그려져도 서류 상태가 이어지지 않게 처음으로 되돌림
      resetMockCredentials();
      signIn('hanbit');
    },
  ],
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
      canvas.getByText(/주민등록번호·계좌번호는 저장하지 않습니다. 급여는 단가만 기록합니다/),
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

// 최설치: A동(2026-09-01, 09-02)과 B동 덕트 설치(09-02)에 저장된 작업 내역이 있음
export const WorkHistory: Story = {
  parameters: { router: routerFor('최설치') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const history = within(await canvas.findByRole('region', { name: '투입 이력' }));
    const list = within(await history.findByRole('list', { name: '프로젝트별 투입 이력' }));

    await expect(
      list.getByRole('link', { name: /2026-001 A동 외장 판금 공사/ }),
    ).toBeInTheDocument();
    await expect(list.getByRole('link', { name: /2026-003 B동 덕트 설치/ })).toBeInTheDocument();
    await expect(list.getByText(/2일 · 2.0 MD \(16시간\)/)).toBeInTheDocument();
    await expect(history.getByText('이번 달 공수')).toBeInTheDocument();
    await expect(history.getByText('올해 공수')).toBeInTheDocument();
  },
};

export const WorkHistoryEmpty: Story = {
  parameters: { router: routerFor('오전기') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const history = within(await canvas.findByRole('region', { name: '투입 이력' }));

    await expect(await history.findByText(/아직 투입된 프로젝트가 없습니다/)).toBeInTheDocument();
  },
};

export const PayRates: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '단가' }));

    // 더미 단가: 2026-09-01부터 일급 25만원, 그 전에는 23만원 (이력이 남아 있음)
    await expect(await panel.findByText(/일급제 250,000원/)).toBeInTheDocument();
    const history = () => panel.getAllByRole('listitem').map((item) => item.textContent ?? '');

    await expect(history()).toEqual([
      expect.stringContaining('일급제 250,000원'),
      expect.stringContaining('일급제 230,000원'),
    ]);

    // 금액을 비우면 서버에 보내기 전에 막는다
    await userEvent.click(panel.getByRole('button', { name: '단가 저장' }));
    await expect(await panel.findByText('금액을 입력해 주세요')).toBeInTheDocument();

    // 월급제로 바꿔 저장하면 새 이력이 맨 앞에 쌓이고 기존 이력은 그대로
    await userEvent.selectOptions(panel.getByLabelText('단가 종류'), 'MONTHLY');
    await userEvent.type(panel.getByLabelText('월급 (원)'), '5500000');
    await userEvent.click(panel.getByRole('button', { name: '단가 저장' }));
    await waitFor(() => expect(history()).toHaveLength(3));
    await expect(history()).toEqual([
      expect.stringContaining('월급제 5,500,000원'),
      expect.stringContaining('일급제 250,000원'),
      expect.stringContaining('일급제 230,000원'),
    ]);
  },
};

export const Credentials: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '서류·자격' }));

    // 더미 서류: 건강검진은 만료, 판금 기능사는 만료 없음 (만료가 빠른 순)
    const rows = await panel.findAllByRole('listitem');

    await expect(rows).toHaveLength(2);
    await expect(rows[0]).toHaveTextContent('건강검진');
    await expect(rows[0]).toHaveTextContent('만료');
    await expect(rows[0]).toHaveTextContent('2026-09-30');
    await expect(rows[1]).toHaveTextContent('판금 기능사');
    await expect(rows[1]).toHaveTextContent('만료 없음');
    await expect(panel.getByText(/주민등록번호가 보이면 가리고 올려 주세요/)).toBeInTheDocument();
  },
};

export const AddCredential: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '서류·자격' }));
    const form = within(await panel.findByRole('form', { name: '서류 등록' }));

    // 종류를 고르지 않으면 서버에 보내기 전에 막는다
    await userEvent.click(form.getByRole('button', { name: '서류 등록' }));
    await expect(await form.findByText('서류 종류를 선택해 주세요')).toBeInTheDocument();

    // 만료일이 취득일보다 빠르면 막는다
    await userEvent.selectOptions(form.getByLabelText('서류 종류'), '전기기능사');
    fireEvent.change(form.getByLabelText('취득일 (선택)'), { target: { value: '2026-05-01' } });
    fireEvent.change(form.getByLabelText('만료일 (선택)'), { target: { value: '2026-04-30' } });
    await userEvent.click(form.getByRole('button', { name: '서류 등록' }));
    await expect(await form.findByText('만료일은 취득일보다 빠를 수 없습니다')).toBeInTheDocument();

    fireEvent.change(form.getByLabelText('만료일 (선택)'), { target: { value: '2030-01-01' } });
    await userEvent.click(form.getByRole('button', { name: '서류 등록' }));

    await waitFor(() => expect(panel.getAllByRole('listitem')).toHaveLength(3));
    await expect(panel.getByText(/전기기능사/, { selector: 'li span' })).toBeInTheDocument();
    // 등록하면 입력칸이 비워진다
    await expect(form.getByLabelText('서류 종류')).toHaveValue('');
  },
};

export const RenewCredential: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '서류·자격' }));
    const [expired] = await panel.findAllByRole('listitem');

    await expect(expired).toHaveTextContent('만료');

    await userEvent.click(within(expired!).getByRole('button', { name: '수정·갱신' }));
    fireEvent.change(within(expired!).getByLabelText('만료일'), {
      target: { value: '2028-09-30' },
    });
    await userEvent.click(within(expired!).getByRole('button', { name: '저장' }));

    // 갱신하면 상태가 유효로 바뀌고 만료가 빠른 순이라 판금 기능사(만료 없음) 앞에 그대로 있다
    await waitFor(() => expect(panel.getAllByRole('listitem')[0]).toHaveTextContent('2028-09-30'));
    await expect(panel.getAllByRole('listitem')[0]).toHaveTextContent('유효');
  },
};

export const RemoveCredential: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole('region', { name: '서류·자격' }));

    await userEvent.click(await panel.findByRole('button', { name: '건강검진 삭제' }));
    // 한 번 더 확인해야 삭제된다
    await expect(panel.getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(panel.getByRole('button', { name: '삭제 확인' }));

    await waitFor(() => expect(panel.getAllByRole('listitem')).toHaveLength(1));
    await expect(panel.getAllByRole('listitem')[0]).not.toHaveTextContent('건강검진');
  },
};
