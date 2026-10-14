import { auditLogListQuerySchema, auditSummary, auditTargetType } from './auditLogs';

describe('auditSummary', () => {
  it('행위별로 상세를 한 줄로 요약한다', () => {
    expect(auditSummary('DOCUMENT_VIEWED', { title: '계약서', versionNo: 2 })).toBe('계약서 · v2');
    expect(auditSummary('REPORT_EXPORTED', { kind: 'MONTHLY_HOURS_XLSX', month: '2026-09' })).toBe(
      '월 공수표 엑셀 · 2026-09',
    );
    expect(
      auditSummary('REPORT_EXPORTED', {
        kind: 'DAILY_REPORT_XLSX',
        from: '2026-10-01',
        to: '2026-10-07',
      }),
    ).toBe('작업일보 엑셀 · 2026-10-01 ~ 2026-10-07');
    expect(
      auditSummary('PAY_RATE_CHANGED', { payType: 'DAILY', effectiveFrom: '2026-09-01' }),
    ).toBe('일급제 · 2026-09-01부터');
    expect(
      auditSummary('EMPLOYEE_DOCUMENT_VIEWED', { typeName: '건강검진', fileName: 'a.pdf' }),
    ).toBe('건강검진 · a.pdf');
    expect(auditSummary('MONTH_CLOSED', { month: '2026-09', draftLogCount: 2 })).toBe(
      '2026-09 · 임시 저장 작업 내역 2건 확인',
    );
    expect(auditSummary('MONTH_REOPENED', { month: '2026-09', reason: '정정' })).toBe(
      '2026-09 · 정정',
    );
  });

  it('상세가 비었거나 이상해도 오류 없이 null이다', () => {
    expect(auditSummary('PAY_RATE_VIEWED', {})).toBeNull();
    expect(auditSummary('LABOR_COST_VIEWED', null)).toBeNull();
    expect(auditSummary('DOCUMENT_VIEWED', 'x')).toBeNull();
  });
});

describe('auditTargetType', () => {
  it('내보내기는 월 공수표만 회사 대상이다', () => {
    expect(auditTargetType('REPORT_EXPORTED', { kind: 'MONTHLY_HOURS_XLSX' })).toBe('COMPANY');
    expect(auditTargetType('REPORT_EXPORTED', { kind: 'DAILY_REPORT_XLSX' })).toBe('PROJECT');
    expect(auditTargetType('EMPLOYEE_DOCUMENT_VIEWED', {})).toBe('EMPLOYEE');
    expect(auditTargetType('DOCUMENT_DOWNLOADED', {})).toBe('DOCUMENT');
  });
});

describe('auditLogListQuerySchema', () => {
  it('기본 개수와 날짜 순서를 검사한다', () => {
    expect(auditLogListQuerySchema.parse({}).limit).toBe(50);
    expect(auditLogListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(
      auditLogListQuerySchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success,
    ).toBe(false);
  });
});
