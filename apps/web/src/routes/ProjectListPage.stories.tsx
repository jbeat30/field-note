import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { http } from 'msw';

import { handlers } from '../mocks/handlers';
import { findAccount, getProjects, saveProjects, signIn } from '../mocks/state';

import { ProjectListPage } from './ProjectListPage';
import { chooseOption } from '../lib/storyActions';

const meta = {
  title: 'Pages/프로젝트 목록',
  component: ProjectListPage,
  parameters: { router: { initialEntries: ['/projects'], path: '/projects' } },
  // 한빛판금 관리자로 로그인된 상태에서 시작 (더미 프로젝트 5건)
  loaders: [() => signIn('hanbit')],
} satisfies Meta<typeof ProjectListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// 표의 데이터 줄 (머리 줄 제외)
const rows = (canvas: ReturnType<typeof within>) =>
  within(canvas.getByRole('region', { name: '프로젝트 목록' }))
    .getAllByRole('row')
    .slice(1)
    .map((item: HTMLElement) => item.textContent ?? '');

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('A동 외장 판금 공사')).toBeInTheDocument();
    await expect(canvas.getByText('5건')).toBeInTheDocument();
    // 코드는 숫자 순서의 최근 등록순 (2025년 번호가 맨 뒤)
    await waitFor(() => expect(rows(canvas)[0]).toContain('2026-004'));
    await expect(rows(canvas).at(-1)).toContain('2025-012');
    // 번호·현장명·상태·고객·담당자·기간·공종이 보이고, 현장 연락처·출입 메모는 목록에 없음
    // 고객·담당자 이름은 명부·직원 목록 로딩 후 채움
    await waitFor(() =>
      expect(rows(canvas).find((text) => text.includes('A동 외장 판금 공사'))).toContain(
        '가나다건설',
      ),
    );

    const row = rows(canvas).find((text) => text.includes('A동 외장 판금 공사'))!;

    await expect(row).toContain('A동 신축 현장');
    await expect(row).toContain('진행');
    await expect(row).toContain('가나다건설');
    await waitFor(() =>
      expect(rows(canvas).find((text) => text.includes('A동 외장 판금 공사'))).toContain('송소장'),
    );
    await expect(row).toContain('2026-07-15 ~ 2026-11-30');
    await expect(row).toContain('판금');
    await expect(canvas.queryByText(/02-0000-0101/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/정문 출입증/)).not.toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: '프로젝트 등록' })).toHaveAttribute(
      'href',
      '/projects/new',
    );
  },
};

export const FilterByStatus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: '중단' }));

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
    await expect(canvas.queryByText('A동 외장 판금 공사')).not.toBeInTheDocument();
  },
};

export const FilterByClient: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: /자세히 찾기/ }));
    await chooseOption(canvas.getByLabelText('고객 필터'), '미래오피스');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('미래오피스 천장 마감')).toBeInTheDocument();
  },
};

export const FilterByTradeAndManager: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: /자세히 찾기/ }));
    await chooseOption(canvas.getByLabelText('공종 필터'), '설비');

    await expect(await canvas.findByText('2건')).toBeInTheDocument();

    await chooseOption(canvas.getByLabelText('담당자 필터'), '최설치');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
  },
};

// 맨 위 검색칸은 프로젝트명·번호만 찾고 현장명은 찾지 않음
export const SearchByNameCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '덕트');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();

    await userEvent.clear(canvas.getByLabelText('프로젝트 검색'));
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '기계실');

    await expect(await canvas.findByText('조건에 맞는 프로젝트가 없습니다')).toBeInTheDocument();
  },
};

// 현장명은 자세히 찾기의 현장명 칸으로 찾음
export const FilterBySite: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: /자세히 찾기/ }));
    await userEvent.type(canvas.getByLabelText('현장명'), '기계실');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('B동 덕트 설치')).toBeInTheDocument();
    await expect(canvas.getByRole('columnheader', { name: '현장명' })).toBeInTheDocument();
  },
};

export const FilterByPeriod: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: /자세히 찾기/ }));
    // 2027년 1월과 겹치는 프로젝트는 미래오피스 천장 마감뿐
    await userEvent.type(canvas.getByLabelText('기간 시작'), '2027-01-10');
    await userEvent.type(canvas.getByLabelText('기간 끝'), '2027-01-20');

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByText('미래오피스 천장 마감')).toBeInTheDocument();
  },
};

