import { z } from 'zod';

import { projectWarningTypeSchema } from './projectWarnings';

import { VALIDATION_MESSAGES } from './errorMessages';
// 프로젝트, 계약 금액은 제외
export const PROJECT_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'SUSPENDED',
  'COMPLETED',
  'WARRANTY',
  'CLOSED',
  'CANCELLED',
] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

// 상태 이름은 회사가 바꿀 수 있게 확장될 수 있지만 현재는 기본 이름만 사용
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  IN_PROGRESS: '진행 중',
  SUSPENDED: '작업 중지',
  COMPLETED: '완료',
  WARRANTY: '보증 중',
  CLOSED: '종료',
  CANCELLED: '취소',
};

export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_SITE_NAME_MAX_LENGTH = 100;
export const PROJECT_SITE_ADDRESS_MAX_LENGTH = 200;
export const PROJECT_MAP_URL_MAX_LENGTH = 500;
export const PROJECT_CONTACT_NAME_MAX_LENGTH = 30;
export const PROJECT_PHONE_MAX_LENGTH = 30;
export const PROJECT_MEMO_MAX_LENGTH = 1000;
export const PROJECT_MAX_TRADES = 10;
export const PROJECT_MIN_DATE = '2000-01-01';
export const PROJECT_MAX_DATE = '2099-12-31';

// 프로젝트 코드: 회사별 자동 번호 `연도-순번` (예: 2026-012), 순번은 최소 3자리
export const PROJECT_CODE_PATTERN = /^\d{4}-\d{3,}$/;

/**
 * @description 프로젝트 코드 만들기
 * @param year 연도 (등록한 날의 서울 기준 연도)
 * @param sequence 그 해의 순번 (1부터)
 * @returns 예: 2026-012
 */
export const formatProjectCode = (year: number, sequence: number) =>
  `${year}-${String(sequence).padStart(3, '0')}`;

const nameSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required('프로젝트명'))
  .max(PROJECT_NAME_MAX_LENGTH, VALIDATION_MESSAGES.tooLong('프로젝트명', PROJECT_NAME_MAX_LENGTH));

const siteNameSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required('현장 이름'))
  .max(
    PROJECT_SITE_NAME_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('현장 이름', PROJECT_SITE_NAME_MAX_LENGTH),
  );

const siteAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PROJECT_SITE_ADDRESS_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('주소', PROJECT_SITE_ADDRESS_MAX_LENGTH),
  );

// 지도 링크는 http(s)만 허용 (javascript: 같은 주소가 링크로 열리지 않게 함)
const mapUrlSchema = z
  .string()
  .trim()
  .max(
    PROJECT_MAP_URL_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('지도 링크', PROJECT_MAP_URL_MAX_LENGTH),
  )
  .regex(/^https?:\/\/\S+$/i, VALIDATION_MESSAGES.MAP_URL_SCHEME);

const contactNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PROJECT_CONTACT_NAME_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('담당자', PROJECT_CONTACT_NAME_MAX_LENGTH),
  );

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(PROJECT_PHONE_MAX_LENGTH, VALIDATION_MESSAGES.tooLong('연락처', PROJECT_PHONE_MAX_LENGTH))
  .regex(/^[0-9+\-() ]+$/, VALIDATION_MESSAGES.PHONE_FORMAT);

const memoSchema = (label: string) =>
  z
    .string()
    .max(PROJECT_MEMO_MAX_LENGTH, VALIDATION_MESSAGES.tooLong(label, PROJECT_MEMO_MAX_LENGTH));

const dateSchema = z.iso
  .date('날짜 형식이 올바르지 않습니다')
  .refine(
    (value) => value >= PROJECT_MIN_DATE && value <= PROJECT_MAX_DATE,
    VALIDATION_MESSAGES.DATE_RANGE_CHECK,
  );

// 등록·수정 입력용: 비어 있으면 형식 오류 대신 입력 안내를 보여 줌
const requiredDateSchema = z.string().min(1, VALIDATION_MESSAGES.required('날짜')).pipe(dateSchema);

