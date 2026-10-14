import { z } from 'zod';

import { PAY_TYPE_LABELS } from './laborCost';
import { auditActionSchema, type AuditAction } from './documents';

// 기록 조회 (서비스 기획서 §13.1): 민감 자료·직원 서류 열람, 내보내기, 단가·인건비 조회, 월 공수 확정·재오픈을 한곳에서 본다.
// 감사 기록은 수정·삭제할 수 없고 이 화면은 조회만 한다
const dateSchema = z.iso.date();

export const AUDIT_PAGE_DEFAULT_LIMIT = 50;
export const AUDIT_PAGE_MAX_LIMIT = 100;

// 목록 화면에서 쓰는 이름 (열람·내려받기가 무엇을 열었는지 알 수 있게 대상까지 적음)
export const AUDIT_ACTION_TITLES: Record<AuditAction, string> = {
  DOCUMENT_VIEWED: '민감 문서 열람',
  DOCUMENT_DOWNLOADED: '민감 문서 내려받기',
  REPORT_EXPORTED: '내보내기',
  PAY_RATE_VIEWED: '단가 조회',
  PAY_RATE_CHANGED: '단가 변경',
  LABOR_COST_VIEWED: '인건비 조회',
  EMPLOYEE_DOCUMENT_VIEWED: '직원 서류 열람',
  MONTH_CLOSED: '월 공수 확정',
  MONTH_REOPENED: '월 공수 재오픈',
};

// 대상 종류: 대상 이름을 어디서 찾을지, 화면이 어디로 이동할지 정한다
export const AUDIT_TARGET_TYPES = ['DOCUMENT', 'EMPLOYEE', 'PROJECT', 'COMPANY'] as const;

export const auditTargetTypeSchema = z.enum(AUDIT_TARGET_TYPES);

export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;

/**
 * @description 감사 기록 행위의 대상 종류. 내보내기는 작업일보(프로젝트)와 월 공수표(회사)가 있어 상세로 가른다
 * @param action 행위
 * @param detail 기록 상세
 * @returns 대상 종류
 */
export const auditTargetType = (action: AuditAction, detail: unknown): AuditTargetType => {
  switch (action) {
    case 'DOCUMENT_VIEWED':
    case 'DOCUMENT_DOWNLOADED':
      return 'DOCUMENT';
    case 'PAY_RATE_VIEWED':
    case 'PAY_RATE_CHANGED':
    case 'EMPLOYEE_DOCUMENT_VIEWED':
      return 'EMPLOYEE';
    case 'LABOR_COST_VIEWED':
      return 'PROJECT';
    case 'REPORT_EXPORTED':
      return field(detail, 'kind') === 'MONTHLY_HOURS_XLSX' ? 'COMPANY' : 'PROJECT';
    case 'MONTH_CLOSED':
    case 'MONTH_REOPENED':
      return 'COMPANY';
  }
};

const field = (detail: unknown, key: string): string | undefined => {
  const value =
    detail && typeof detail === 'object' ? (detail as Record<string, unknown>)[key] : undefined;

  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
};

/**
 * @description 기록 상세를 한 줄 설명으로 바꾼다 (모르는 값은 빼고, 상세가 비어 있으면 null)
 * @param action 행위
 * @param detail 기록 상세(JSON)
 * @returns 설명 (없으면 null)
 */
export const auditSummary = (action: AuditAction, detail: unknown): string | null => {
  const parts: (string | undefined)[] = [];

  switch (action) {
    case 'DOCUMENT_VIEWED':
    case 'DOCUMENT_DOWNLOADED':
      parts.push(
        field(detail, 'title'),
        field(detail, 'versionNo') ? `v${field(detail, 'versionNo')}` : undefined,
      );
      break;
    case 'REPORT_EXPORTED':
      if (field(detail, 'kind') === 'MONTHLY_HOURS_XLSX') {
        parts.push('월 공수표 엑셀', field(detail, 'month'));
      } else {
        parts.push(
          '작업일보 엑셀',
          field(detail, 'from') && field(detail, 'to')
            ? `${field(detail, 'from')} ~ ${field(detail, 'to')}`
            : undefined,
        );
      }
      break;
    case 'PAY_RATE_CHANGED': {
      const payType = field(detail, 'payType');

      parts.push(
        payType && payType in PAY_TYPE_LABELS
          ? PAY_TYPE_LABELS[payType as keyof typeof PAY_TYPE_LABELS]
          : payType,
        field(detail, 'effectiveFrom') ? `${field(detail, 'effectiveFrom')}부터` : undefined,
      );
      break;
    }
    case 'EMPLOYEE_DOCUMENT_VIEWED':
      parts.push(field(detail, 'typeName'), field(detail, 'fileName'));
      break;
    case 'MONTH_CLOSED':
      parts.push(
        field(detail, 'month'),
        Number(field(detail, 'draftLogCount') ?? 0) > 0
          ? `임시 저장 작업 내역 ${field(detail, 'draftLogCount')}건 확인`
          : undefined,
      );
      break;
    case 'MONTH_REOPENED':
      parts.push(field(detail, 'month'), field(detail, 'reason'));
      break;
    case 'PAY_RATE_VIEWED':
    case 'LABOR_COST_VIEWED':
      break;
  }

  const text = parts.filter(Boolean).join(' · ');

  return text || null;
};

export const auditLogSchema = z.object({
  id: z.uuid(),
  action: auditActionSchema,
  actorId: z.uuid(),
  actorName: z.string(),
  targetType: auditTargetTypeSchema,
  targetId: z.uuid(),
  // 대상이 지워졌거나 찾을 수 없으면 null
  targetName: z.string().nullable(),
  summary: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const auditLogsResponseSchema = z.object({
  items: z.array(auditLogSchema),
  nextCursor: z.string().nullable(),
});

export type AuditLogsResponse = z.infer<typeof auditLogsResponseSchema>;

export const auditLogListQuerySchema = z
  .object({
    action: auditActionSchema.optional(),
    // 서울 기준 날짜 범위 (양 끝 포함)
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(AUDIT_PAGE_MAX_LIMIT)
      .default(AUDIT_PAGE_DEFAULT_LIMIT),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '끝 날짜는 시작 날짜보다 빠를 수 없습니다',
    path: ['to'],
  });

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
