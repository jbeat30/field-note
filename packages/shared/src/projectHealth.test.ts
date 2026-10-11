import {
  canRecordProgress,
  evaluateProjectHealth,
  progressRecordCreateSchema,
} from './projectHealth';

const base = {
  status: 'IN_PROGRESS' as const,
  plannedMinutes: 80 * 480,
  usedMinutes: 56 * 480,
  progressPercent: 45,
  progressRecordedOn: '2026-10-05',
  plannedStart: '2026-09-01',
  plannedEnd: '2026-12-31',
  today: '2026-10-11',
};

describe('evaluateProjectHealth', () => {
  it('기획서 §10.4 예시: 계획 80MD·투입 56MD·진행률 45%면 소진율 70%, 필요 공수 124MD, 소진 과다 경고', () => {
    const health = evaluateProjectHealth(base);

    expect(health.burnPercent).toBe(70);
    expect(health.forecastMinutes).toBe(Math.round((56 * 480 * 100) / 45));
    expect(Math.round(health.forecastMinutes! / 480)).toBe(124);
    expect(health.warnings).toEqual(['BURN_AHEAD']);
  });

  it('소진율 80%·100% 도달을 각각 알리고 100%면 80% 경고는 따로 내지 않는다', () => {
    expect(
      evaluateProjectHealth({ ...base, usedMinutes: 64 * 480, progressPercent: 70 }).warnings,
    ).toEqual(['BURN_WARN']);
    expect(
      evaluateProjectHealth({ ...base, usedMinutes: 80 * 480, progressPercent: 90 }).warnings,
    ).toEqual(['BURN_LIMIT']);
    expect(
      evaluateProjectHealth({ ...base, usedMinutes: 63 * 480, progressPercent: 70 }).warnings,
    ).toEqual([]);
  });

  it('계획 공수가 없으면 소진율·소진 관련 경고가 없다', () => {
    const health = evaluateProjectHealth({ ...base, plannedMinutes: null });

    expect(health.burnPercent).toBeNull();
    expect(health.warnings).toEqual([]);
  });

  it('진행률 기록이 없거나 0%면 필요 공수를 계산하지 않는다', () => {
    expect(evaluateProjectHealth({ ...base, progressPercent: null }).forecastMinutes).toBeNull();
    expect(evaluateProjectHealth({ ...base, progressPercent: 0 }).forecastMinutes).toBeNull();
  });

  it('종료 예정일이 지났는데 끝나지 않았으면 지연 경고', () => {
    expect(
      evaluateProjectHealth({ ...base, today: '2027-01-01', progressPercent: 90 }).warnings,
    ).toContain('OVERDUE');
    expect(
      evaluateProjectHealth({ ...base, status: 'SUSPENDED', today: '2027-01-01' }).warnings,
    ).toContain('OVERDUE');
  });

  it('진행률이 일정 경과율보다 20%p 이상 뒤처지면 일정 경고 (지연 경고와는 따로)', () => {
    // 9/1~12/31(122일) 중 10/11까지 41일 경과 ≈ 33.6%
    expect(
      evaluateProjectHealth({ ...base, usedMinutes: 10 * 480, progressPercent: 10 }).warnings,
    ).toEqual(['BEHIND_SCHEDULE']);
    expect(
      evaluateProjectHealth({ ...base, usedMinutes: 10 * 480, progressPercent: 20 }).warnings,
    ).toEqual([]);
  });

  it('진행 중이 아닌 상태에서는 경고하지 않는다', () => {
    for (const status of ['PLANNED', 'COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'] as const) {
      expect(
        evaluateProjectHealth({ ...base, status, usedMinutes: 90 * 480, today: '2027-02-01' })
          .warnings,
      ).toEqual([]);
    }
  });
});

describe('진행률 입력 규칙', () => {
  it('예정·진행·중단에서만 입력할 수 있다', () => {
    expect(
      ['PLANNED', 'IN_PROGRESS', 'SUSPENDED'].every((status) => canRecordProgress(status as never)),
    ).toBe(true);
    expect(
      ['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'].some((status) =>
        canRecordProgress(status as never),
      ),
    ).toBe(false);
  });

  it('0~100 정수만 받고 빈 메모는 거부한다', () => {
    expect(progressRecordCreateSchema.safeParse({ percent: 0 }).success).toBe(true);
    expect(progressRecordCreateSchema.safeParse({ percent: 100 }).success).toBe(true);
    expect(progressRecordCreateSchema.safeParse({ percent: 101 }).success).toBe(false);
    expect(progressRecordCreateSchema.safeParse({ percent: -1 }).success).toBe(false);
    expect(progressRecordCreateSchema.safeParse({ percent: 45.5 }).success).toBe(false);
    expect(progressRecordCreateSchema.safeParse({ percent: 10, note: '  ' }).success).toBe(false);
  });
});