// 목록·카드 공통 항목 (현장 연락처·출입 메모·계약일·메모는 카드에서만)
export const projectSummarySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: projectStatusSchema,
  siteName: z.string(),
  // 명부·직원·선택 목록 항목의 id, 이름은 각 목록에서 조회
  clientId: z.uuid(),
  managerId: z.uuid(),
  tradeIds: z.array(z.uuid()),
  plannedStart: z.iso.date(),
  plannedEnd: z.iso.date(),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectDetailSchema = projectSummarySchema.extend({
  // 실제 시작일·완료일은 상태를 바꿀 때 기록됨
  actualStart: z.iso.date().nullable(),
  actualEnd: z.iso.date().nullable(),
  siteAddress: z.string().nullable(),
  siteMapUrl: z.string().nullable(),
  siteContactName: z.string().nullable(),
  siteContactPhone: z.string().nullable(),
  accessMemo: z.string().nullable(),
  contractDate: z.iso.date(),
  memo: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

// 목록의 한 줄: 요약에 경고(진행 중 프로젝트만 해당) 추가
export const projectListItemSchema = projectSummarySchema.extend({
  warnings: z.array(projectWarningTypeSchema),
  // 현장 주소 (목록에서 프로젝트 이름 아래에 표시)
  siteAddress: z.string().nullable(),
  // 공수 소진율(%): 계획 공수가 없으면 null
  burnPercent: z.number().nullable(),
  // 오늘 이 프로젝트에 투입되는 재직 직원 수
  todayHeadcount: z.number().int().min(0),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export const projectsResponseSchema = z.object({
  items: z.array(projectListItemSchema),
  // 조건에 맞는 전체 건수 (쪽 수 계산용)
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  // 조건과 상관없는 회사 전체 프로젝트 수와 진행 중 수 (목록 머리의 요약)
  counts: z.object({ all: z.number().int().min(0), inProgress: z.number().int().min(0) }),
});

export type ProjectsResponse = z.infer<typeof projectsResponseSchema>;

// 정렬 기준: 최근 등록(등록 순서 = 코드 번호 순서), 이름, 상태(진행 순서), 고객 이름, 담당자 이름, 시작·종료 예정일
export const PROJECT_SORT_KEYS = [
  'recent',
  'name',
  'status',
  'client',
  'manager',
  'plannedStart',
  'plannedEnd',
] as const;

export const projectSortKeySchema = z.enum(PROJECT_SORT_KEYS);

export type ProjectSortKey = z.infer<typeof projectSortKeySchema>;

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

export type SortDirection = z.infer<typeof sortDirectionSchema>;

// 목록은 한 번에 한 쪽만 돌려줌 (데이터가 많아져도 응답 크기가 일정하도록)
export const PROJECT_PAGE_SIZE_DEFAULT = 20;
export const PROJECT_PAGE_SIZE_MAX = 100;

export const projectListQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  clientId: z.uuid().optional(),
  managerId: z.uuid().optional(),
  tradeId: z.uuid().optional(),
  // 이 기간과 겹치는 프로젝트만 (시작·종료 예정일 기준)
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  // 프로젝트명·코드 검색 (부분 일치)
  q: z.string().trim().max(PROJECT_NAME_MAX_LENGTH).optional(),
  // 현장명 검색 (부분 일치)
  site: z.string().trim().max(PROJECT_SITE_NAME_MAX_LENGTH).optional(),
  // 'true'면 경고가 있는 진행·중단 프로젝트만 (회사별 경고 기준을 따름)
  hasWarning: z.enum(['true']).optional(),
  // 정렬 기준과 방향 (기준을 안 주면 최근 등록 내림차순, 방향을 안 주면 최근 등록은 내림·나머지는 오름)
  sortBy: projectSortKeySchema.optional(),
  sortDir: sortDirectionSchema.optional(),
  // 쪽 번호(1부터)와 쪽당 개수
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(PROJECT_PAGE_SIZE_MAX).optional(),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const projectParamsSchema = z.object({ id: z.uuid() });

const periodRefinement = (value: { plannedStart?: string; plannedEnd?: string }) =>
  !value.plannedStart || !value.plannedEnd || value.plannedStart <= value.plannedEnd;

const PERIOD_ERROR = {
  message: VALIDATION_MESSAGES.PROJECT_END_BEFORE_START,
  path: ['plannedEnd'],
};

// 등록:에서 "등록 때 필수"인 항목만 요구하고 나머지는 추후 입력
export const projectCreateSchema = z
  .object({
    name: nameSchema,
    siteName: siteNameSchema,
    siteAddress: siteAddressSchema.nullish(),
    siteMapUrl: mapUrlSchema.nullish(),
    siteContactName: contactNameSchema.nullish(),
    siteContactPhone: phoneSchema.nullish(),
    accessMemo: memoSchema('출입·주의 메모').nullish(),
    clientId: z.uuid(VALIDATION_MESSAGES.selectRequired('고객')),
    managerId: z.uuid(VALIDATION_MESSAGES.selectRequired('담당자')),
    tradeIds: z
      .array(z.uuid())
      .max(PROJECT_MAX_TRADES, VALIDATION_MESSAGES.TRADES_LIMIT(PROJECT_MAX_TRADES))
      .optional(),
    contractDate: requiredDateSchema,
    plannedStart: requiredDateSchema,
    plannedEnd: requiredDateSchema,
    memo: memoSchema('메모').nullish(),
  })
  .refine(periodRefinement, PERIOD_ERROR);

export type ProjectCreate = z.infer<typeof projectCreateSchema>;

// 수정: 보낸 항목만 변경, 비울 수 있는 항목은 null로 삭제, 코드와 상태는 변경 불가 (상태는 P1-6의 전환 규칙으로만)
export const projectUpdateSchema = z
  .object({
    name: nameSchema,
    siteName: siteNameSchema,
    siteAddress: siteAddressSchema.nullable(),
    siteMapUrl: mapUrlSchema.nullable(),
    siteContactName: contactNameSchema.nullable(),
    siteContactPhone: phoneSchema.nullable(),
    accessMemo: memoSchema('출입·주의 메모').nullable(),
    clientId: z.uuid(),
    managerId: z.uuid(),
    tradeIds: z
      .array(z.uuid())
      .max(PROJECT_MAX_TRADES, VALIDATION_MESSAGES.TRADES_LIMIT(PROJECT_MAX_TRADES)),
    contractDate: requiredDateSchema,
    plannedStart: requiredDateSchema,
    plannedEnd: requiredDateSchema,
    memo: memoSchema('메모').nullable(),
    // 예정 기간을 바꿀 때의 사유 (시작한 뒤에는 필수, 기간을 바꾸지 않으면 무시)
    periodChangeReason: z
      .string()
      .trim()
      .max(500, VALIDATION_MESSAGES.tooLong('사유', 500))
      .nullable(),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: VALIDATION_MESSAGES.NO_CHANGES,
  })
  .refine(periodRefinement, PERIOD_ERROR);

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

// 상태 전환 요청: 바꿀 상태와 그 일이 실제로 일어난 날(생략하면 오늘), 중단·취소·종료·재오픈은 사유 필수
// 완료 → 보증 중은 프로젝트 요약을 확인했다는 표시(confirmSummary) 필요
export const projectTransitionSchema = z.object({
  toStatus: projectStatusSchema,
  effectiveOn: dateSchema.optional(),
  reason: z.string().trim().max(500, VALIDATION_MESSAGES.tooLong('사유', 500)).nullish(),
  confirmSummary: z.boolean().optional(),
});

export type ProjectTransition = z.infer<typeof projectTransitionSchema>;

export const projectStatusChangeSchema = z.object({
  id: z.uuid(),
  fromStatus: projectStatusSchema,
  toStatus: projectStatusSchema,
  effectiveOn: z.iso.date(),
  reason: z.string().nullable(),
  changedAt: z.iso.datetime(),
});

export type ProjectStatusChange = z.infer<typeof projectStatusChangeSchema>;

// 최근 변경이 맨 앞
export const projectStatusHistorySchema = z.object({ items: z.array(projectStatusChangeSchema) });

export type ProjectStatusHistory = z.infer<typeof projectStatusHistorySchema>;
