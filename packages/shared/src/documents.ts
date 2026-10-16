import { z } from 'zod';

import { fileRejectReasonSchema, fileStatusSchema } from './files';

import { VALIDATION_MESSAGES } from './errorMessages';
// 작업자료 문서함 (서비스 기획서 §12.3), 도면·시방서·작업지시서·계약서처럼 개정되는 문서를 프로젝트별로 수집
// 파일은 덮어쓰지 않고 새 버전으로 추가하며(최신본이 기본, 이전본 보존), 민감 자료는 열람·다운로드를 감사 기록으로 남김 (§7.3, §13.1)
export const DOCUMENT_CATEGORIES = ['DRAWING', 'CONTRACT', 'SAFETY', 'QUOTE', 'OTHER'] as const;

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  DRAWING: '도면·작업지시서',
  CONTRACT: '계약·공문',
  SAFETY: '안전·검사',
  QUOTE: '견적·정산',
  OTHER: '기타',
};

export const DOCUMENT_CATEGORY_HINTS: Record<DocumentCategory, string> = {
  DRAWING: '시공도, 가공도, 시방서, 작업지시서',
  CONTRACT: '계약서, 변경 합의서, 공문',
  SAFETY: '안전 점검표, 검사·확인서, 준공 서류',
  QUOTE: '견적서, 정산서, 거래명세서',
  OTHER: '',
};

/**
 * @description 분류별 민감 자료 기본값: 계약·공문은 기본적으로 민감 자료 (서비스 기획서 §12.3), 직접 정하면 그 값 사용
 * @param category 문서 분류
 * @param explicit 사용자가 직접 정한 값 (없으면 분류 기본값)
 * @returns 민감 자료 여부
 */
export const resolveSensitive = (category: DocumentCategory, explicit?: boolean) =>
  explicit ?? category === 'CONTRACT';

export const DOCUMENT_TITLE_MAX_LENGTH = 100;
export const DOCUMENT_REASON_MAX_LENGTH = 200;
export const DOCUMENT_PINNED_MAX = 10;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const titleSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required('문서 이름'))
  .max(
    DOCUMENT_TITLE_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('문서 이름', DOCUMENT_TITLE_MAX_LENGTH),
  );

const reasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    DOCUMENT_REASON_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('개정 사유', DOCUMENT_REASON_MAX_LENGTH),
  );

export const documentParamsSchema = z.object({ id: z.uuid() });

export const documentVersionParamsSchema = z.object({
  id: z.uuid(),
  versionNo: z.coerce.number().int().min(1),
});

// 올린 파일(용도: 문서)로 문서 생성, 첫 버전이 되며 개정일을 비우면 오늘(서울 기준)
export const documentCreateSchema = z.object({
  fileId: z.uuid(),
  title: titleSchema,
  category: documentCategorySchema.default('OTHER'),
  // 비우면 분류 기본값 (계약·행정은 민감 자료)
  isSensitive: z.boolean().optional(),
  revisionDate: dateSchema.optional(),
  reason: reasonSchema.optional(),
});

export type DocumentCreate = z.infer<typeof documentCreateSchema>;

// 같은 문서의 새 버전: 최신본을 기본 표시하고 이전본은 그대로 보존
export const documentVersionCreateSchema = z.object({
  fileId: z.uuid(),
  revisionDate: dateSchema.optional(),
  reason: reasonSchema.optional(),
});

export type DocumentVersionCreate = z.infer<typeof documentVersionCreateSchema>;

