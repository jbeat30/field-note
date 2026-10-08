import {
  compareMaterials,
  materialCreateSchema,
  materialRecordBatchSchema,
  materialRecordCreateSchema,
  normalizeMaterialText,
  summarizeMaterialBalance,
  type Material,
} from './materials';

const MATERIAL = '018f3b1e-0000-7000-8000-000000000001';
const base = {
  materialId: MATERIAL,
  recordDate: '2026-10-05',
  kind: 'USED' as const,
  quantity: 1,
};

const record = (
  kind: 'RECEIVED' | 'USED' | 'RETURNED' | 'DISCARDED',
  quantity: number,
  extra = {},
) => ({
  materialId: MATERIAL,
  kind,
  quantity,
  isChange: false,
  isAfterService: false,
  ...extra,
});

describe('잔량 집계', () => {
  const materials = [{ id: MATERIAL, name: '아연도강판', spec: '1.0T', unit: '장' }];

  it('서비스 기획서 예시: 반입 100, 사용 72, 반출 10, 폐기 3이면 잔량 15장', () => {
    const [item] = summarizeMaterialBalance(
      [
        record('RECEIVED', 60),
        record('RECEIVED', 40),
        record('USED', 40),
        record('USED', 32),
        record('RETURNED', 10),
        record('DISCARDED', 3),
      ],
      materials,
    );

    expect(item).toMatchObject({
      received: 100,
      used: 72,
      returned: 10,
      discarded: 3,
      remaining: 15,
      isNegative: false,
    });
  });

  it('잔량이 마이너스면 경고 표시를 하되 값은 그대로 보여 준다', () => {
    const [item] = summarizeMaterialBalance([record('RECEIVED', 5), record('USED', 8)], materials);

    expect(item).toMatchObject({ remaining: -3, isNegative: true });
  });

  it('변경·추가 작업과 사후 작업에 쓴 양을 따로 센다', () => {
    const [item] = summarizeMaterialBalance(
      [
        record('RECEIVED', 20),
        record('USED', 4, { isChange: true }),
        record('USED', 2, { isAfterService: true }),
        record('USED', 1, { isChange: true, isAfterService: true }),
        // 반입에 붙은 표시는 사용량에 세지 않음
        record('RECEIVED', 3, { isChange: true }),
      ],
      materials,
    );

    expect(item).toMatchObject({ used: 7, usedForChange: 5, usedForAfterService: 3 });
  });

  it('소수 수량도 오차 없이 더한다', () => {
    const [item] = summarizeMaterialBalance(
      [record('RECEIVED', 0.3), record('USED', 0.1), record('USED', 0.2)],
      materials,
    );

    expect(item).toMatchObject({ used: 0.3, remaining: 0 });
  });

  it('자재별로 나뉘고 이름순으로 정렬한다', () => {
    const other = '018f3b1e-0000-7000-8000-000000000002';
    const items = summarizeMaterialBalance(
      [record('RECEIVED', 1), { ...record('RECEIVED', 1), materialId: other }],
      [...materials, { id: other, name: '가죽', spec: null, unit: '장' }],
    );

    expect(items.map((item) => item.name)).toEqual(['가죽', '아연도강판']);
  });
});

describe('자재 입력 검증', () => {
  it('이름과 단위만으로 만들 수 있고 분류는 소모품으로 시작한다', () => {
    expect(materialCreateSchema.parse({ name: ' 코킹 ', unit: '개' })).toEqual({
      name: '코킹',
      unit: '개',
      category: 'CONSUMABLE',
    });
  });

  it('같은 이름도 규격이 다르면 비교용 값이 다르다', () => {
    expect(normalizeMaterialText('아연도강판')).toBe(normalizeMaterialText(' 아연도 강판 '));
    expect(normalizeMaterialText('Zn 0.8T')).toBe(normalizeMaterialText('zn0.8t'));
    expect(normalizeMaterialText('1.0T')).not.toBe(normalizeMaterialText('0.8T'));
  });

  it('수량은 0보다 크고 소수 셋째 자리까지만 받는다', () => {
    expect(materialRecordCreateSchema.safeParse({ ...base, quantity: 12.345 }).success).toBe(true);

    for (const quantity of [0, -1, 1.2345, 10_000_000]) {
      expect(materialRecordCreateSchema.safeParse({ ...base, quantity }).success).toBe(false);
    }
  });

  it('일괄 입력은 한 건 이상 50건까지다', () => {
    expect(materialRecordBatchSchema.safeParse({ records: [] }).success).toBe(false);
    expect(materialRecordBatchSchema.safeParse({ records: [base] }).success).toBe(true);
    expect(
      materialRecordBatchSchema.safeParse({ records: Array.from({ length: 51 }, () => base) })
        .success,
    ).toBe(false);
  });
});

describe('자재 정렬', () => {
  const make = (name: string, lastUsedOn: string | null): Material => ({
    id: `0198d000-0000-7000-8000-${String(name.length).padStart(12, '0')}`,
    name,
    spec: null,
    unit: '장',
    category: 'RAW',
    isActive: true,
    lastUsedOn,
  });

  it('최근 쓴 자재가 먼저이고 쓴 적 없는 자재는 이름순으로 뒤에 둔다', () => {
    const sorted = [
      make('나', null),
      make('다', '2026-10-01'),
      make('가', null),
      make('라', '2026-10-05'),
    ].sort(compareMaterials);

    expect(sorted.map((item) => item.name)).toEqual(['라', '다', '가', '나']);
  });
});
