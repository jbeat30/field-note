import { z } from 'zod';

import { documentCategorySchema } from './documents';
import { materialBalanceItemSchema } from './materials';
import { photoCategorySchema } from './photos';
import { PROJECT_STATUS_LABELS, projectStatusSchema, type ProjectStatus } from './projects';
import { workUnitModeSchema } from './account';
import { changeWorkStatusSchema } from './changeWorks';

const dateSchema = z.iso.date();

// 상태 전환 안내 (서비스 기획서 §10.3): 완료·재개처럼 확인할 것이 있는 전환에서 막지는 않고 알려 준다
export const transitionNoticesQuerySchema = z.object({ to: projectStatusSchema });

export type TransitionNoticesQuery = z.infer<typeof transitionNoticesQuerySchema>;

export const transitionNoticeSchema = z.discriminatedUnion('type', [
  // 임시 저장된 작업 내역 (집계에는 저장된 작업 내역만 반영되므로 완료 전에 정리)
  z.object({ type: z.literal('DRAFT_LOGS'), count: z.number().int() }),
  // 진행률이 100%가 아님 (기록이 없으면 null)
  z.object({ type: z.literal('PROGRESS_BELOW_100'), percent: z.number().int().nullable() }),
  // 잔량이 남았거나 마이너스인 자재
  z.object({
    type: z.literal('REMAINING_MATERIALS'),
    items: z.array(
      z.object({
        materialId: z.uuid(),
        name: z.string(),
        spec: z.string().nullable(),
        unit: z.string(),
        remaining: z.number(),
      }),
    ),
  }),
  // 아직 합의되지 않은(협의 중) 변경·추가 작업
  z.object({ type: z.literal('NEGOTIATING_CHANGES'), count: z.number().int() }),
  // 종료 전환: 접수·처리 중인 보수 요청 (남아 있으면 종료할 수 없음)
  z.object({ type: z.literal('OPEN_REPAIRS'), count: z.number().int() }),
  // 종료 전환: 보류 중인 보수 요청 (종료는 막지 않고 알림)
  z.object({ type: z.literal('HOLD_REPAIRS'), count: z.number().int() }),
  // 중단 뒤 재개하는데 종료 예정일이 이미 지남
  z.object({ type: z.literal('PERIOD_OVER'), plannedEnd: dateSchema }),
]);

export type TransitionNotice = z.infer<typeof transitionNoticeSchema>;

export const transitionNoticesSchema = z.object({ items: z.array(transitionNoticeSchema) });

export type TransitionNotices = z.infer<typeof transitionNoticesSchema>;

type CheckInput = {
  from: ProjectStatus;
  to: ProjectStatus;
  draftLogCount: number;
  progressPercent: number | null;
  materials: readonly {
    materialId: string;
    name: string;
    spec: string | null;
    unit: string;
    remaining: number;
  }[];
  negotiatingCount: number;
  openRepairCount: number;
  holdRepairCount: number;
  plannedEnd: string;
  today: string;
};

/**
 * @description 이 전환에서 확인할 것을 모은다. 진행 → 완료는 임시 저장 작업 내역(종료 전환에서도)·진행률 100%·남은 자재·협의 중 변경 작업,
 * 중단 → 진행은 종료 예정일 경과를 알린다 (§10.3). 막는 조건이 아니라 안내이다
 * @param input 현재·변경할 상태와 프로젝트 현황
 * @returns 확인할 항목 (없으면 빈 목록)
 */
