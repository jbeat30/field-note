import { z } from 'zod';

import type { RuleCheck } from './assignments';
import { documentCategorySchema } from './documents';
import { projectStatusSchema, type ProjectStatus } from './projects';

import { VALIDATION_MESSAGES } from './errorMessages';
// 변경·추가 작업 기록: 계약 후 범위·내용이 바뀌거나 늘어나는 일의 요청·합의 기록
// 말로 합의하고 먼저 작업하는 일이 많아 "누가 언제 요청했는가"가 근거, 금액은 기록 제외
export const CHANGE_WORK_STATUSES = ['NEGOTIATING', 'AGREED', 'WITHDRAWN'] as const;

export const changeWorkStatusSchema = z.enum(CHANGE_WORK_STATUSES);

export type ChangeWorkStatus = z.infer<typeof changeWorkStatusSchema>;

export const CHANGE_WORK_STATUS_LABELS: Record<ChangeWorkStatus, string> = {
  NEGOTIATING: '협의 중',
  AGREED: '합의됨',
  WITHDRAWN: '철회',
};

export const CHANGE_WORK_REQUESTER_MAX_LENGTH = 100;

export const CHANGE_WORK_CONTENT_MAX_LENGTH = 2000;

export const CHANGE_WORK_NOTE_MAX_LENGTH = 500;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const requesterSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required('요청자'))
  .max(
    CHANGE_WORK_REQUESTER_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('요청자', CHANGE_WORK_REQUESTER_MAX_LENGTH),
  );

const contentSchema = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required('내용'))
  .max(
    CHANGE_WORK_CONTENT_MAX_LENGTH,
    VALIDATION_MESSAGES.tooLong('내용', CHANGE_WORK_CONTENT_MAX_LENGTH),
  );

// 완료된 프로젝트에 기록할 때 관리자가 확인했다는 표시
const confirmSchema = z.boolean().optional();

export const changeWorkCreateSchema = z.object({
  // 비우면 서울 기준 오늘 (요청받은 날, 오늘 이후는 불가)
  requestedOn: dateSchema.optional(),
  requester: requesterSchema,
  content: contentSchema,
  confirmCompleted: confirmSchema,
});

export type ChangeWorkCreate = z.infer<typeof changeWorkCreateSchema>;

// 협의 중일 때만 고칠 수 있음 (합의·철회된 기록은 그대로 보존)
export const changeWorkUpdateSchema = z
  .object({
    requestedOn: dateSchema,
    requester: requesterSchema,
    content: contentSchema,
    confirmCompleted: confirmSchema,
  })
  .partial()
  .refine(
    (value) =>
      value.requestedOn !== undefined ||
      value.requester !== undefined ||
      value.content !== undefined,
    { message: VALIDATION_MESSAGES.NO_CHANGES },
  );

export type ChangeWorkUpdate = z.infer<typeof changeWorkUpdateSchema>;

export const changeWorkTransitionSchema = z.object({
  toStatus: changeWorkStatusSchema,
  // 비우면 서울 기준 오늘 (실제로 바뀐 날, 오늘 이후는 불가)
  effectiveOn: dateSchema.optional(),
  // 철회는 사유 필수
  note: z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.OMIT_TO_CLEAR_NOTE)
    .max(
      CHANGE_WORK_NOTE_MAX_LENGTH,
      VALIDATION_MESSAGES.tooLong('메모', CHANGE_WORK_NOTE_MAX_LENGTH),
    )
    .optional(),
  confirmCompleted: confirmSchema,
});

export type ChangeWorkTransition = z.infer<typeof changeWorkTransitionSchema>;

export const changeWorkLinkSchema = z.object({
  documentId: z.uuid(VALIDATION_MESSAGES.selectRequired('문서')),
  confirmCompleted: confirmSchema,
});

export type ChangeWorkLink = z.infer<typeof changeWorkLinkSchema>;

// 증빙 올리기: 올린 파일로 문서함에 "계약·공문" 문서를 만들고 이 변경·추가 작업에 한 번에 연결
export const changeWorkEvidenceCreateSchema = z.object({
  fileId: z.uuid(),
  title: z.string().trim().min(1, VALIDATION_MESSAGES.required('증빙 이름')).max(100),
  confirmCompleted: confirmSchema,
});

export type ChangeWorkEvidenceCreate = z.infer<typeof changeWorkEvidenceCreateSchema>;

export const changeWorkUnlinkQuerySchema = z.object({
  confirmCompleted: z.enum(['true']).optional(),
});

export type ChangeWorkUnlinkQuery = z.infer<typeof changeWorkUnlinkQuerySchema>;

export const changeWorkListQuerySchema = z.object({ status: changeWorkStatusSchema.optional() });

export type ChangeWorkListQuery = z.infer<typeof changeWorkListQuerySchema>;

export const changeWorkParamsSchema = z.object({ id: z.uuid() });

export const changeWorkDocumentParamsSchema = z.object({ id: z.uuid(), documentId: z.uuid() });

export const changeWorkSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  // 프로젝트마다 1부터
  seq: z.number().int(),
  requestedOn: dateSchema,
  requester: z.string(),
  content: z.string(),
  status: changeWorkStatusSchema,
  // 현재 상태가 된 날 (협의 중이 오래 남았는지 보는 기준)
  statusChangedOn: dateSchema,
  // 연결된 증빙 문서 수
  documentCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ChangeWork = z.infer<typeof changeWorkSchema>;

