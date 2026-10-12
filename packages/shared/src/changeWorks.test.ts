import {
  changeWorkCreateSchema,
  changeWorkProjectCheck,
  changeWorkTransitionSchema,
  changeWorkUpdateSchema,
  daysInStatus,
  validateChangeWorkTransition,
} from './changeWorks';

describe('changeWorkProjectCheck (§10.3)', () => {
  it('예정·진행·중단은 가능하다', () => {
    for (const status of ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'] as const) {
      expect(changeWorkProjectCheck(status, false)).toEqual({ ok: true });
    }
  });

  it('완료는 관리자 확인이 있을 때만 가능하다', () => {
    expect(changeWorkProjectCheck('COMPLETED', false)).toMatchObject({
      ok: false,
      path: 'confirmCompleted',
    });
    expect(changeWorkProjectCheck('COMPLETED', true)).toEqual({ ok: true });
  });

  it('보증 중·종료·취소는 확인해도 불가능하다', () => {
    for (const status of ['WARRANTY', 'CLOSED', 'CANCELLED'] as const) {
      expect(changeWorkProjectCheck(status, true)).toMatchObject({ ok: false, path: 'projectId' });
    }
  });
});

describe('validateChangeWorkTransition', () => {
  const base = {
    from: 'NEGOTIATING' as const,
    to: 'AGREED' as const,
    effectiveOn: '2026-10-10',
    note: null,
    requestedOn: '2026-10-05',
    today: '2026-10-11',
  };

  it('다른 상태로 요청일 이후 오늘까지의 날짜면 통과한다', () => {
    expect(validateChangeWorkTransition(base)).toEqual({ ok: true });
    expect(validateChangeWorkTransition({ ...base, effectiveOn: '2026-10-05' })).toEqual({
      ok: true,
    });
    expect(validateChangeWorkTransition({ ...base, effectiveOn: '2026-10-11' })).toEqual({
      ok: true,
    });
  });

  it('같은 상태·미래 날짜·요청일 이전 날짜는 거부한다', () => {
    expect(validateChangeWorkTransition({ ...base, to: 'NEGOTIATING' })).toMatchObject({
      path: 'toStatus',
    });
    expect(validateChangeWorkTransition({ ...base, effectiveOn: '2026-10-12' })).toMatchObject({
      path: 'effectiveOn',
    });
    expect(validateChangeWorkTransition({ ...base, effectiveOn: '2026-10-04' })).toMatchObject({
      path: 'effectiveOn',
    });
  });

  it('철회는 사유가 필수이고 합의됨에서도 철회할 수 있다', () => {
    expect(validateChangeWorkTransition({ ...base, to: 'WITHDRAWN' })).toMatchObject({
      path: 'note',
    });
    expect(
      validateChangeWorkTransition({ ...base, from: 'AGREED', to: 'WITHDRAWN', note: '고객 취소' }),
    ).toEqual({ ok: true });
  });
});

describe('입력 스키마', () => {
  it('요청자·내용은 앞뒤 공백을 지우고 비어 있으면 거부한다', () => {
    expect(
      changeWorkCreateSchema.parse({ requester: '  김소장 ', content: ' 덕트 추가 ' }),
    ).toMatchObject({
      requester: '김소장',
      content: '덕트 추가',
    });
    expect(changeWorkCreateSchema.safeParse({ requester: ' ', content: '내용' }).success).toBe(
      false,
    );
    expect(changeWorkCreateSchema.safeParse({ requester: '김소장', content: '' }).success).toBe(
      false,
    );
    expect(
      changeWorkCreateSchema.safeParse({ requester: '김소장', content: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('수정은 바꿀 값이 하나는 있어야 한다', () => {
    expect(changeWorkUpdateSchema.safeParse({}).success).toBe(false);
    expect(changeWorkUpdateSchema.safeParse({ confirmCompleted: true }).success).toBe(false);
    expect(changeWorkUpdateSchema.safeParse({ content: '수정' }).success).toBe(true);
  });

  it('상태 변경 메모는 비어 있으면 거부한다', () => {
    expect(changeWorkTransitionSchema.safeParse({ toStatus: 'AGREED', note: ' ' }).success).toBe(
      false,
    );
    expect(changeWorkTransitionSchema.safeParse({ toStatus: 'AGREED' }).success).toBe(true);
  });
});

describe('daysInStatus', () => {
  it('상태가 된 날부터 지난 일수를 센다', () => {
    expect(daysInStatus('2026-10-04', '2026-10-11')).toBe(7);
    expect(daysInStatus('2026-10-11', '2026-10-11')).toBe(0);
  });
});
