import { z } from 'zod';

// 프로젝트 (서비스 기획서 §10.2, §10.3). 계약 금액은 다루지 않는다
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

// 상태 이름은 회사가 바꿀 수 있게 될 수 있지만(§10.3) 지금은 기본 이름만 쓴다
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: '예정',
  IN_PROGRESS: '진행',
  SUSPENDED: '중단',
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
  .min(1, '프로젝트명을 입력해 주세요')
  .max(PROJECT_NAME_MAX_LENGTH, `프로젝트명은 ${PROJECT_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`);

const siteNameSchema = z
  .string()
  .trim()
  .min(1, '현장 이름을 입력해 주세요')
  .max(
    PROJECT_SITE_NAME_MAX_LENGTH,
    `현장 이름은 ${PROJECT_SITE_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

const siteAddressSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PROJECT_SITE_ADDRESS_MAX_LENGTH,
    `주소는 ${PROJECT_SITE_ADDRESS_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

// 지도 링크는 http(s)만 허용 (javascript: 같은 주소가 링크로 열리지 않게 함)
const mapUrlSchema = z
  .string()
  .trim()
  .max(
    PROJECT_MAP_URL_MAX_LENGTH,
    `지도 링크는 ${PROJECT_MAP_URL_MAX_LENGTH}자까지 입력할 수 있습니다`,
  )
  .regex(/^https?:\/\/\S+$/i, '지도 링크는 http:// 또는 https://로 시작해야 합니다');

const contactNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(
    PROJECT_CONTACT_NAME_MAX_LENGTH,
    `담당자는 ${PROJECT_CONTACT_NAME_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(PROJECT_PHONE_MAX_LENGTH, `연락처는 ${PROJECT_PHONE_MAX_LENGTH}자까지 입력할 수 있습니다`)
  .regex(/^[0-9+\-() ]+$/, '연락처는 숫자와 - ( ) + 만 입력할 수 있습니다');

const memoSchema = (label: string) =>
  z
    .string()
    .max(PROJECT_MEMO_MAX_LENGTH, `${label}는 ${PROJECT_MEMO_MAX_LENGTH}자까지 입력할 수 있습니다`);

const dateSchema = z.iso
  .date('날짜 형식이 올바르지 않습니다')
  .refine(
    (value) => value >= PROJECT_MIN_DATE && value <= PROJECT_MAX_DATE,
    '날짜 범위를 확인해 주세요',
  );

// 목록·카드 공통 항목 (현장 연락처·출입 메모·계약일·메모는 카드에서만)
export const projectSummarySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: projectStatusSchema,
  siteName: z.string(),
  // 명부·직원·선택 목록 항목의 id. 이름은 각 목록에서 찾는다
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

export const projectsResponseSchema = z.object({ items: z.array(projectSummarySchema) });

export type ProjectsResponse = z.infer<typeof projectsResponseSchema>;

// 정렬: 최근 등록(코드 내림차순), 종료 예정일이 가까운 순, 프로젝트명 순
export const PROJECT_SORTS = ['recent', 'endDate', 'name'] as const;

export const projectSortSchema = z.enum(PROJECT_SORTS);

export type ProjectSort = z.infer<typeof projectSortSchema>;

export const PROJECT_SORT_LABELS: Record<ProjectSort, string> = {
  recent: '최근 등록순',
  endDate: '종료 예정일 빠른 순',
  name: '이름순',
};

export const projectListQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  clientId: z.uuid().optional(),
  managerId: z.uuid().optional(),
  tradeId: z.uuid().optional(),
  // 이 기간과 겹치는 프로젝트만 (시작·종료 예정일 기준)
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  // 프로젝트명·코드·현장 이름 검색 (부분 일치)
  q: z.string().trim().max(PROJECT_NAME_MAX_LENGTH).optional(),
  sort: projectSortSchema.optional(),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const projectParamsSchema = z.object({ id: z.uuid() });

const periodRefinement = (value: { plannedStart?: string; plannedEnd?: string }) =>
  !value.plannedStart || !value.plannedEnd || value.plannedStart <= value.plannedEnd;

const PERIOD_ERROR = {
  message: '종료 예정일은 시작 예정일보다 빠를 수 없습니다',
  path: ['plannedEnd'],
};

// 등록: 서비스 기획서 §10.2에서 "등록 때 필수"인 항목만 요구하고 나머지는 나중에 채운다
export const projectCreateSchema = z
  .object({
    name: nameSchema,
    siteName: siteNameSchema,
    siteAddress: siteAddressSchema.nullish(),
    siteMapUrl: mapUrlSchema.nullish(),
    siteContactName: contactNameSchema.nullish(),
    siteContactPhone: phoneSchema.nullish(),
    accessMemo: memoSchema('출입·주의 메모').nullish(),
    clientId: z.uuid('고객을 선택해 주세요'),
    managerId: z.uuid('담당자를 선택해 주세요'),
    tradeIds: z
      .array(z.uuid())
      .max(PROJECT_MAX_TRADES, `공종은 ${PROJECT_MAX_TRADES}개까지 고를 수 있습니다`)
      .optional(),
    contractDate: dateSchema,
    plannedStart: dateSchema,
    plannedEnd: dateSchema,
    memo: memoSchema('메모').nullish(),
  })
  .refine(periodRefinement, PERIOD_ERROR);

export type ProjectCreate = z.infer<typeof projectCreateSchema>;

// 수정: 보낸 항목만 바꾸고, 비울 수 있는 항목은 null로 지운다. 코드와 상태는 바꿀 수 없다 (상태는 P1-6의 전환 규칙으로만)
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
      .max(PROJECT_MAX_TRADES, `공종은 ${PROJECT_MAX_TRADES}개까지 고를 수 있습니다`),
    contractDate: dateSchema,
    plannedStart: dateSchema,
    plannedEnd: dateSchema,
    memo: memoSchema('메모').nullable(),
    // 예정 기간을 바꿀 때의 사유 (시작한 뒤에는 필수, 기간을 바꾸지 않으면 무시)
    periodChangeReason: z
      .string()
      .trim()
      .max(500, '사유는 500자까지 입력할 수 있습니다')
      .nullable(),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  })
  .refine(periodRefinement, PERIOD_ERROR);

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

// 상태 전환 요청: 바꿀 상태와 그 일이 실제로 일어난 날(생략하면 오늘), 중단·취소는 사유 필수
export const projectTransitionSchema = z.object({
  toStatus: projectStatusSchema,
  effectiveOn: dateSchema.optional(),
  reason: z.string().trim().max(500, '사유는 500자까지 입력할 수 있습니다').nullish(),
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
