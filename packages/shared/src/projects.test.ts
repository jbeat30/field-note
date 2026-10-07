import {
  formatProjectCode,
  PROJECT_CODE_PATTERN,
  projectCreateSchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from './projects';

const UUID_A = '0198d000-0000-7000-8000-000000000001';
const UUID_B = '0198d000-0000-7000-8000-000000000002';

const valid = {
  name: '  A동 판금 공사 ',
  siteName: 'A동 신축 현장',
  clientId: UUID_A,
  managerId: UUID_B,
  contractDate: '2026-09-01',
  plannedStart: '2026-10-01',
  plannedEnd: '2026-12-31',
};

describe('프로젝트 코드', () => {
  it('연도와 3자리 이상의 순번으로 만든다', () => {
    expect(formatProjectCode(2026, 12)).toBe('2026-012');
    expect(formatProjectCode(2026, 1)).toBe('2026-001');
    expect(formatProjectCode(2026, 1234)).toBe('2026-1234');
    expect(PROJECT_CODE_PATTERN.test('2026-012')).toBe(true);
    expect(PROJECT_CODE_PATTERN.test('26-12')).toBe(false);
  });
});

describe('프로젝트 등록 검증', () => {
  it('필수 항목만 있으면 등록할 수 있고 이름은 공백을 지운다', () => {
    expect(projectCreateSchema.parse(valid).name).toBe('A동 판금 공사');
  });

  it('필수 항목이 하나라도 빠지면 거부한다', () => {
    for (const key of [
      'name',
      'siteName',
      'clientId',
      'managerId',
      'contractDate',
      'plannedStart',
      'plannedEnd',
    ]) {
      const body: Record<string, unknown> = { ...valid };

      delete body[key];

      expect(projectCreateSchema.safeParse(body).success).toBe(false);
    }
  });

  it('종료 예정일이 시작 예정일보다 빠르면 종료일 칸에 오류를 낸다', () => {
    const result = projectCreateSchema.safeParse({
      ...valid,
      plannedStart: '2026-12-31',
      plannedEnd: '2026-10-01',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['plannedEnd']);
    expect(
      projectCreateSchema.safeParse({
        ...valid,
        plannedStart: '2026-10-01',
        plannedEnd: '2026-10-01',
      }).success,
    ).toBe(true);
  });

  it('지도 링크는 http(s)만, 연락처는 숫자 형식만 허용한다', () => {
    expect(
      projectCreateSchema.safeParse({ ...valid, siteMapUrl: 'https://map.example.com/abc' })
        .success,
    ).toBe(true);
    for (const siteMapUrl of [
      'javascript:alert(1)',
      'ftp://x.com',
      'map.example.com',
      'https://a b.com',
    ]) {
      expect(projectCreateSchema.safeParse({ ...valid, siteMapUrl }).success).toBe(false);
    }
    expect(projectCreateSchema.safeParse({ ...valid, siteContactPhone: '전화' }).success).toBe(
      false,
    );
  });

  it('날짜 형식·범위, 공종 개수, 문자 길이를 검사한다', () => {
    for (const patch of [
      { contractDate: '2026-13-01' },
      { plannedStart: '1999-01-01' },
      { plannedEnd: '2100-01-01' },
      {
        tradeIds: Array.from(
          { length: 11 },
          (_, index) => `0198d000-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`,
        ),
      },
      { name: '가'.repeat(101) },
      { memo: 'a'.repeat(1001) },
    ]) {
      expect(projectCreateSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
    }
  });
});

describe('프로젝트 수정 검증', () => {
  it('코드와 상태는 보내도 무시되어 바꿀 수 없다', () => {
    expect(projectUpdateSchema.safeParse({ code: '2026-999', status: 'CLOSED' }).success).toBe(
      false,
    );
    expect(projectUpdateSchema.parse({ name: '고침', code: '2026-999' })).toEqual({ name: '고침' });
  });

  it('바꿀 값이 하나는 있어야 하고 기간은 함께 보낼 때 순서를 검사한다', () => {
    expect(projectUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      projectUpdateSchema.safeParse({ plannedStart: '2026-12-31', plannedEnd: '2026-10-01' })
        .success,
    ).toBe(false);
    expect(projectUpdateSchema.safeParse({ plannedEnd: '2026-10-01' }).success).toBe(true);
  });
});

describe('목록 조회 조건', () => {
  it('상태·정렬 값을 검사한다', () => {
    expect(
      projectListQuerySchema.safeParse({ status: 'IN_PROGRESS', sort: 'endDate' }).success,
    ).toBe(true);
    expect(projectListQuerySchema.safeParse({ status: 'NOPE' }).success).toBe(false);
    expect(projectListQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
    expect(projectListQuerySchema.safeParse({ from: '2026-99-99' }).success).toBe(false);
  });
});
