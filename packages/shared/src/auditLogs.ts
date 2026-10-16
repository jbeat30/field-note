import { z } from 'zod';

import { PAY_TYPE_LABELS } from './laborCost';
import { auditActionSchema, type AuditAction } from './documents';

// 활동 기록 (서비스 기획서 §13.1, 09 문서 §5.2): 데이터를 바꾼 일(저장·수정·삭제), 내보내기, 월 공수 확정·재오픈, 민감 자료 열람을 한곳에서 조회
// 인건비·단가 조회는 기록 제외 (이 서비스는 볼 권한이 있는 관리자만 사용하므로 열람 기록이 무의미), 기록은 수정·삭제 불가이며 이 화면은 조회 전용
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
  WORK_LOG_SAVED: '작업 내역 저장',
  WORK_LOG_UPDATED: '작업 내역 수정',
  MATERIAL_RECORD_DELETED: '자재 기록 삭제',
  LEDGER_ENTRY_DELETED: '지출·수입 기록 삭제',
  PHOTO_DELETED: '사진 삭제',
  DOCUMENT_DELETED: '문서 삭제',
  PROJECT_UPDATED: '프로젝트 정보 수정',
  PROJECT_STATUS_CHANGED: '프로젝트 상태 변경',
  EMPLOYEE_UPDATED: '직원 정보 수정',
};

// 활동 종류: 화면의 칩 필터 (저장·수정·삭제·내보내기·확정, 그리고 민감 자료 열람)
export const AUDIT_KINDS = ['SAVE', 'UPDATE', 'DELETE', 'EXPORT', 'CONFIRM', 'VIEW'] as const;

export const auditKindSchema = z.enum(AUDIT_KINDS);

export type AuditKind = z.infer<typeof auditKindSchema>;

export const AUDIT_KIND_LABELS: Record<AuditKind, string> = {
  SAVE: '저장',
  UPDATE: '수정',
  DELETE: '삭제',
  EXPORT: '내보내기',
  CONFIRM: '확정',
  VIEW: '열람',
};

const KIND_OF: Record<AuditAction, AuditKind> = {
  WORK_LOG_SAVED: 'SAVE',
  WORK_LOG_UPDATED: 'UPDATE',
  PROJECT_UPDATED: 'UPDATE',
  PROJECT_STATUS_CHANGED: 'UPDATE',
  EMPLOYEE_UPDATED: 'UPDATE',
  PAY_RATE_CHANGED: 'UPDATE',
  MATERIAL_RECORD_DELETED: 'DELETE',
  LEDGER_ENTRY_DELETED: 'DELETE',
  PHOTO_DELETED: 'DELETE',
  DOCUMENT_DELETED: 'DELETE',
  REPORT_EXPORTED: 'EXPORT',
  MONTH_CLOSED: 'CONFIRM',
  MONTH_REOPENED: 'CONFIRM',
  DOCUMENT_VIEWED: 'VIEW',
  DOCUMENT_DOWNLOADED: 'VIEW',
  EMPLOYEE_DOCUMENT_VIEWED: 'VIEW',
  // 더는 남기지 않지만 이미 남은 기록은 열람으로 분류
  PAY_RATE_VIEWED: 'VIEW',
  LABOR_COST_VIEWED: 'VIEW',
};

/**
 * @description 행위의 활동 종류 (칩 필터 분류)
 * @param action 행위
 */
export const auditKindOf = (action: AuditAction): AuditKind => KIND_OF[action];

/**
 * @description 활동 종류에 속하는 행위 목록 (서버가 종류로 거를 때 사용)
 * @param kind 활동 종류
 */
export const auditActionsOfKind = (kind: AuditKind): AuditAction[] =>
  (Object.keys(KIND_OF) as AuditAction[]).filter((action) => KIND_OF[action] === kind);

// 대상 종류: 대상 이름을 찾을 위치와 화면 이동 경로 결정
export const AUDIT_TARGET_TYPES = ['DOCUMENT', 'EMPLOYEE', 'PROJECT', 'COMPANY'] as const;

export const auditTargetTypeSchema = z.enum(AUDIT_TARGET_TYPES);

export type AuditTargetType = z.infer<typeof auditTargetTypeSchema>;

/**
 * @description 감사 기록 행위의 대상 종류, 내보내기는 작업일보(프로젝트)와 월 공수표(회사)가 있어 상세로 구분
 * @param action 행위
 * @param detail 기록 상세
 * @returns 대상 종류
 */
