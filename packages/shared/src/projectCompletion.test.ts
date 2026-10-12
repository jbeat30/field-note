import { evaluateTransitionNotices, transitionNoticeMessage } from './projectCompletion';

const base = {
  from: 'IN_PROGRESS' as const,
  to: 'COMPLETED' as const,
  draftLogCount: 0,
  progressPercent: 100,
  materials: [],
  negotiatingCount: 0,
  plannedEnd: '2026-12-31',
  today: '2026-10-11',
};

const M = '0198d000-0000-7000-8000-0000000000a1';

describe('evaluateTransitionNotices (§10.3)', () => {
  it('완료 전에 확인할 것이 없으면 빈 목록이다', () => {
    expect(evaluateTransitionNotices(base)).toEqual([]);
  });

  it('진행 → 완료에서 임시 저장 일지·진행률·남은 자재·협의 중 변경 작업을 알린다', () => {
    const checks = evaluateTransitionNotices({
      ...base,
      draftLogCount: 2,
      progressPercent: 80,
      materials: [
        { materialId: M, name: '덕트', spec: null, unit: '장', remaining: 15 },
        { materialId: M, name: '볼트', spec: null, unit: '개', remaining: 0 },
        { materialId: M, name: '실리콘', spec: null, unit: '개', remaining: -3 },
      ],
      negotiatingCount: 1,
    });

    expect(checks.map((check) => check.type)).toEqual([
      'DRAFT_LOGS',
      'PROGRESS_BELOW_100',
      'REMAINING_MATERIALS',
      'NEGOTIATING_CHANGES',
    ]);
    // 잔량이 0인 자재는 빼고 마이너스는 넣는다
    expect(checks[2]).toMatchObject({
      items: [
        expect.objectContaining({ name: '덕트' }),
        expect.objectContaining({ name: '실리콘' }),
      ],
    });
  });

  it('종료 전환에서는 임시 저장 일지만 알리고 진행률·자재는 묻지 않는다', () => {
    const close = {
      ...base,
      from: 'WARRANTY' as const,
      to: 'CLOSED' as const,
      progressPercent: 50,
    };

    expect(evaluateTransitionNotices(close)).toEqual([]);
    expect(evaluateTransitionNotices({ ...close, draftLogCount: 1 })).toEqual([
      { type: 'DRAFT_LOGS', count: 1 },
    ]);
  });

  it('진행률 기록이 없으면 기록을 요청한다', () => {
    const [check] = evaluateTransitionNotices({ ...base, progressPercent: null });

    expect(check).toEqual({ type: 'PROGRESS_BELOW_100', percent: null });
    expect(transitionNoticeMessage(check!)).toContain('진행률 기록이 없습니다');
  });

  it('중단 → 진행은 종료 예정일이 지났을 때만 기간 연장을 안내한다', () => {
    const resume = { ...base, from: 'SUSPENDED' as const, to: 'IN_PROGRESS' as const };

    expect(evaluateTransitionNotices(resume)).toEqual([]);
    expect(evaluateTransitionNotices({ ...resume, today: '2027-01-02' })).toEqual([
      { type: 'PERIOD_OVER', plannedEnd: '2026-12-31' },
    ]);
    // 처음 시작(예정 → 진행)은 점검하지 않는다
    expect(evaluateTransitionNotices({ ...resume, from: 'PLANNED', today: '2027-01-02' })).toEqual(
      [],
    );
  });

  it('완료 외의 전환에서는 완료용 점검을 하지 않는다', () => {
    expect(
      evaluateTransitionNotices({
        ...base,
        to: 'SUSPENDED',
        draftLogCount: 3,
        progressPercent: 10,
      }),
    ).toEqual([]);
  });

  it('안내 문장에 건수와 자재 이름이 들어간다', () => {
    expect(transitionNoticeMessage({ type: 'DRAFT_LOGS', count: 2 })).toContain('2건');
    expect(transitionNoticeMessage({ type: 'NEGOTIATING_CHANGES', count: 1 })).toContain('1건');
    expect(
      transitionNoticeMessage({
        type: 'REMAINING_MATERIALS',
        items: [
          { materialId: M, name: '덕트', spec: null, unit: '장', remaining: 15 },
          { materialId: M, name: 'A', spec: null, unit: '개', remaining: 1 },
          { materialId: M, name: 'B', spec: null, unit: '개', remaining: 1 },
          { materialId: M, name: 'C', spec: null, unit: '개', remaining: 1 },
        ],
      }),
    ).toMatch(/덕트 15장.*등/);
  });
});
