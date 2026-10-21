import { buildStaffingMonthCalendar, type StaffingCalendar } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { StaffingMonthCalendar } from './StaffingMonthCalendar';

const E1 = '0198d000-0000-7000-8000-000000000001';
const E2 = '0198d000-0000-7000-8000-000000000002';
const E3 = '0198d000-0000-7000-8000-000000000003';
const P1 = '0198d000-0000-7000-8000-0000000000a1';
const P2 = '0198d000-0000-7000-8000-0000000000a2';
const P3 = '0198d000-0000-7000-8000-0000000000a3';

const employee = (id: string, name: string) => ({
  id,
  name,
  title: null,
  status: 'ACTIVE' as const,
  leftOn: null,
});

const workDay = (
  employeeId: string,
  workDate: string,
  projectId: string,
  projectName: string,
  minutes = 480,
) => ({
  employeeId,
  workDate,
  projectId,
  projectCode: '2026-001',
  projectName,
  projectStatus: 'IN_PROGRESS' as const,
  minutes,
});

// 10월: 한빛 1공장(P1)·새론 2공장(P2)·미래오피스(P3), 10/7은 김철수가 두 곳에 들어가 겹침
const calendar: StaffingCalendar = {
  from: '2026-10-01',
  to: '2026-10-31',
  employees: [employee(E1, '김철수'), employee(E2, '이영희'), employee(E3, '박반장')],
  assignments: [],
  workDays: [
    workDay(E1, '2026-10-05', P1, '한빛 1공장'),
    workDay(E2, '2026-10-05', P1, '한빛 1공장'),
    workDay(E1, '2026-10-07', P1, '한빛 1공장', 240),
    workDay(E1, '2026-10-07', P2, '새론 2공장', 240),
    workDay(E2, '2026-10-07', P1, '한빛 1공장'),
    workDay(E1, '2026-10-08', P1, '한빛 1공장'),
    workDay(E2, '2026-10-08', P2, '새론 2공장'),
    workDay(E3, '2026-10-08', P3, '미래오피스'),
  ],
};

const meta = {
  title: 'Dashboard/이번 달 인력 달력',
  component: StaffingMonthCalendar,
  args: {
    weeks: buildStaffingMonthCalendar(calendar),
    today: '2026-10-08',
    projectColors: new Map([
      [P1, 0],
      [P2, 1],
      [P3, 2],
    ]),
  },
} satisfies Meta<typeof StaffingMonthCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

// 오늘 칸이 처음 선택되어 그날 일한 사람이 프로젝트별로 보임
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: /10월 8일.*일한 사람 3명/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const detail = canvas.getByRole('region', { name: /10월 8일.*일한 사람/ });

    await expect(within(detail).getByText('김철수 8시간')).toBeInTheDocument();
    await expect(within(detail).getByText('박반장 8시간')).toBeInTheDocument();
  },
};

// 같은 날 두 프로젝트에 들어간 사람이 있는 칸은 겹침으로 알려 주고, 눌러서 볼 수 있음
export const ConflictDay: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const conflictDay = canvas.getByRole('button', { name: /10월 7일.*같은 날 겹침 1명/ });

    await userEvent.click(conflictDay);
    await expect(conflictDay).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText('김철수 4시간')).toBeInTheDocument();
  },
};

// 일한 기록이 없는 날은 안내 문구
export const EmptyDay: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /10월 20일.*일한 사람 0명/ }));
    await expect(canvas.getByText('이 날 저장된 작업 내역이 없습니다')).toBeInTheDocument();
  },
};
