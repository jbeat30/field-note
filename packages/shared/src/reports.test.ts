import {
  dailyReportParamsSchema,
  reportExportQuerySchema,
  reportWorkUnitLabel,
  reportWorkValue,
} from './reports';

const ratio = { workUnitMode: 'RATIO' as const, standardWorkMinutes: 480 };

describe('공수 표시값', () => {
  it('비율 방식은 MD, 시간 방식은 시간으로 소수 둘째 자리까지 보여 준다', () => {
    expect(reportWorkValue(480, ratio)).toBe(1);
    expect(reportWorkValue(240, ratio)).toBe(0.5);
    expect(reportWorkValue(100, ratio)).toBe(0.21);
    expect(reportWorkValue(90, { ...ratio, workUnitMode: 'HOURS' })).toBe(1.5);
    expect(reportWorkUnitLabel('RATIO')).toBe('MD');
    expect(reportWorkUnitLabel('HOURS')).toBe('시간');
  });

  it('하루 기준시간이 다른 회사는 그 기준으로 환산한다', () => {
    expect(reportWorkValue(420, { workUnitMode: 'RATIO', standardWorkMinutes: 420 })).toBe(1);
  });
});

describe('작업일보 입력', () => {
  it('프로젝트와 날짜 형식을 검사한다', () => {
    const projectId = '018f3b1e-0000-7000-8000-000000000001';

    expect(dailyReportParamsSchema.safeParse({ projectId, date: '2026-10-08' }).success).toBe(true);
    expect(dailyReportParamsSchema.safeParse({ projectId, date: '10월 8일' }).success).toBe(false);
    expect(
      dailyReportParamsSchema.safeParse({ projectId: 'abc', date: '2026-10-08' }).success,
    ).toBe(false);
  });

  it('내보내기 기간은 하루 이상 93일 이하이고 끝이 시작보다 빠를 수 없다', () => {
    expect(
      reportExportQuerySchema.safeParse({ from: '2026-10-01', to: '2026-10-01' }).success,
    ).toBe(true);
    expect(
      reportExportQuerySchema.safeParse({ from: '2026-10-01', to: '2027-01-01' }).success,
    ).toBe(true);
    expect(
      reportExportQuerySchema.safeParse({ from: '2026-10-01', to: '2027-01-02' }).success,
    ).toBe(false);
    expect(
      reportExportQuerySchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success,
    ).toBe(false);
    expect(reportExportQuerySchema.safeParse({ from: '2026-10-01' }).success).toBe(false);
  });
});
