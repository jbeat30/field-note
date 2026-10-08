import { z } from 'zod';

import { fileRejectReasonSchema, fileStatusSchema } from './files';

// 작업자료 문서함 (서비스 기획서 §12.3). 도면·시방서·작업지시서·계약서처럼 개정되는 문서를 프로젝트별로 모은다.
// 파일은 덮어쓰지 않고 새 버전으로 추가하며(최신본이 기본, 이전본 보존), 민감 자료는 열람·다운로드를 감사 기록으로 남긴다 (§7.3, §13.1)
export const DOCUMENT_CATEGORIES = [
  'DRAWING',
  'SPEC',
  'WORK_ORDER',
  'CONTRACT',
  'SAFETY',
  'OTHER',
] as const;

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  DRAWING: '도면',
  SPEC: '시방·사양',
  WORK_ORDER: '작업지시',
  CONTRACT: '계약·행정',
  SAFETY: '안전·검사',
  OTHER: '기타',
};

export const DOCUMENT_CATEGORY_HINTS: Record<DocumentCategory, string> = {
  DRAWING: '시공도, 가공도, 평면도',
  SPEC: '시방서, 자재 사양서',
  WORK_ORDER: '작업지시서, 작업 순서, 현장 유의사항',
  CONTRACT: '계약서, 변경 합의서, 공문',
  SAFETY: '안전 점검표, 검사·확인서, 준공 서류',
  OTHER: '',
};

/**
 * @description 분류별 민감 자료 기본값: 계약·행정은 기본적으로 민감 자료 (서비스 기획서 §12.3). 직접 정하면 그 값을 쓴다
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
  .min(1, '문서 이름을 입력해 주세요')
  .max(
    DOCUMENT_TITLE_MAX_LENGTH,
    `문서 이름은 ${DOCUMENT_TITLE_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

const reasonSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    DOCUMENT_REASON_MAX_LENGTH,
    `개정 사유는 ${DOCUMENT_REASON_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

export const documentParamsSchema = z.object({ id: z.uuid() });

export const documentVersionParamsSchema = z.object({
  id: z.uuid(),
  versionNo: z.coerce.number().int().min(1),
});

// 올린 파일(용도: 문서)로 문서를 만든다. 첫 버전이 되며 개정일을 비우면 오늘(서울 기준)
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

// 같은 문서의 새 버전: 최신본이 기본으로 보이고 이전본은 그대로 남는다
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
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

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

export const AUDIT_ACTIONS = ['DOCUMENT_VIEWED', 'DOCUMENT_DOWNLOADED', 'REPORT_EXPORTED'] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export type AuditAction = z.infer<typeof auditActionSchema>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  DOCUMENT_VIEWED: '열람',
  DOCUMENT_DOWNLOADED: '내려받기',
  REPORT_EXPORTED: '작업일보 내보내기',
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