// 번호 큰(최근) 것이 맨 앞
export const changeWorksResponseSchema = z.object({ items: z.array(changeWorkSchema) });

export type ChangeWorksResponse = z.infer<typeof changeWorksResponseSchema>;

export const changeWorkStatusChangeSchema = z.object({
  id: z.uuid(),
  fromStatus: changeWorkStatusSchema,
  toStatus: changeWorkStatusSchema,
  effectiveOn: dateSchema,
  note: z.string().nullable(),
  changedAt: z.iso.datetime(),
});

export type ChangeWorkStatusChange = z.infer<typeof changeWorkStatusChangeSchema>;

export const changeWorkDocumentSchema = z.object({
  documentId: z.uuid(),
  title: z.string(),
  category: documentCategorySchema,
  isSensitive: z.boolean(),
  // 열 때 쓰는 최신 판 번호와 파일 형식 (이미지인지 PDF인지 구분)
  latestVersionNo: z.number().int(),
  contentType: z.string(),
  linkedAt: z.iso.datetime(),
});

export type ChangeWorkDocument = z.infer<typeof changeWorkDocumentSchema>;

export const changeWorkDetailSchema = changeWorkSchema.extend({
  // 최근 변경이 맨 앞
  history: z.array(changeWorkStatusChangeSchema),
  // 연결한 것이 먼저 (삭제된 문서는 제외)
  documents: z.array(changeWorkDocumentSchema),
});

export type ChangeWorkDetail = z.infer<typeof changeWorkDetailSchema>;

// 변경·추가 작업으로 쓴 공수·자재: 작업 내역·자재 기록의 "변경 작업" 표시를 프로젝트 단위로 합산한 값
export const changeUsageSchema = z.object({
  // 변경·추가 작업 표시가 된 저장 작업 내역의 수와 공수 합(분)
  workLogCount: z.number().int(),
  minutes: z.number().int(),
  // 변경·추가 작업 표시가 된 자재의 사용량 (자재마다 합)
  materials: z.array(
    z.object({
      materialId: z.uuid(),
      name: z.string(),
      spec: z.string().nullable(),
      unit: z.string(),
      quantity: z.number(),
    }),
  ),
});

export type ChangeUsage = z.infer<typeof changeUsageSchema>;

// 이 프로젝트 상태에서 변경·추가 작업을 기록·수정할 수 있는지 ("변경·추가 작업 기록" 행)
// 예정·진행·중단은 가능, 완료는 관리자 확인이 있을 때만, 보증 중·종료·취소는 불가
export const changeWorkProjectCheck = (
  status: ProjectStatus,
  confirmedCompleted: boolean,
): RuleCheck => {
  const parsed = projectStatusSchema.parse(status);

  if (parsed === 'PLANNED' || parsed === 'IN_PROGRESS' || parsed === 'SUSPENDED') {
    return { ok: true };
  }

  if (parsed === 'COMPLETED') {
    return confirmedCompleted
      ? { ok: true }
      : {
          ok: false,
          path: 'confirmCompleted',
          message: VALIDATION_MESSAGES.CHANGE_WORK_COMPLETED_CONFIRM,
        };
  }

  return {
    ok: false,
    path: 'projectId',
    message: VALIDATION_MESSAGES.CHANGE_WORK_BLOCKED_BY_STATUS,
  };
};

/**
 * @description 변경·추가 작업의 상태를 바꿀 수 있는지: 다른 상태로만, 철회는 사유 필수, 날짜는 요청일 이후 오늘까지
 * @param input 현재·변경할 상태, 실제 바뀐 날, 메모, 요청일, 오늘(서울 기준)
 * @returns 통과 여부와 어느 입력이 왜 안 되는지
 */
export const validateChangeWorkTransition = (input: {
  from: ChangeWorkStatus;
  to: ChangeWorkStatus;
  effectiveOn: string;
  note: string | null;
  requestedOn: string;
  today: string;
}): RuleCheck => {
  if (input.from === input.to) {
    return { ok: false, path: 'toStatus', message: VALIDATION_MESSAGES.STATUS_ALREADY_SAME };
  }

  if (input.to === 'WITHDRAWN' && !input.note) {
    return { ok: false, path: 'note', message: VALIDATION_MESSAGES.required('철회 사유') };
  }

  if (input.effectiveOn > input.today) {
    return { ok: false, path: 'effectiveOn', message: VALIDATION_MESSAGES.DATE_AFTER_TODAY_CHANGE };
  }

  if (input.effectiveOn < input.requestedOn) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: VALIDATION_MESSAGES.CHANGE_WORK_DATE_BEFORE_REQUEST(input.requestedOn),
    };
  }

  return { ok: true };
};

/**
 * @description 협의 중인 채로 며칠이 지났는지 (오래 방치된 건 알림의 기준, "7일 경과")
 * @param statusChangedOn 현재 상태가 된 날
 * @param today 오늘(서울 기준)
 * @returns 지난 일수 (오늘 바뀌었으면 0)
 */
export const daysInStatus = (statusChangedOn: string, today: string) =>
  Math.max(
    0,
    Math.round(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${statusChangedOn}T00:00:00Z`)) / 86_400_000,
    ),
  );
