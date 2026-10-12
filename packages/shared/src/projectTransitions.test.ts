import {
  PROJECT_TRANSITIONS,
  allowedProjectFields,
  isProjectEditable,
  transitionDateLabel,
  transitionNeedsReason,
  transitionNeedsSummaryConfirm,
  validateProjectTransition,
  type TransitionCheckInput,
} from './projectTransitions';

const TODAY = '2026-10-07';

const check = (patch: Partial<TransitionCheckInput> & Pick<TransitionCheckInput, 'from' | 'to'>) =>
  validateProjectTransition({
    effectiveOn: '2026-10-01',
    reason: null,
    actualStart: null,
    lastEffectiveOn: null,
    today: TODAY,
    confirmSummary: false,
    draftLogCount: 0,
    ...patch,
  });

describe('허용된 전환 (서비스 기획서 §10.3)', () => {
  it('예정 → 진행·취소, 진행 → 중단·완료·취소, 중단 → 진행·취소만 가능하다', () => {
    expect(PROJECT_TRANSITIONS.PLANNED).toEqual(['IN_PROGRESS', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.IN_PROGRESS).toEqual(['SUSPENDED', 'COMPLETED', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.SUSPENDED).toEqual(['IN_PROGRESS', 'CANCELLED']);
  });

  it('완료 → 보증 중·종료, 보증 중 → 종료, 종료 → 보증 중(재오픈)이 가능하다', () => {
    expect(PROJECT_TRANSITIONS.COMPLETED).toEqual(['WARRANTY', 'CLOSED']);
    expect(PROJECT_TRANSITIONS.WARRANTY).toEqual(['CLOSED']);
    expect(PROJECT_TRANSITIONS.CLOSED).toEqual(['WARRANTY']);
  });

  it('취소에서는 더 바꿀 수 없다', () => {
    expect(PROJECT_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('허용되지 않은 전환은 사유와 함께 거부한다', () => {
    for (const [from, to] of [
      ['PLANNED', 'COMPLETED'],
      ['PLANNED', 'SUSPENDED'],
      ['IN_PROGRESS', 'PLANNED'],
      ['SUSPENDED', 'COMPLETED'],
      ['COMPLETED', 'IN_PROGRESS'],
      ['WARRANTY', 'COMPLETED'],
      ['CLOSED', 'COMPLETED'],
      ['CANCELLED', 'IN_PROGRESS'],
    ] as const) {
      const result = check({ from, to, reason: '사유' });

      expect(result).toMatchObject({ ok: false, path: 'toStatus' });
    }
  });
});

describe('날짜 규칙', () => {
  it('상태가 바뀐 날은 오늘까지만 입력할 수 있다 (미래 날짜 불가)', () => {
    expect(check({ from: 'PLANNED', to: 'IN_PROGRESS', effectiveOn: TODAY }).ok).toBe(true);
    expect(check({ from: 'PLANNED', to: 'IN_PROGRESS', effectiveOn: '2026-10-08' })).toMatchObject({
      ok: false,
      path: 'effectiveOn',
    });
  });

  it('이전 상태 변경일보다 빠를 수 없다', () => {
    expect(
      check({
        from: 'IN_PROGRESS',
        to: 'SUSPENDED',
        reason: '우천',
        actualStart: '2026-09-01',
        lastEffectiveOn: '2026-09-20',
        effectiveOn: '2026-09-10',
      }),
    ).toMatchObject({ ok: false, path: 'effectiveOn' });
    expect(
      check({
        from: 'IN_PROGRESS',
        to: 'SUSPENDED',
        reason: '우천',
        actualStart: '2026-09-01',
        lastEffectiveOn: '2026-09-20',
        effectiveOn: '2026-09-20',
      }).ok,
    ).toBe(true);
  });

  it('완료일은 실제 시작일보다 빠를 수 없다', () => {
    expect(
      check({
        from: 'IN_PROGRESS',
        to: 'COMPLETED',
        actualStart: '2026-09-15',
        effectiveOn: '2026-09-10',
      }),
    ).toMatchObject({ ok: false, path: 'effectiveOn' });
  });

  it('날짜에 붙는 이름은 전환마다 다르다', () => {
    expect(transitionDateLabel('PLANNED', 'IN_PROGRESS')).toBe('실제 시작일');
    expect(transitionDateLabel('SUSPENDED', 'IN_PROGRESS')).toBe('재개일');
    expect(transitionDateLabel('IN_PROGRESS', 'SUSPENDED')).toBe('중단일');
    expect(transitionDateLabel('IN_PROGRESS', 'COMPLETED')).toBe('실제 완료일');
    expect(transitionDateLabel('IN_PROGRESS', 'CANCELLED')).toBe('취소일');
    expect(transitionDateLabel('COMPLETED', 'WARRANTY')).toBe('보증 시작일');
    expect(transitionDateLabel('WARRANTY', 'CLOSED')).toBe('종료일');
    expect(transitionDateLabel('CLOSED', 'WARRANTY')).toBe('재오픈일');
  });
});

describe('사유', () => {
  it('중단과 취소는 사유가 필수이고 진행·완료는 선택이다', () => {
    expect(check({ from: 'IN_PROGRESS', to: 'SUSPENDED', reason: null })).toMatchObject({
      ok: false,
      path: 'reason',
    });
    expect(check({ from: 'IN_PROGRESS', to: 'SUSPENDED', reason: '   ' })).toMatchObject({
      ok: false,
      path: 'reason',
    });
    expect(check({ from: 'PLANNED', to: 'CANCELLED', reason: null })).toMatchObject({
      ok: false,
      path: 'reason',
    });
    expect(check({ from: 'PLANNED', to: 'CANCELLED', reason: '계약 해지' }).ok).toBe(true);
    expect(check({ from: 'PLANNED', to: 'IN_PROGRESS', reason: null }).ok).toBe(true);
  });

  it('사유는 500자까지다', () => {
    expect(check({ from: 'PLANNED', to: 'CANCELLED', reason: 'a'.repeat(501) })).toMatchObject({
      ok: false,
      path: 'reason',
    });
  });
});

describe('보증·종료 전환 조건 (§10.3)', () => {
  it('종료와 재오픈은 사유가 필수이고 보증 시작은 선택이다', () => {
    expect(transitionNeedsReason('COMPLETED', 'CLOSED')).toBe(true);
    expect(transitionNeedsReason('WARRANTY', 'CLOSED')).toBe(true);
    expect(transitionNeedsReason('CLOSED', 'WARRANTY')).toBe(true);
    expect(transitionNeedsReason('COMPLETED', 'WARRANTY')).toBe(false);
    expect(check({ from: 'WARRANTY', to: 'CLOSED', reason: null })).toMatchObject({
      ok: false,
      path: 'reason',
    });
    expect(check({ from: 'CLOSED', to: 'WARRANTY', reason: null })).toMatchObject({
      ok: false,
      path: 'reason',
    });
    expect(check({ from: 'WARRANTY', to: 'CLOSED', reason: '보증 만료' }).ok).toBe(true);
    expect(check({ from: 'CLOSED', to: 'WARRANTY', reason: '재보수 요청' }).ok).toBe(true);
  });

  it('완료 → 보증 중은 프로젝트 요약을 확인해야 한다', () => {
    expect(transitionNeedsSummaryConfirm('COMPLETED', 'WARRANTY')).toBe(true);
    expect(transitionNeedsSummaryConfirm('CLOSED', 'WARRANTY')).toBe(false);
    expect(check({ from: 'COMPLETED', to: 'WARRANTY' })).toMatchObject({
      ok: false,
      path: 'confirmSummary',
    });
    expect(check({ from: 'COMPLETED', to: 'WARRANTY', confirmSummary: true }).ok).toBe(true);
  });

  it('종료는 임시 저장된 작업일지가 남아 있으면 막는다', () => {
    expect(
      check({ from: 'WARRANTY', to: 'CLOSED', reason: '만료', draftLogCount: 2 }),
    ).toMatchObject({ ok: false, path: 'toStatus' });
    expect(check({ from: 'COMPLETED', to: 'CLOSED', reason: '보증 없음' }).ok).toBe(true);
  });

  it('완료일 이후 날짜만 보증 시작일로 입력할 수 있다', () => {
    expect(
      check({
        from: 'COMPLETED',
        to: 'WARRANTY',
        confirmSummary: true,
        lastEffectiveOn: '2026-10-05',
        effectiveOn: '2026-10-04',
      }),
    ).toMatchObject({ ok: false, path: 'effectiveOn' });
  });
});

describe('상태별 수정 제한 (§10.3 허용 작업 표)', () => {
  it('종료·취소는 수정할 수 없고 나머지는 수정할 수 있다', () => {
    expect(isProjectEditable('CLOSED')).toBe(false);
    expect(isProjectEditable('CANCELLED')).toBe(false);
    for (const status of [
      'PLANNED',
      'IN_PROGRESS',
      'SUSPENDED',
      'COMPLETED',
      'WARRANTY',
    ] as const) {
      expect(isProjectEditable(status)).toBe(true);
    }
  });

  it('보증 중에는 담당자·메모만 수정할 수 있다', () => {
    expect(allowedProjectFields('WARRANTY')).toEqual(['managerId', 'memo']);
    expect(allowedProjectFields('PLANNED')).toBe('all');
    expect(allowedProjectFields('CLOSED')).toEqual([]);
    expect(allowedProjectFields('CANCELLED')).toEqual([]);
  });
});