export const evaluateTransitionNotices = (input: CheckInput): TransitionNotice[] => {
  const checks: TransitionNotice[] = [];

  // 종료는 임시 저장 작업 내역이 남아 있으면 막힌다 (§10.3). 안내를 먼저 보여 줌
  if ((input.to === 'COMPLETED' || input.to === 'CLOSED') && input.draftLogCount > 0) {
    checks.push({ type: 'DRAFT_LOGS', count: input.draftLogCount });
  }

  if (input.to === 'COMPLETED') {
    if (input.progressPercent === null || input.progressPercent < 100) {
      checks.push({ type: 'PROGRESS_BELOW_100', percent: input.progressPercent });
    }

    const remaining = input.materials.filter((item) => item.remaining !== 0);

    if (remaining.length > 0) {
      checks.push({ type: 'REMAINING_MATERIALS', items: [...remaining] });
    }

    if (input.negotiatingCount > 0) {
      checks.push({ type: 'NEGOTIATING_CHANGES', count: input.negotiatingCount });
    }
  }

  if (input.to === 'CLOSED' && input.openRepairCount > 0) {
    checks.push({ type: 'OPEN_REPAIRS', count: input.openRepairCount });
  }

  if (input.to === 'CLOSED' && input.holdRepairCount > 0) {
    checks.push({ type: 'HOLD_REPAIRS', count: input.holdRepairCount });
  }

  if (input.from === 'SUSPENDED' && input.to === 'IN_PROGRESS' && input.today > input.plannedEnd) {
    checks.push({ type: 'PERIOD_OVER', plannedEnd: input.plannedEnd });
  }

  return checks;
};

/**
 * @description 전환 점검 항목을 화면에 보여 줄 문장으로 바꾼다
 * @param check 점검 항목
 * @returns 안내 문장
 */
export const transitionNoticeMessage = (check: TransitionNotice): string => {
  switch (check.type) {
    case 'DRAFT_LOGS':
      return `임시 저장된 작업 내역가 ${check.count}건 있습니다. 집계에는 저장된 작업 내역만 반영되니 전환 전에 저장하거나 정리해 주세요`;
    case 'PROGRESS_BELOW_100':
      return check.percent === null
        ? '진행률 기록이 없습니다. 완료하기 전에 진행률을 기록해 주세요'
        : `진행률이 ${check.percent}%입니다. 완료하기 전에 100%인지 확인해 주세요`;
    case 'REMAINING_MATERIALS':
      return `잔량이 남았거나 마이너스인 자재가 ${check.items.length}종 있습니다 (${check.items
        .slice(0, 3)
        .map((item) => `${item.name} ${item.remaining}${item.unit}`)
        .join(', ')}${check.items.length > 3 ? ' 등' : ''})`;
    case 'NEGOTIATING_CHANGES':
      return `아직 협의 중인 변경·추가 작업이 ${check.count}건 있습니다. 합의 또는 철회로 정리해 주세요`;
    case 'OPEN_REPAIRS':
      return `접수·처리 중인 보수 요청이 ${check.count}건 있어 종료할 수 없습니다. 완료하거나 보류로 정리해 주세요`;
    case 'HOLD_REPAIRS':
      return `보류 중인 보수 요청이 ${check.count}건 있습니다. 종료하면 더 처리할 수 없으니 확인해 주세요`;
    case 'PERIOD_OVER':
      return `종료 예정일(${check.plannedEnd})이 이미 지났습니다. 필요하면 기본정보에서 기간을 연장해 주세요`;
  }
};

// 프로젝트 요약 (완료 리포트, §10.7): 완료 뒤에도 최신 기록을 반영해 그때그때 만든다. 금액·민감 자료는 싣지 않는다
export const projectCompletionSummarySchema = z.object({
  generatedOn: dateSchema,
  companyName: z.string(),
  project: z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    status: projectStatusSchema,
    siteName: z.string(),
    siteAddress: z.string().nullable(),
    clientName: z.string(),
    managerName: z.string(),
    contractDate: dateSchema,
    plannedStart: dateSchema,
    plannedEnd: dateSchema,
    actualStart: dateSchema.nullable(),
    actualEnd: dateSchema.nullable(),
  }),
  progressPercent: z.number().int().nullable(),
  settings: z.object({
    workUnitMode: workUnitModeSchema,
    standardWorkMinutes: z.number().int(),
    monthlyWorkDays: z.number().int(),
  }),
  work: z.object({
    totalMinutes: z.number().int(),
    // 계획 공수(분): 계획이 없으면 null
    plannedMinutes: z.number().int().nullable(),
    workedDays: z.number().int(),
    savedLogCount: z.number().int(),
    byEmployee: z.array(
      z.object({
        employeeId: z.uuid(),
        name: z.string(),
        workedDays: z.number().int(),
        minutes: z.number().int(),
      }),
    ),
    byCategory: z.array(z.object({ categoryName: z.string(), minutes: z.number().int() })),
  }),
  materials: z.array(materialBalanceItemSchema),
  changeWorks: z.object({
    items: z.array(
      z.object({
        seq: z.number().int(),
        requestedOn: dateSchema,
        requester: z.string(),
        content: z.string(),
        status: changeWorkStatusSchema,
      }),
    ),
    // 변경·추가 작업 표시가 된 저장 작업 내역의 공수(분)와 작업 내역 수
    minutes: z.number().int(),
    workLogCount: z.number().int(),
  }),
  // 사후 작업 표시가 된 저장 작업 내역 (보수 요청 기록은 4단계)
  afterService: z.object({ minutes: z.number().int(), workLogCount: z.number().int() }),
  photos: z.object({
    total: z.number().int(),
    // 대표 컷: 대표로 지정한 것이 먼저, 그다음 최근 촬영순
    items: z.array(
      z.object({
        id: z.uuid(),
        category: photoCategorySchema,
        area: z.string().nullable(),
        description: z.string().nullable(),
        takenAt: z.iso.datetime(),
        thumbnailUrl: z.string().nullable(),
      }),
    ),
  }),
  documents: z.object({
    // 민감 자료는 목록에서 빼고 건수만 알린다
    sensitiveExcluded: z.number().int(),
    items: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        category: documentCategorySchema,
        versionCount: z.number().int(),
        latestRevisionDate: dateSchema,
      }),
    ),
  }),
});