export const auditTargetType = (action: AuditAction, detail: unknown): AuditTargetType => {
  switch (action) {
    case 'DOCUMENT_VIEWED':
    case 'DOCUMENT_DOWNLOADED':
    case 'DOCUMENT_DELETED':
      return 'DOCUMENT';
    case 'PAY_RATE_VIEWED':
    case 'PAY_RATE_CHANGED':
    case 'EMPLOYEE_DOCUMENT_VIEWED':
    case 'EMPLOYEE_UPDATED':
      return 'EMPLOYEE';
    case 'LABOR_COST_VIEWED':
    case 'WORK_LOG_SAVED':
    case 'WORK_LOG_UPDATED':
    case 'MATERIAL_RECORD_DELETED':
    case 'LEDGER_ENTRY_DELETED':
    case 'PHOTO_DELETED':
    case 'PROJECT_UPDATED':
    case 'PROJECT_STATUS_CHANGED':
      return 'PROJECT';
    case 'REPORT_EXPORTED':
      return field(detail, 'kind') === 'MONTHLY_HOURS_XLSX' ||
        field(detail, 'kind') === 'COMPANY_DATA_XLSX'
        ? 'COMPANY'
        : 'PROJECT';
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

// 바뀐 내용 한 줄: 항목 이름과 바꾸기 전·후 값 (값은 사람이 읽는 글로 저장)
export const auditChangeSchema = z.object({
  label: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
});

export type AuditChange = z.infer<typeof auditChangeSchema>;

/**
 * @description 기록 상세의 바뀐 내용 (없거나 형식이 맞지 않으면 빈 목록)
 * @param detail 기록 상세(JSON)
 */
export const auditChanges = (detail: unknown): AuditChange[] => {
  const value =
    detail && typeof detail === 'object' ? (detail as Record<string, unknown>).changes : undefined;
  const parsed = z.array(auditChangeSchema).safeParse(value);

  return parsed.success ? parsed.data : [];
};

/**
 * @description 기록 상세를 한 줄 설명으로 바꿈 (모르는 값은 빼고, 상세가 비어 있으면 null)
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
      } else if (field(detail, 'kind') === 'COMPANY_DATA_XLSX') {
        parts.push('전체 데이터 엑셀');
      } else if (field(detail, 'kind') === 'PROJECT_SUMMARY_XLSX') {
        parts.push('프로젝트 요약 엑셀');
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
    case 'WORK_LOG_SAVED':
    case 'WORK_LOG_UPDATED':
      parts.push(
        field(detail, 'workDate'),
        field(detail, 'totalMinutes')
          ? `${Math.round((Number(field(detail, 'totalMinutes')) / 60) * 10) / 10}시간`
          : undefined,
        field(detail, 'people') ? `${field(detail, 'people')}명` : undefined,
      );
      break;
    case 'MATERIAL_RECORD_DELETED':
      parts.push(field(detail, 'materialName'), field(detail, 'recordDate'), field(detail, 'kind'));
      break;
    case 'LEDGER_ENTRY_DELETED':
      parts.push(
        field(detail, 'kind'),
        field(detail, 'entryDate'),
        field(detail, 'amount')
          ? `${Number(field(detail, 'amount')).toLocaleString('ko-KR')}원`
          : undefined,
        field(detail, 'content'),
      );
      break;
    case 'PHOTO_DELETED':
      parts.push(field(detail, 'area'), field(detail, 'workDate'));
      break;
    case 'DOCUMENT_DELETED':
      parts.push(field(detail, 'title'));
      break;
    case 'PROJECT_STATUS_CHANGED':
      parts.push(
        field(detail, 'fromLabel') && field(detail, 'toLabel')
          ? `${field(detail, 'fromLabel')} → ${field(detail, 'toLabel')}`
          : undefined,
      );
      break;
    case 'PROJECT_UPDATED':
    case 'EMPLOYEE_UPDATED':
      parts.push(
        auditChanges(detail)
          .map((change) => change.label)
          .join('·') || undefined,
      );
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
  kind: auditKindSchema,
  actorId: z.uuid(),
  actorName: z.string(),
  targetType: auditTargetTypeSchema,
  targetId: z.uuid(),
  // 대상이 지워졌거나 찾을 수 없으면 null
  targetName: z.string().nullable(),
  // 프로젝트에 속한 일이면 그 프로젝트 (이름은 조회 때 찾음, 없으면 null)
  projectId: z.uuid().nullable(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  // 바뀐 내용 (행을 눌렀을 때 전·후로 보임, 없을 수 있음)
  changes: z.array(auditChangeSchema),
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
    // 종류(저장·수정·삭제·내보내기·확정·열람)로 거름. action과 함께 주면 둘 다 만족해야 함
    kind: auditKindSchema.optional(),
    // 이 프로젝트의 일만
    projectId: z.uuid().optional(),
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
