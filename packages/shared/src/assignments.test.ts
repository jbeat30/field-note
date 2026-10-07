import {
  assignmentStatusCheck,
  checkAssignmentPeriod,
  overlapRange,
  periodChangeNeedsReason,
} from './assignments';

describe('상태별 투입 허용 (서비스 기획서 §10.3 허용 작업 표)', () => {
  it('예정·진행에서는 바로 투입할 수 있다', () => {
    expect(assignmentStatusCheck('PLANNED', false).ok).toBe(true);
    expect(assignmentStatusCheck('IN_PROGRESS', false).ok).toBe(true);
  });

  it('중단 중에는 관리자 확인(confirm)이 있어야 한다', () => {
    expect(assignmentStatusCheck('SUSPENDED', false)).toMatchObject({
      ok: false,
      path: 'confirmSuspended',
    });
    expect(assignmentStatusCheck('SUSPENDED', true).ok).toBe(true);
  });

  it('완료·보증 중·종료·취소 프로젝트에는 투입할 수 없다', () => {
    for (const status of ['COMPLETED', 'WARRANTY', 'CLOSED', 'CANCELLED'] as const) {
      expect(assignmentStatusCheck(status, true)).toMatchObject({ ok: false, path: 'projectId' });
    }
  });
});

describe('투입 기간은 프로젝트 예정 기간 안', () => {
  const project = { plannedStart: '2026-10-01', plannedEnd: '2026-12-31' };

  it('경계일을 포함해 안에 있으면 통과한다', () => {
    expect(checkAssignmentPeriod('2026-10-01', '2026-12-31', project).ok).toBe(true);
    expect(checkAssignmentPeriod('2026-11-05', '2026-11-05', project).ok).toBe(true);
  });

  it('시작이 종료보다 늦거나 프로젝트 기간 밖이면 거부한다', () => {
    expect(checkAssignmentPeriod('2026-11-10', '2026-11-01', project)).toMatchObject({
      ok: false,
      path: 'endDate',
    });
    expect(checkAssignmentPeriod('2026-09-30', '2026-11-01', project)).toMatchObject({
      ok: false,
      path: 'startDate',
    });
    expect(checkAssignmentPeriod('2026-11-01', '2027-01-01', project)).toMatchObject({
      ok: false,
      path: 'endDate',
    });
  });
});

describe('기간 겹침', () => {
  it('겹치는 구간을 돌려주고 하루만 겹쳐도 겹침이다', () => {
    expect(overlapRange('2026-10-01', '2026-10-10', '2026-10-05', '2026-10-20')).toEqual({
      from: '2026-10-05',
      to: '2026-10-10',
    });
    expect(overlapRange('2026-10-01', '2026-10-10', '2026-10-10', '2026-10-20')).toEqual({
      from: '2026-10-10',
      to: '2026-10-10',
    });
  });

  it('겹치지 않으면 null이다 (하루 차이로 맞닿아도 겹침이 아님)', () => {
    expect(overlapRange('2026-10-01', '2026-10-10', '2026-10-11', '2026-10-20')).toBeNull();
    expect(overlapRange('2026-11-01', '2026-11-05', '2026-10-01', '2026-10-31')).toBeNull();
  });

  it('한쪽이 다른 쪽을 완전히 포함하면 안쪽 구간이 겹침 범위다', () => {
    expect(overlapRange('2026-10-01', '2026-12-31', '2026-11-01', '2026-11-30')).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
  });
});

describe('프로젝트 기간 변경 사유', () => {
  it('예정 상태에서는 선택이고 시작한 뒤에는 필수다', () => {
    expect(periodChangeNeedsReason('PLANNED')).toBe(false);
    for (const status of ['IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'WARRANTY'] as const) {
      expect(periodChangeNeedsReason(status)).toBe(true);
    }
  });
});
