import {
  DAILY_OVER_MAN_DAYS,
  LATE_INPUT_DAYS,
  checkWorkDate,
  dailyOverMinutes,
  isLateInput,
  validateWorkLogForSave,
  workLogStatusCheck,
  workLogSaveSchema,
} from './workLogs';

const UUID_A = '0198d000-0000-7000-8000-000000000001';
const UUID_B = '0198d000-0000-7000-8000-000000000002';
const PERIOD = { plannedStart: '2026-10-01', plannedEnd: '2026-12-31' };
const TODAY = '2026-10-20';

describe('상태별 일지 입력 (서비스 기획서 §10.3 표)', () => {
  it('진행 중에는 바로 입력할 수 있다', () => {
    expect(
      workLogStatusCheck('IN_PROGRESS', { confirmStatus: false, isAfterService: false }).ok,
    ).toBe(true);
  });

  it('중단·완료(소급)는 관리자 확인이 있어야 한다', () => {
    for (const status of ['SUSPENDED', 'COMPLETED'] as const) {
      expect(
        workLogStatusCheck(status, { confirmStatus: false, isAfterService: false }),
      ).toMatchObject({
        ok: false,
        path: 'confirmStatus',
      });
      expect(workLogStatusCheck(status, { confirmStatus: true, isAfterService: false }).ok).toBe(
        true,
      );
    }
  });

  it('보증 중에는 사후 작업으로 표시한 일지만 입력할 수 있다', () => {
    expect(
      workLogStatusCheck('WARRANTY', { confirmStatus: true, isAfterService: false }),
    ).toMatchObject({
      ok: false,
      path: 'isAfterService',
    });
    expect(workLogStatusCheck('WARRANTY', { confirmStatus: false, isAfterService: true }).ok).toBe(
      true,
    );
  });

  it('예정·종료·취소 프로젝트에는 입력할 수 없다', () => {
    for (const status of ['PLANNED', 'CLOSED', 'CANCELLED'] as const) {
      expect(
        workLogStatusCheck(status, { confirmStatus: true, isAfterService: true }),
      ).toMatchObject({
        ok: false,
        path: 'workDate',
      });
    }
  });
});

describe('작업 일자', () => {
  it('프로젝트 예정 기간 안이고 오늘 이전이면 통과한다 (경계 포함)', () => {
    expect(checkWorkDate('2026-10-01', PERIOD, TODAY).ok).toBe(true);
    expect(checkWorkDate(TODAY, PERIOD, TODAY).ok).toBe(true);
  });

  it('기간 밖이거나 미래 날짜면 거부한다', () => {
    expect(checkWorkDate('2026-09-30', PERIOD, TODAY)).toMatchObject({
      ok: false,
      path: 'workDate',
    });
    expect(checkWorkDate('2027-01-01', PERIOD, '2027-02-01')).toMatchObject({
      ok: false,
      path: 'workDate',
    });
    expect(checkWorkDate('2026-10-21', PERIOD, TODAY)).toMatchObject({
      ok: false,
      path: 'workDate',
    });
  });
});

describe('지연 입력 표시', () => {
  it('작업일과 저장일 차이가 기준일을 넘을 때만 지연 입력이다', () => {
    expect(LATE_INPUT_DAYS).toBe(3);
    expect(isLateInput('2026-10-10', '2026-10-13')).toBe(false);
    expect(isLateInput('2026-10-10', '2026-10-14')).toBe(true);
    expect(isLateInput('2026-10-10', null)).toBe(false);
  });
});

describe('하루 합계 공수 경고 기준', () => {
  it('하루 기준시간의 1.5배를 넘으면 경고 (1.0 + 1.0 = 2.0은 경고, 연장 1.5 한 번은 아님)', () => {
    expect(DAILY_OVER_MAN_DAYS).toBe(1.5);

    const limit = dailyOverMinutes(480);

    expect(limit).toBe(720);
    expect(480 + 480 > limit).toBe(true);
    expect(720 > limit).toBe(false);
  });
});

describe('저장 시 필수 항목', () => {
  const entry = { employeeId: UUID_A, categoryId: UUID_B, minutes: 480 };

  it('임시 저장은 비어 있어도 되고, 저장은 작업 내용과 공수 한 건 이상이 필요하다', () => {
    expect(validateWorkLogForSave({ status: 'DRAFT', content: '', entries: [] }).ok).toBe(true);
    expect(
      validateWorkLogForSave({ status: 'SAVED', content: '   ', entries: [entry] }),
    ).toMatchObject({
      ok: false,
      path: 'content',
    });
    expect(
      validateWorkLogForSave({ status: 'SAVED', content: '배관 설치', entries: [] }),
    ).toMatchObject({
      ok: false,
      path: 'entries',
    });
    expect(
      validateWorkLogForSave({ status: 'SAVED', content: '배관 설치', entries: [entry] }).ok,
    ).toBe(true);
  });
});

describe('저장 요청 형식', () => {
  const base = { status: 'DRAFT', content: '', entries: [] };

  it('기본값을 채우고 같은 직원·작업 구분 조합의 중복을 거부한다', () => {
    expect(workLogSaveSchema.parse(base)).toMatchObject({ isChange: false, isAfterService: false });

    const duplicated = [
      { employeeId: UUID_A, categoryId: UUID_B, minutes: 60 },
      { employeeId: UUID_A, categoryId: UUID_B, minutes: 120 },
    ];

    expect(workLogSaveSchema.safeParse({ ...base, entries: duplicated }).success).toBe(false);
  });

  it('공수는 1분 이상 24시간 이하의 정수여야 한다', () => {
    for (const minutes of [0, -1, 1.5, 1441]) {
      expect(
        workLogSaveSchema.safeParse({
          ...base,
          entries: [{ employeeId: UUID_A, categoryId: UUID_B, minutes }],
        }).success,
      ).toBe(false);
    }
  });

  it('상태·길이·버전을 검사한다', () => {
    for (const patch of [
      { status: 'DONE' },
      { content: 'a'.repeat(5001) },
      { area: 'a'.repeat(101) },
      { notes: 'a'.repeat(1001) },
      { expectedVersion: 0 },
      { expectedVersion: 1.5 },
    ]) {
      expect(workLogSaveSchema.safeParse({ ...base, ...patch }).success).toBe(false);
    }
  });
});