export type ProjectCompletionSummary = z.infer<typeof projectCompletionSummarySchema>;

// 마감 요약의 사진·문서 선택 규칙 (09 문서 §3.8): 직접 고른 것이 우선이고, 하나도 고르지 않았으면 기본 규칙을 쓴다
export const SUMMARY_PHOTO_MAX = 12;
export const SUMMARY_PHOTO_DEFAULT_COUNT = 8;
// 요약에 넣을 수 있는 문서 분류
export const SUMMARY_DOCUMENT_CATEGORIES = ['SAFETY', 'CONTRACT'] as const;

/**
 * @description 마감 요약에 실을 사진을 고름. 직접 고른 사진이 있으면 그것을 최근 촬영순으로 SUMMARY_PHOTO_MAX장까지,
 * 없으면 작업 후 사진 중 최근 SUMMARY_PHOTO_DEFAULT_COUNT장
 * @param photos 검사가 끝난 사진 (촬영일시, 분류, 고름 표시)
 * @returns 요약에 실을 사진 id (최근 촬영순)
 */
export const selectSummaryPhotos = (
  photos: readonly {
    id: string;
    category: string;
    takenAt: string;
    includeInSummary: boolean;
  }[],
) => {
  const newestFirst = (a: { takenAt: string; id: string }, b: { takenAt: string; id: string }) =>
    b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id);
  const chosen = photos.filter((photo) => photo.includeInSummary);

  return (
    chosen.length > 0
      ? [...chosen].sort(newestFirst).slice(0, SUMMARY_PHOTO_MAX)
      : photos
          .filter((photo) => photo.category === 'AFTER')
          .sort(newestFirst)
          .slice(0, SUMMARY_PHOTO_DEFAULT_COUNT)
  ).map((photo) => photo.id);
};

/**
 * @description 마감 요약에 실을 문서를 고름. 안전·검사, 계약·공문 분류의 민감 자료가 아닌 문서 중 직접 고른 것,
 * 하나도 고르지 않았으면 그 분류의 민감 자료가 아닌 문서 모두
 * @param documents 삭제되지 않은 문서 (분류, 민감 여부, 고름 표시)
 * @returns 요약에 실을 문서 id (받은 순서 그대로)
 */
export const selectSummaryDocuments = (
  documents: readonly {
    id: string;
    category: string;
    isSensitive: boolean;
    includeInSummary: boolean;
  }[],
) => {
  const eligible = documents.filter(
    (document) =>
      !document.isSensitive &&
      (SUMMARY_DOCUMENT_CATEGORIES as readonly string[]).includes(document.category),
  );
  const chosen = eligible.filter((document) => document.includeInSummary);

  return (chosen.length > 0 ? chosen : eligible).map((document) => document.id);
};

/**
 * @description 요약 제목 옆에 붙이는 상태 이름
 * @param status 프로젝트 상태
 */
export const summaryStatusLabel = (status: ProjectStatus) => PROJECT_STATUS_LABELS[status];
