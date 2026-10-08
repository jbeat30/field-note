import type { DailyReport } from '@field-note/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ReportSheet } from './ReportSheet';

const base: DailyReport = {
  companyName: '한빛판금',
  project: {
    id: '0198d000-0000-7000-8000-000000000301',
    code: '2026-001',
    name: 'A동 외장 판금 공사',
    siteName: 'A동 신축 현장',
    siteAddress: '서울특별시 중구 세종대로 110',
    clientName: '가나다건설',
  },
  date: '2026-10-06',
  workLog: {
    status: 'SAVED',
    content: '3층 외장 패널 설치\n배관 간섭 구간 조정',
    area: '3층 301호',
    notes: '오후 우천으로 외부 작업 중단',
    isChange: true,
    isAfterService: false,
  },
  entries: [
    {
      employeeId: '0198d000-0000-7000-8000-000000000001',
      employeeName: '김설치',
      jobTypeName: '판금공',
      categoryName: '설치',
      minutes: 480,
    },
    {
      employeeId: '0198d000-0000-7000-8000-000000000001',
      employeeName: '김설치',
      jobTypeName: '판금공',
      categoryName: '가공',
      minutes: 120,
    },
    {
      employeeId: '0198d000-0000-7000-8000-000000000002',
      employeeName: '이가공',
      jobTypeName: null,
      categoryName: '가공',
      minutes: 240,
    },
  ],
  totals: { headcount: 2, minutes: 840 },
  settings: { workUnitMode: 'RATIO', standardWorkMinutes: 480 },
  materials: [
    {
      materialName: '아연도강판',
      spec: '1.0T',
      unit: '장',
      kind: 'USED',
      quantity: 12.5,
      categoryName: '설치',
      area: '3층',
      isChange: true,
      isAfterService: false,
      memo: null,
    },
    {
      materialName: '실리콘 코킹',
      spec: null,
      unit: '개',
      kind: 'RECEIVED',
      quantity: 20,
      categoryName: null,
      area: null,
      isChange: false,
      isAfterService: false,
      memo: '1차 반입',
    },
  ],
  photos: [
    {
      id: '0198d000-0000-7000-8000-000000000011',
      category: 'BEFORE',
      area: '3층 301호',
      description: '설치 전 상태',
      takenAt: '2026-10-06T01:00:00.000Z',
      thumbnailUrl: null,
      isProcessing: false,
    },
    {
      id: '0198d000-0000-7000-8000-000000000012',
      category: 'AFTER',
      area: '3층 301호',
      description: null,
      takenAt: '2026-10-06T08:00:00.000Z',
      thumbnailUrl: null,
      isProcessing: false,
    },
  ],
  hasMorePhotos: false,
};

const meta = {
  title: 'Reports/작업일보',
  component: ReportSheet,
  args: { report: base },
} satisfies Meta<typeof ReportSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Full: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('heading', { name: '작업일보', level: 1 })).toBeInTheDocument();
    await expect(canvas.getByText('2026-001 A동 외장 판금 공사')).toBeInTheDocument();
    await expect(canvas.getByText('가나다건설')).toBeInTheDocument();
    // 공수 합계: 같은 직원이 두 줄이어도 2명, 840분 = 1.75 MD
    await expect(canvas.getByText('합계 (2명)')).toBeInTheDocument();
    await expect(canvas.getByText('1.75')).toBeInTheDocument();
    await expect(canvas.getByText('공수(MD)')).toBeInTheDocument();
    // 자재: 이름·규격·구분·수량·단위·비고
    await expect(canvas.getByText('아연도강판 1.0T')).toBeInTheDocument();
    await expect(canvas.getByText('12.5장')).toBeInTheDocument();
    await expect(canvas.getByText('설치 · 3층 · 변경·추가')).toBeInTheDocument();
    // 사진 설명
    await expect(canvas.getByText('작업 전 · 3층 301호 — 설치 전 상태')).toBeInTheDocument();
    await expect(canvas.getByText(/오후 우천으로/)).toBeInTheDocument();
  },
};

export const HoursMode: Story = {
  args: { report: { ...base, settings: { workUnitMode: 'HOURS', standardWorkMinutes: 480 } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('공수(시간)')).toBeInTheDocument();
    // 840분 = 14시간
    await expect(canvas.getByText('14')).toBeInTheDocument();
  },
};

// 일지가 없는 날: 자재·사진만 있는 보고서
export const NoWorkLog: Story = {
  args: { report: { ...base, workLog: null, entries: [], totals: { headcount: 0, minutes: 0 } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('이 날 작성한 일지가 없습니다')).toBeInTheDocument();
    await expect(canvas.getByText('기록된 공수가 없습니다')).toBeInTheDocument();
  },
};

export const EmptyDay: Story = {
  args: {
    report: {
      ...base,
      workLog: null,
      entries: [],
      materials: [],
      photos: [],
      totals: { headcount: 0, minutes: 0 },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const text of [
      '이 날 작성한 일지가 없습니다',
      '기록된 공수가 없습니다',
      '기록된 자재가 없습니다',
      '이 날 올린 사진이 없습니다',
    ]) {
      await expect(canvas.getByText(text)).toBeInTheDocument();
    }
  },
};

// 임시 저장 일지는 확정되지 않았다고 표시, 사진이 많으면 일부만 실었다고 알림
export const DraftAndManyPhotos: Story = {
  args: {
    report: { ...base, workLog: { ...base.workLog!, status: 'DRAFT' }, hasMorePhotos: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/임시 저장 상태의 일지입니다/)).toBeInTheDocument();
    await expect(canvas.getByText(/사진이 많아 일부만 실었습니다/)).toBeInTheDocument();
  },
};

// 긴 내용과 긴 이름도 표가 깨지지 않음
export const LongContent: Story = {
  args: {
    report: {
      ...base,
      workLog: {
        ...base.workLog!,
        content: `${'외장 패널 설치 작업을 진행했고 협력업체와 일정을 조율했습니다. '.repeat(20)}`,
      },
      entries: Array.from({ length: 12 }, (_, index) => ({
        employeeId: `0198d000-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`,
        employeeName: `직원${index + 1}`,
        jobTypeName: '판금공',
        categoryName: '설치',
        minutes: 480,
      })),
      totals: { headcount: 12, minutes: 5760 },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('합계 (12명)')).toBeInTheDocument();
  },
};
