import {
  canEditRepair,
  isRepairOpen,
  repairCreateSchema,
  repairLinkSchema,
  repairProjectCheck,
  repairUpdateSchema,
  validateRepairTransition,
} from './repairs';

const UUID = '0198d000-0000-7000-8000-000000000001';

describe('보수 요청 스키마', () => {
  it('요청자와 내용은 필수이고 위치는 선택이다', () => {
    expect(repairCreateSchema.safeParse({ requester: '고객', content: '누수' }).success).toBe(true);
    expect(repairCreateSchema.safeParse({ requester: '', content: '누수' }).success).toBe(false);
    expect(repairCreateSchema.safeParse({ requester: '고객', content: '  ' }).success).toBe(false);
    expect(
      repairCreateSchema.safeParse({
        requester: '고객',
        content: '누수',
        location: 'a'.repeat(101),
      }).success,
    ).toBe(false);
  });

  it('수정은 바꿀 값이 하나는 있어야 한다', () => {
    expect(repairUpdateSchema.safeParse({}).success).toBe(false);
    expect(repairUpdateSchema.safeParse({ content: '수정' }).success).toBe(true);
  });

  it('연결은 일지 또는 자재 기록 중 정확히 하나여야 한다', () => {
    expect(repairLinkSchema.safeParse({ workLogId: UUID }).success).toBe(true);
    expect(repairLinkSchema.safeParse({ materialRecordId: UUID }).success).toBe(true);
    expect(repairLinkSchema.safeParse({}).success).toBe(false);
    expect(repairLinkSchema.safeParse({ workLogId: UUID, materialRecordId: UUID }).success).toBe(
      false,
    );
  });
});

describe('상태 규칙', () => {
  it('접수·처리 중이 미처리이고 보류·완료는 아니다', () => {
    expect(isRepairOpen('RECEIVED')).toBe(true);
    expect(isRepairOpen('IN_PROGRESS')).toBe(true);
    expect(isRepairOpen('ON_HOLD')).toBe(false);
    expect(isRepairOpen('DONE')).toBe(false);
  });

  it('완료된 건은 수정할 수 없다', () => {
    expect(canEditRepair('DONE')).toBe(false);
    expect(canEditRepair('RECEIVED')).toBe(true);
    expect(canEditRepair('ON_HOLD')).toBe(true);
  });

  it('보증 중인 프로젝트에서만 기록할 수 있다', () => {
    expect(repairProjectCheck('WARRANTY').ok).toBe(true);
    for (const status of [
      'PLANNED',
      'IN_PROGRESS',
      'SUSPENDED',
      'COMPLETED',
      'CLOSED',
      'CANCELLED',
    ] as const) {
      expect(repairProjectCheck(status)).toMatchObject({ ok: false });
    }
  });
});

describe('validateRepairTransition', () => {
  const base = {
    from: 'RECEIVED',
    to: 'IN_PROGRESS',
    effectiveOn: '2026-10-05',
    note: null,
    receivedOn: '2026-10-01',
    today: '2026-10-11',
  } as const;

  it('다른 상태로만 바꾸고, 날짜는 접수일 이후 오늘까지다', () => {
    expect(validateRepairTransition(base).ok).toBe(true);
    expect(validateRepairTransition({ ...base, to: 'RECEIVED' })).toMatchObject({
      ok: false,
      path: 'toStatus',
    });
    expect(validateRepairTransition({ ...base, effectiveOn: '2026-10-12' })).toMatchObject({
      ok: false,
      path: 'effectiveOn',
    });
    expect(validateRepairTransition({ ...base, effectiveOn: '2026-09-30' })).toMatchObject({
      ok: false,
      path: 'effectiveOn',
    });
  });

  it('보류와 완료 되돌리기는 메모가 필수이다', () => {
    expect(validateRepairTransition({ ...base, to: 'ON_HOLD' })).toMatchObject({
      ok: false,
      path: 'note',
    });
    expect(validateRepairTransition({ ...base, to: 'ON_HOLD', note: '자재 입고 대기' }).ok).toBe(
      true,
    );
    expect(validateRepairTransition({ ...base, from: 'DONE' })).toMatchObject({
      ok: false,
      path: 'note',
    });
    expect(validateRepairTransition({ ...base, from: 'DONE', note: '재발' }).ok).toBe(true);
    expect(validateRepairTransition({ ...base, to: 'DONE' }).ok).toBe(true);
  });
});
