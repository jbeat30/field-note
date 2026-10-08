import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MaterialEntryForm } from './MaterialEntryForm';
import { storyMaterial, storyRecord } from './storyData';

const zinc = storyMaterial(1, { name: '아연도강판', spec: '1.0T', lastUsedOn: '2026-10-07' });
const caulk = storyMaterial(2, {
  name: '실리콘 코킹',
  unit: '개',
  category: 'CONSUMABLE',
  lastUsedOn: '2026-10-06',
});
const screws = storyMaterial(3, { name: '피스', unit: '박스', category: 'SUB' });

const meta = {
  title: 'Materials/자재 입력',
  component: MaterialEntryForm,
  args: {
    date: '2026-10-08',
    materials: [zinc, caulk, screws],
    categories: [{ id: 'cat-1', name: '설치' }],
    previousRecords: [
      storyRecord(1, { materialId: zinc.id, quantity: 10 }),
      storyRecord(2, { materialId: caulk.id, quantity: 2 }),
    ],
    onSubmit: fn(async () => undefined),
    onCreateMaterial: fn(async () => storyMaterial(9, { name: '리벳', unit: '박스' })),
  },
} satisfies Meta<typeof MaterialEntryForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// 최근 쓴 자재를 한 번 눌러 행을 만들고 수량만 적어 저장
export const RecentTapAndSave: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 쓴 적 없는 자재(피스)는 최근 목록에 없음
    await expect(canvas.queryByRole('button', { name: '피스' })).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.type(canvas.getByLabelText('수량'), '12.5');
    await userEvent.click(canvas.getByRole('button', { name: '자재 1건 저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith([
        {
          materialId: zinc.id,
          recordDate: '2026-10-08',
          kind: 'USED',
          quantity: 12.5,
          categoryId: undefined,
          area: undefined,
          isChange: false,
          isAfterService: false,
        },
      ]),
    );
    // 저장되면 행이 비워짐
    await waitFor(() => expect(canvas.queryByLabelText('수량')).not.toBeInTheDocument());
  },
};

// 같은 자재를 두 번 눌러도 행이 늘지 않음
export const TapTwiceKeepsOneRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));

    await expect(canvas.getAllByLabelText('수량')).toHaveLength(1);
  },
};

export const MultipleRowsWithKinds: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText('자재 골라서 추가'), '피스 (박스)');
    await userEvent.click(canvas.getByRole('button', { name: '실리콘 코킹' }));

    const [kinds, quantities] = [
      canvas.getAllByLabelText('구분'),
      canvas.getAllByLabelText('수량'),
    ];

    await userEvent.selectOptions(kinds[0]!, '반입');
    await userEvent.type(quantities[0]!, '3');
    await userEvent.type(quantities[1]!, '1');
    await userEvent.click(canvas.getByRole('button', { name: '자재 2건 저장' }));

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalled());
    await expect(vi_calls(args.onSubmit)).toEqual([
      ['RECEIVED', 3],
      ['USED', 1],
    ]);
  },
};

// 저장 요청에서 구분·수량만 뽑아 비교
const vi_calls = (mock: unknown) => {
  const [records] = (mock as { mock: { calls: unknown[][] } }).mock.calls[0]!;

  return (records as { quantity: number; kind: string }[]).map((item) => [
    item.kind,
    item.quantity,
  ]);
};

export const CopyYesterday: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '어제와 동일' }));

    await expect(canvas.getAllByLabelText('수량')).toHaveLength(2);
    await expect(
      canvas.getAllByLabelText('수량').map((input) => (input as HTMLInputElement).value),
    ).toEqual(['10', '2']);
  },
};

export const CopyDisabledWithoutPrevious: Story = {
  args: { previousRecords: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: '어제와 동일' })).toBeDisabled();
  },
};

// 목록에 없는 자재를 그 자리에서 만들어 바로 행에 넣음
export const CreateMaterialOnTheSpot: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '새 자재' }));

    const group = within(canvas.getByRole('group', { name: '새 자재 만들기' }));

    await userEvent.type(group.getByLabelText('자재명'), '리벳');
    await userEvent.click(group.getByRole('button', { name: '자재 추가하고 입력 행에 넣기' }));

    await waitFor(() =>
      expect(args.onCreateMaterial).toHaveBeenCalledWith({
        name: '리벳',
        spec: undefined,
        unit: '장',
        category: 'CONSUMABLE',
      }),
    );
    await waitFor(() => expect(canvas.getAllByLabelText('수량')).toHaveLength(1));
  },
};

export const CreateMaterialFails: Story = {
  args: {
    onCreateMaterial: fn(async () => {
      throw {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력 값을 확인해 주세요',
          details: [{ path: 'body.name', message: '같은 이름과 규격의 자재가 이미 있습니다' }],
        },
      };
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '새 자재' }));
    await userEvent.type(canvas.getByLabelText('자재명'), '아연도강판');
    await userEvent.click(canvas.getByRole('button', { name: '자재 추가하고 입력 행에 넣기' }));

    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      '같은 이름과 규격의 자재가 이미 있습니다',
    );
  },
};

export const InvalidQuantityIsShown: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.type(canvas.getByLabelText('수량'), '1.2345');
    await userEvent.click(canvas.getByRole('button', { name: '자재 저장' }));

    await expect(await canvas.findByText(/0보다 큰 숫자/)).toBeInTheDocument();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

// 저장이 실패해도 입력한 행은 남음
export const SaveFailsKeepsRows: Story = {
  args: {
    onSubmit: fn(async () => {
      throw { error: { code: 'VALIDATION_ERROR', message: '입력 값을 확인해 주세요' } };
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.type(canvas.getByLabelText('수량'), '5');
    await userEvent.click(canvas.getByRole('button', { name: '자재 1건 저장' }));

    await expect(await canvas.findByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByLabelText('수량')).toHaveValue('5');
  },
};

export const CommonOptions: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '아연도강판 1.0T' }));
    await userEvent.type(canvas.getByLabelText('수량'), '2');
    await userEvent.click(canvas.getByRole('button', { name: /작업 구분·구역·변경 작업 표시/ }));
    await userEvent.selectOptions(canvas.getByLabelText('작업 구분'), '설치');
    await userEvent.type(canvas.getByLabelText('구역'), '3층');
    await userEvent.click(canvas.getByLabelText('변경·추가 작업에 쓴 자재'));
    await userEvent.click(canvas.getByRole('button', { name: '자재 1건 저장' }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith([
        expect.objectContaining({
          categoryId: 'cat-1',
          area: '3층',
          isChange: true,
          isAfterService: false,
        }),
      ]),
    );
  },
};
