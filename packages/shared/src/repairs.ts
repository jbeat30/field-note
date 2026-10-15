import { z } from 'zod';

import type { RuleCheck } from './assignments';
import { changeUsageSchema } from './changeWorks';
import { materialRecordKindSchema } from './materials';
import type { ProjectStatus } from './projects';

// 보수 요청 (서비스 기획서 §10.6): 보증 중 고객이 요청한 하자 보수를 접수부터 처리까지 기록
// 보수 작업은 작업 내역·자재 기록에 "사후 작업"으로 입력하고 이 요청에 연결해 사용한 공수·자재를 건별로 확인
export const REPAIR_STATUSES = ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'DONE'] as const;

export const repairStatusSchema = z.enum(REPAIR_STATUSES);

export type RepairStatus = z.infer<typeof repairStatusSchema>;

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: '접수',
  IN_PROGRESS: '처리 중',
  ON_HOLD: '보류',
  DONE: '완료',
};

export const REPAIR_REQUESTER_MAX_LENGTH = 100;

export const REPAIR_CONTENT_MAX_LENGTH = 2000;

export const REPAIR_LOCATION_MAX_LENGTH = 100;

export const REPAIR_NOTE_MAX_LENGTH = 500;

const dateSchema = z.iso.date('날짜 형식이 올바르지 않습니다');

