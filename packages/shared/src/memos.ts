import { z } from 'zod';

// 프로젝트 메모 노트와 메모함 (서비스 기획서 §10.9, §14). 정해진 양식에 들어가지 않는 내용(통화, 지시, 이슈, 할 일)을 날짜별로 쌓는다
export const MEMO_TAGS = ['NEGOTIATION', 'INSTRUCTION', 'ISSUE', 'TODO', 'OTHER'] as const;

export const memoTagSchema = z.enum(MEMO_TAGS);

export type MemoTag = z.infer<typeof memoTagSchema>;

export const MEMO_TAG_LABELS: Record<MemoTag, string> = {
  NEGOTIATION: '협의',
  INSTRUCTION: '지시',
  ISSUE: '이슈',
  TODO: '할 일',
  OTHER: '기타',
};

export const MEMO_CONTENT_MAX_LENGTH = 5000;
export const MEMO_PAGE_DEFAULT_LIMIT = 50;
export const MEMO_PAGE_MAX_LIMIT = 100;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const contentSchema = z
  .string()
  .trim()
  .min(1, '내용을 입력해 주세요')
  .max(MEMO_CONTENT_MAX_LENGTH, `메모는 ${MEMO_CONTENT_MAX_LENGTH}자까지 입력할 수 있습니다`);

export const memoParamsSchema = z.object({ id: z.uuid() });

// 프로젝트를 정하지 않으면 메모함에 들어간다. 날짜를 비우면 오늘(서울 기준), 태그를 비우면 기타
export const memoCreateSchema = z.object({
  content: contentSchema,
  tag: memoTagSchema.default('OTHER'),
  memoDate: dateSchema.optional(),
  projectId: z.uuid().optional(),
});

export type MemoCreate = z.infer<typeof memoCreateSchema>;

// 프로젝트에 연결(메모함에서 정리)하거나 null로 메모함에 되돌릴 수 있다. 완료 표시는 "할 일" 메모만 가능
export const memoUpdateSchema = z
  .object({
    content: contentSchema,
    tag: memoTagSchema,
    memoDate: dateSchema,
    projectId: z.uuid().nullable(),
    isDone: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, '바꿀 값을 하나 이상 보내 주세요');

export type MemoUpdate = z.infer<typeof memoUpdateSchema>;

export const MEMO_SCOPES = ['INBOX', 'PROJECT'] as const;

// scope=INBOX는 프로젝트에 연결되지 않은 메모(메모함), PROJECT는 projectId 프로젝트의 메모 노트
export const memoListQuerySchema = z
  .object({
    scope: z.enum(MEMO_SCOPES),
    projectId: z.uuid().optional(),
    tag: memoTagSchema.optional(),
    // 할 일 메모의 완료 여부로 거르기
    isDone: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    cursor: z.string().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(MEMO_PAGE_MAX_LIMIT).default(MEMO_PAGE_DEFAULT_LIMIT),
  })
  .refine((value) => (value.scope === 'PROJECT') === Boolean(value.projectId), {
    path: ['projectId'],
    message: '프로젝트 메모는 프로젝트를 지정하고, 메모함은 지정하지 않습니다',
  });

export type MemoListQuery = z.infer<typeof memoListQuerySchema>;

export const memoSchema = z.object({
  id: z.uuid(),
  // 메모함에 있으면 null
  projectId: z.uuid().nullable(),
  content: z.string(),
  tag: memoTagSchema,
  memoDate: dateSchema,
  // 할 일 메모의 완료 표시 (다른 태그는 항상 false)
  isDone: z.boolean(),
  doneAt: z.iso.datetime().nullable(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Memo = z.infer<typeof memoSchema>;

export const memosResponseSchema = z.object({
  items: z.array(memoSchema),
  nextCursor: z.string().nullable(),
});

export type MemosResponse = z.infer<typeof memosResponseSchema>;

// 정리 안 된 메모함 건수와 끝내지 않은 할 일 건수 (메뉴 표시·대시보드)
export const memoSummarySchema = z.object({
  inboxCount: z.number().int(),
  openTodoCount: z.number().int(),
});

export type MemoSummary = z.infer<typeof memoSummarySchema>;