export const documentUpdateSchema = z
  .object({
    title: titleSchema,
    category: documentCategorySchema,
    isSensitive: z.boolean(),
    // 자주 보는 자료는 프로젝트 첫 화면에 고정
    isPinned: z.boolean(),
    // 마감 요약(준공 보고서)에 넣을 문서로 고름 (안전·검사, 계약·공문 분류만, 민감 자료는 표시해도 싣지 않음)
    includeInSummary: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, VALIDATION_MESSAGES.NO_VALUES_TO_UPDATE);

export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

export const documentListQuerySchema = z.object({
  category: documentCategorySchema.optional(),
  q: z.string().trim().max(50).optional(),
  pinned: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

export const documentVersionSchema = z.object({
  versionNo: z.number().int(),
  fileId: z.uuid(),
  fileName: z.string(),
  contentType: z.string(),
  size: z.number().int(),
  // 검사가 끝나야 열 수 있음
  fileStatus: fileStatusSchema,
  rejectReason: fileRejectReasonSchema.nullable(),
  revisionDate: dateSchema,
  reason: z.string().nullable(),
  uploadedBy: z.uuid(),
  createdAt: z.iso.datetime(),
});

export type DocumentVersion = z.infer<typeof documentVersionSchema>;

export const documentSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  category: documentCategorySchema,
  title: z.string(),
  isSensitive: z.boolean(),
  isPinned: z.boolean(),
  includeInSummary: z.boolean(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  versionCount: z.number().int(),
  // 기본으로 보이는 최신본
  latest: documentVersionSchema,
});

export type Document = z.infer<typeof documentSchema>;

export const documentsResponseSchema = z.object({ items: z.array(documentSchema) });

export type DocumentsResponse = z.infer<typeof documentsResponseSchema>;

// 문서 한 건: 최신본 + 이전본까지 모든 버전 (최신이 맨 앞)
export const documentDetailSchema = documentSchema.extend({
  versions: z.array(documentVersionSchema),
});

export type DocumentDetail = z.infer<typeof documentDetailSchema>;

export const DOCUMENT_ACCESS_MODES = ['view', 'download'] as const;

export const documentAccessQuerySchema = z.object({
  // view는 브라우저에서 바로 열기, download는 내려받기 (민감 자료는 둘 다 기록)
  mode: z.enum(DOCUMENT_ACCESS_MODES).default('view'),
});

export type DocumentAccessQuery = z.infer<typeof documentAccessQuerySchema>;

export const documentAccessUrlSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
  // 이 열람이 기록에 남았는지 (민감 자료일 때 true)
  isLogged: z.boolean(),
});

export type DocumentAccessUrl = z.infer<typeof documentAccessUrlSchema>;

export const AUDIT_ACTIONS = [
  'DOCUMENT_VIEWED',
  'DOCUMENT_DOWNLOADED',
  'REPORT_EXPORTED',
  'PAY_RATE_VIEWED',
  'PAY_RATE_CHANGED',
  'LABOR_COST_VIEWED',
  'EMPLOYEE_DOCUMENT_VIEWED',
  'MONTH_CLOSED',
  'MONTH_REOPENED',
  // 활동 기록 (데이터를 바꾼 일)
  'WORK_LOG_SAVED',
  'WORK_LOG_UPDATED',
  'MATERIAL_RECORD_DELETED',
  'LEDGER_ENTRY_DELETED',
  'PHOTO_DELETED',
  'DOCUMENT_DELETED',
  'PROJECT_UPDATED',
  'PROJECT_STATUS_CHANGED',
  'EMPLOYEE_UPDATED',
] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  DOCUMENT_VIEWED: '열람',
  DOCUMENT_DOWNLOADED: '내려받기',
  REPORT_EXPORTED: '작업일보 내보내기',
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

// 민감 자료 열람 기록 (수정·삭제할 수 없는 감사 기록, 서비스 기획서 §13.1)
export const documentAccessLogSchema = z.object({
  id: z.uuid(),
  action: auditActionSchema,
  actorId: z.uuid(),
  actorName: z.string(),
  versionNo: z.number().int(),
  createdAt: z.iso.datetime(),
});

export type DocumentAccessLog = z.infer<typeof documentAccessLogSchema>;

export const documentAccessLogsResponseSchema = z.object({
  items: z.array(documentAccessLogSchema),
});

export type DocumentAccessLogsResponse = z.infer<typeof documentAccessLogsResponseSchema>;
