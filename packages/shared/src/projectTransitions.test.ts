import {
  PROJECT_TRANSITIONS,
  allowedProjectFields,
  isProjectEditable,
  transitionDateLabel,
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
    ...patch,
  });

describe('허용된 전환 (서비스 기획서 §10.3)', () => {
  it('예정 → 진행·취소, 진행 → 중단·완료·취소, 중단 → 진행·취소만 가능하다', () => {
    expect(PROJECT_TRANSITIONS.PLANNED).toEqual(['IN_PROGRESS', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.IN_PROGRESS).toEqual(['SUSPENDED', 'COMPLETED', 'CANCELLED']);
    expect(PROJECT_TRANSITIONS.SUSPENDED).toEqual(['IN_PROGRESS', 'CANCELLED']);
  });

  it('완료·보증 중·종료·취소에서는 이 단계에서 더 바꿀 수 없다 (보증·종료는 4단계)', () => {
    for (const status of ['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'] as const) {
      expect(PROJECT_TRANSITIONS[status]).toEqual([]);
    }
  });

  it('허용되지 않은 전환은 사유와 함께 거부한다', () => {
    for (const [from, to] of [
      ['PLANNED', 'COMPLETED'],
      ['PLANNED', 'SUSPENDED'],
      ['IN_PROGRESS', 'PLANNED'],
      ['SUSPENDED', 'COMPLETED'],
      ['COMPLETED', 'IN_PROGRESS'],
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