const requesterSchema = z
  .string()
  .trim()
  .min(1, '요청자를 입력해 주세요')
  .max(
    REPAIR_REQUESTER_MAX_LENGTH,
    `요청자는 ${REPAIR_REQUESTER_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

const contentSchema = z
  .string()
  .trim()
  .min(1, '요청 내용을 입력해 주세요')
  .max(
    REPAIR_CONTENT_MAX_LENGTH,
    `요청 내용은 ${REPAIR_CONTENT_MAX_LENGTH}자까지 입력할 수 있습니다`,
  );

const locationSchema = z
  .string()
  .trim()
  .max(REPAIR_LOCATION_MAX_LENGTH, `위치는 ${REPAIR_LOCATION_MAX_LENGTH}자까지 입력할 수 있습니다`);

export const repairCreateSchema = z.object({
  // 비우면 서울 기준 오늘 (접수한 날, 오늘 이후는 불가)
  receivedOn: dateSchema.optional(),
  requester: requesterSchema,
  content: contentSchema,
  // 하자 위치 (구역·층·호실 등)
  location: locationSchema.nullish(),
});

export type RepairCreate = z.infer<typeof repairCreateSchema>;

// 완료된 건은 고칠 수 없다 (다시 처리 중으로 되돌린 뒤 수정)
export const repairUpdateSchema = repairCreateSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: '변경할 값이 없습니다',
  });

export type RepairUpdate = z.infer<typeof repairUpdateSchema>;

export const repairTransitionSchema = z.object({
  toStatus: repairStatusSchema,
  // 비우면 서울 기준 오늘
  effectiveOn: dateSchema.optional(),
  // 보류와 완료 건을 되돌릴 때 필수
  note: z
    .string()
    .trim()
    .max(REPAIR_NOTE_MAX_LENGTH, `메모는 ${REPAIR_NOTE_MAX_LENGTH}자까지 입력할 수 있습니다`)
    .nullish(),
});

export type RepairTransition = z.infer<typeof repairTransitionSchema>;

// 사후 작업으로 표시한 작업 내역 또는 자재 기록 중 하나를 이 요청에 연결
export const repairLinkSchema = z
  .object({ workLogId: z.uuid().optional(), materialRecordId: z.uuid().optional() })
  .refine((value) => (value.workLogId === undefined) !== (value.materialRecordId === undefined), {
    message: '작업 내역 또는 자재 기록 중 하나를 선택해 주세요',
  });

export type RepairLink = z.infer<typeof repairLinkSchema>;

export const repairParamsSchema = z.object({ id: z.uuid() });

export const repairLinkParamsSchema = z.object({ id: z.uuid(), linkId: z.uuid() });

export const repairListQuerySchema = z.object({ status: repairStatusSchema.optional() });

export type RepairListQuery = z.infer<typeof repairListQuerySchema>;

export const repairRequestSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  // 프로젝트마다 1부터
  seq: z.number().int(),
  receivedOn: dateSchema,
  requester: z.string(),
  content: z.string(),
  location: z.string().nullable(),
  status: repairStatusSchema,
  statusChangedOn: dateSchema,
  // 완료된 날 (완료가 아니면 null)
  resolvedOn: dateSchema.nullable(),
  // 연결한 작업 내역·자재 기록 수
  linkCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type RepairRequest = z.infer<typeof repairRequestSchema>;

export const repairRequestsResponseSchema = z.object({ items: z.array(repairRequestSchema) });

export type RepairRequestsResponse = z.infer<typeof repairRequestsResponseSchema>;

export const repairStatusChangeSchema = z.object({
  id: z.uuid(),
  fromStatus: repairStatusSchema,
  toStatus: repairStatusSchema,
  effectiveOn: dateSchema,
  note: z.string().nullable(),
  changedAt: z.iso.datetime(),
});

export type RepairStatusChange = z.infer<typeof repairStatusChangeSchema>;

export const repairLinkItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('WORK_LOG'),
    id: z.uuid(),
    workLogId: z.uuid(),
    workDate: dateSchema,
    content: z.string(),
    // 그날 작업 내역에 적힌 공수 합(분)
    minutes: z.number().int(),
    linkedAt: z.iso.datetime(),
  }),
  z.object({
    kind: z.literal('MATERIAL'),
    id: z.uuid(),
    materialRecordId: z.uuid(),
    recordDate: dateSchema,
    name: z.string(),
    spec: z.string().nullable(),
    unit: z.string(),
    recordKind: materialRecordKindSchema,
    quantity: z.number(),
    linkedAt: z.iso.datetime(),
  }),
]);

export type RepairLinkItem = z.infer<typeof repairLinkItemSchema>;

// 보수 요청에 연결한 작업 내역의 공수와 사용(USED) 자재 합계 — 프로젝트 사후 작업 합계와 같은 모양
export const repairUsageSchema = changeUsageSchema;

export type RepairUsage = z.infer<typeof repairUsageSchema>;

export const repairRequestDetailSchema = repairRequestSchema.extend({
  // 최근 변경이 맨 앞
  history: z.array(repairStatusChangeSchema),
  // 연결한 것이 먼저
  links: z.array(repairLinkItemSchema),
  usage: repairUsageSchema,
});

export type RepairRequestDetail = z.infer<typeof repairRequestDetailSchema>;

/**
 * @description 미처리 보수 요청인지: 접수·처리 중이면 보증 종료를 막는다 (보류는 종료 전 안내만, 서비스 기획서 §10.3)
 * @param status 보수 요청 상태
 * @returns 미처리 여부
 */
export const isRepairOpen = (status: RepairStatus) =>
  status === 'RECEIVED' || status === 'IN_PROGRESS';

/**
 * @description 요청 내용을 고칠 수 있는지 (완료된 건은 처리 중 등으로 되돌린 뒤에만)
 * @param status 보수 요청 상태
 * @returns 수정 가능 여부
 */
export const canEditRepair = (status: RepairStatus) => status !== 'DONE';

// 보수 요청은 보증 중인 프로젝트에서만 기록·변경, 완료·종료·그 전 상태는 조회만 (§10.3 "보증 중: 보수 요청 기록")
export const repairProjectCheck = (status: ProjectStatus): RuleCheck => {
  if (status === 'WARRANTY') {
    return { ok: true };
  }

  return {
    ok: false,
    path: 'projectId',
    message:
      status === 'CLOSED'
        ? '종료된 프로젝트입니다. 재오픈한 뒤 보수 요청을 기록할 수 있습니다'
        : status === 'COMPLETED'
          ? '보증을 시작한 뒤에 보수 요청을 기록할 수 있습니다'
          : '보증 중인 프로젝트에서만 보수 요청을 기록할 수 있습니다',
  };
};

/**
 * @description 보수 요청의 상태를 바꿀 수 있는지: 다른 상태로만, 보류와 완료 건을 되돌릴 때는 메모 필수, 날짜는 접수일 이후 오늘까지
 * @param input 현재·변경할 상태, 실제 바뀐 날, 메모, 접수일, 오늘(서울 기준)
 * @returns 통과 여부와 어느 입력이 왜 안 되는지
 */
export const validateRepairTransition = (input: {
  from: RepairStatus;
  to: RepairStatus;
  effectiveOn: string;
  note: string | null;
  receivedOn: string;
  today: string;
}): RuleCheck => {
  if (input.from === input.to) {
    return { ok: false, path: 'toStatus', message: '이미 같은 상태입니다' };
  }

  if (input.to === 'ON_HOLD' && !input.note) {
    return { ok: false, path: 'note', message: '보류 사유를 입력해 주세요' };
  }

  if (input.from === 'DONE' && !input.note) {
    return { ok: false, path: 'note', message: '완료를 되돌리는 사유를 입력해 주세요' };
  }

  if (input.effectiveOn > input.today) {
    return { ok: false, path: 'effectiveOn', message: '오늘 이후 날짜로 바꿀 수 없습니다' };
  }

  if (input.effectiveOn < input.receivedOn) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: `접수일(${input.receivedOn})보다 앞선 날짜로 바꿀 수 없습니다`,
    };
  }

  return { ok: true };
};
