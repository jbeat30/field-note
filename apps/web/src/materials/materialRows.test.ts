import {
  EMPTY_COMMON,
  addRow,
  checkRows,
  copyUsedRows,
  newRow,
  parseQuantity,
  recentMaterials,
  toRecords,
} from './materialRows';

describe('수량 입력', () => {
  it('쉼표·공백을 무시하고 소수 셋째 자리까지의 양수만 받는다', () => {
    expect(parseQuantity('12')).toBe(12);
    expect(parseQuantity(' 1,250.5 ')).toBe(1250.5);
    expect(parseQuantity('0.125')).toBe(0.125);

    for (const bad of ['', '0', '-3', '1.2345', '열', '1e3', '10000000', '.5', '1.']) {
      expect(parseQuantity(bad)).toBeNull();
    }
  });
});

describe('자재 행', () => {
  it('같은 자재·구분을 다시 추가해도 행이 늘지 않고 기존 행으로 이어 입력한다', () => {
    const first = addRow([], 'm1');
    const again = addRow(first.rows, 'm1');
    const received = addRow(again.rows, 'm1', 'RECEIVED');

    expect(first.rows).toHaveLength(1);
    expect(again.rows).toHaveLength(1);
    expect(again.focusKey).toBe(first.focusKey);
    expect(received.rows).toHaveLength(2);
  });

  it('수량이 비어 있는 행은 저장 대상이 아니고, 수량이 있는데 자재가 없거나 수량이 잘못되면 문제로 알린다', () => {
    const rows = [
      newRow('m1', 'USED', '5'),
      newRow('m2', 'USED', ''),
      newRow('', 'USED', '3'),
      newRow('m3', 'USED', '1.2345'),
      newRow('', 'USED', ''),
    ];
    const { problems, savable } = checkRows(rows);

    expect(savable).toBe(1);
    expect(problems.map((problem) => problem.key)).toEqual([rows[2]!.key, rows[3]!.key]);
  });

  it('저장 요청에는 올바른 행만 담고 공통 항목은 비어 있으면 보내지 않는다', () => {
    const rows = [
      newRow('m1', 'USED', '2.5'),
      newRow('m2', 'RECEIVED', ''),
      newRow('m3', 'RECEIVED', '10'),
    ];

    expect(toRecords(rows, '2026-10-08', EMPTY_COMMON)).toEqual([
      {
        materialId: 'm1',
        recordDate: '2026-10-08',
        kind: 'USED',
        quantity: 2.5,
        categoryId: undefined,
        area: undefined,
        isChange: false,
        isAfterService: false,
      },
      {
        materialId: 'm3',
        recordDate: '2026-10-08',
        kind: 'RECEIVED',
        quantity: 10,
        categoryId: undefined,
        area: undefined,
        isChange: false,
        isAfterService: false,
      },
    ]);
    expect(
      toRecords(rows.slice(0, 1), '2026-10-08', {
        categoryId: 'c1',
        area: ' 301호 ',
        isChange: true,
        isAfterService: false,
      })[0],
    ).toMatchObject({ categoryId: 'c1', area: '301호', isChange: true });
  });
});

describe('어제와 동일', () => {
  const materials = [
    { id: 'm1', isActive: true },
    { id: 'm2', isActive: true },
    { id: 'hidden', isActive: false },
  ];

  it('사용 기록만 같은 자재·수량으로 복사하고 같은 자재는 합산한다', () => {
    const rows = copyUsedRows(
      [
        { materialId: 'm1', kind: 'USED', quantity: 10 },
        { materialId: 'm1', kind: 'USED', quantity: 2.5 },
        { materialId: 'm2', kind: 'RECEIVED', quantity: 100 },
        { materialId: 'm2', kind: 'USED', quantity: 4 },
      ],
      materials,
    );

    expect(rows.map((row) => [row.materialId, row.kind, row.quantity])).toEqual([
      ['m1', 'USED', '12.5'],
      ['m2', 'USED', '4'],
    ]);
  });

  it('숨긴 자재와 목록에 없는 자재는 복사하지 않는다', () => {
    expect(
      copyUsedRows(
        [
          { materialId: 'hidden', kind: 'USED', quantity: 1 },
          { materialId: 'gone', kind: 'USED', quantity: 1 },
        ],
        materials,
      ),
    ).toEqual([]);
  });
});

describe('최근 쓴 자재', () => {
  it('기록이 있는 보이는 자재만 앞에서 정한 개수만큼', () => {
    const list = [
      { id: 'a', lastUsedOn: '2026-10-05', isActive: true },
      { id: 'b', lastUsedOn: '2026-10-04', isActive: false },
      { id: 'c', lastUsedOn: '2026-10-03', isActive: true },
      { id: 'd', lastUsedOn: null, isActive: true },
    ];

    expect(recentMaterials(list, 2).map((item) => item.id)).toEqual(['a', 'c']);
  });
});