export const SortByPeriodColumn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    // 열 머리를 누르면 그 열 기준 오름차순, 한 번 더 누르면 내림차순
    await userEvent.click(canvas.getByRole('button', { name: '기간' }));

    await waitFor(() => expect(rows(canvas)[0]).toContain('C동 환기 설비'));
    await expect(rows(canvas).at(-1)).toContain('미래오피스 천장 마감');

    await userEvent.click(canvas.getByRole('button', { name: '기간' }));
    await waitFor(() => expect(rows(canvas)[0]).toContain('미래오피스 천장 마감'));
    await expect(canvas.getByRole('columnheader', { name: /기간/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  },
};

export const ClearFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.click(canvas.getByRole('button', { name: '완료' }));
    await expect(await canvas.findByText('1건')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '필터 지우기' }));

    await expect(await canvas.findByText('5건')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '필터 지우기' })).not.toBeInTheDocument();
  },
};

export const NoResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '없는프로젝트');

    await expect(await canvas.findByText('조건에 맞는 프로젝트가 없습니다')).toBeInTheDocument();
  },
};

// 프로젝트가 많으면 쪽으로 나뉘고 필터를 바꾸면 첫 쪽으로 복귀
export const Pagination: Story = {
  loaders: [
    () => {
      signIn('hanbit');

      const account = findAccount('hanbit')!;
      const base = getProjects(account)[0]!;

      saveProjects(account, [
        ...getProjects(account),
        ...Array.from({ length: 20 }, (_, index) => ({
          ...base,
          id: `00000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
          code: `2026-1${String(index).padStart(2, '0')}`,
          name: `추가 프로젝트 ${index + 1}`,
        })),
      ]);
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('25건')).toBeInTheDocument();
    // 고객·담당자 이름까지 불러온 뒤에 쪽을 넘김 (불러오면 표가 첫 쪽으로 돌아감)
    await waitFor(() =>
      expect(rows(canvas).some((text) => text.includes('가나다건설'))).toBe(true),
    );
    await waitFor(() => expect(rows(canvas).some((text) => text.includes('송소장'))).toBe(true));
    await waitFor(() => expect(rows(canvas)).toHaveLength(10));
    await expect(canvas.getByRole('button', { name: '1쪽' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await userEvent.click(canvas.getByRole('button', { name: '3쪽' }));
    await waitFor(() => expect(rows(canvas)).toHaveLength(5));

    // 쪽당 개수를 늘리면 첫 쪽부터 다시
    await chooseOption(canvas.getByLabelText('쪽당 개수'), '20개');
    await waitFor(() => expect(rows(canvas)).toHaveLength(20));
    await expect(canvas.getByRole('button', { name: '1쪽' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

// 고객·담당자 열도 머리를 눌러 가나다순으로 정렬
export const SortByClientColumn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    // 고객 이름 로딩 후 정렬
    await waitFor(() =>
      expect(rows(canvas).some((text) => text.includes('가나다건설'))).toBe(true),
    );
    await userEvent.click(canvas.getByRole('button', { name: '고객' }));

    await waitFor(() => expect(rows(canvas)[0]).toContain('가나다건설'));
    await expect(rows(canvas).at(-1)).toContain('옛날상가');
  },
};

// 타이핑 중에는 조회하지 않고 멈춘 뒤 검색어 전체로 한 번만 조회
const searchedTerms: string[] = [];

export const SearchIsDebounced: Story = {
  parameters: {
    msw: {
      handlers: [
        // 검색어가 실린 조회만 기록하고 진짜 응답은 다음 핸들러에 맡김
        http.get('/api/v1/projects', ({ request }) => {
          const q = new URL(request.url).searchParams.get('q');

          if (q) searchedTerms.push(q);
        }),
        ...handlers,
      ],
    },
  },
  beforeEach: () => {
    searchedTerms.length = 0;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await userEvent.type(canvas.getByLabelText('프로젝트 검색'), '덕트 설치', { delay: 30 });

    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(searchedTerms).toEqual(['덕트 설치']);
  },
};

// 상태는 위의 버튼 한 번으로 필터, 고객·담당자·공종·기간은 "자세히 찾기"를 펼쳐서 선택
export const StatusButtonsAndAdvancedToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');
    await expect(canvas.queryByLabelText('고객 필터')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: '진행 중' }));
    await expect(await canvas.findByText('1건')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '진행 중' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(canvas.getByRole('button', { name: /자세히 찾기/ }));
    await expect(canvas.getByLabelText('고객 필터')).toBeInTheDocument();
  },
};

// `경고 있음`을 누르면 경고가 있는 진행·중단 프로젝트만 남고 줄마다 경고 표시
export const FilterByWarning: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('A동 외장 판금 공사');

    await userEvent.click(canvas.getByRole('button', { name: '경고 있음' }));

    await waitFor(
      () => {
        const rows = canvas.getAllByRole('row').slice(1);

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(row.textContent).toMatch(/경고 기준|한도|소진|지났는데|뒤처짐/);
        }
      },
      { timeout: 5000 },
    );
  },
};
