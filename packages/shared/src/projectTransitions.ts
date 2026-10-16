import { PROJECT_STATUS_LABELS, type ProjectStatus } from './projects';

import { VALIDATION_MESSAGES } from './errorMessages';
// 프로젝트 상태 전환 규칙, 서버와 목업 서버가 같은 규칙 사용
// 완료 → 보증 중 → 종료, 종료 재오픈 (보증 중으로 되돌림)
// 완료 → 종료는 보증 기간이 0개월일 때만 (검사는 validateProjectTransition)
export const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUSPENDED', 'COMPLETED', 'CANCELLED'],
  SUSPENDED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['WARRANTY', 'CLOSED'],
  WARRANTY: ['CLOSED'],
  CLOSED: ['WARRANTY'],
  CANCELLED: [],
};

export const PROJECT_REASON_MAX_LENGTH = 500;

/**
 * @description 사유가 반드시 필요한 전환인지 (기록의 신뢰성: 왜 멈췄고 왜 취소했고 왜 조기 종료·재오픈했는지)
 * 보증 중 → 종료는 보증 종료 예정일 전에 종료할 때(조기 종료)만 사유 필요, 날짜를 모르면 필요한 것으로 간주
 * @param from 현재 상태
 * @param to 바꿀 상태
 * @param context 종료일과 보증 종료 예정일 (보증 중 → 종료의 조기 종료 판단용)
 * @returns 사유 필수 여부
 */
export const transitionNeedsReason = (
  from: ProjectStatus,
  to: ProjectStatus,
  context?: { effectiveOn: string; warrantyEndOn: string | null },
) => {
  if (to === 'SUSPENDED' || to === 'CANCELLED') return true;
  if (from === 'CLOSED' && to === 'WARRANTY') return true;
  if (from === 'WARRANTY' && to === 'CLOSED') {
    return (
      !context || context.warrantyEndOn === null || context.effectiveOn < context.warrantyEndOn
    );
  }

  return false;
};

/**
 * @description 완료 → 보증 중에서 프로젝트 요약을 확인해야 하는지 (전환 조건)
 * @param from 현재 상태
 * @param to 바꿀 상태
 * @returns 요약 확인 필수 여부
 */
export const transitionNeedsSummaryConfirm = (from: ProjectStatus, to: ProjectStatus) =>
  from === 'COMPLETED' && to === 'WARRANTY';

/**
 * @description 전환에 입력하는 날짜의 이름 (예: 예정 → 진행은 "실제 시작일", 중단 → 진행은 "재개일")
 * @param from 현재 상태
 * @param to 바꿀 상태
 * @returns 화면에 보일 날짜 이름
 */
export const transitionDateLabel = (from: ProjectStatus, to: ProjectStatus) => {
  if (to === 'IN_PROGRESS') return from === 'SUSPENDED' ? '재개일' : '실제 시작일';
  if (to === 'SUSPENDED') return '중단일';
  if (to === 'COMPLETED') return '실제 완료일';
  if (to === 'CANCELLED') return '취소일';
  if (to === 'CLOSED') return '종료일';
  if (to === 'WARRANTY') return from === 'CLOSED' ? '재오픈일' : '보증 시작일';

  return '변경일';
};

export type TransitionCheckInput = {
  from: ProjectStatus;
  to: ProjectStatus;
  // 상태가 실제로 바뀐 날
  effectiveOn: string;
  reason: string | null;
  // 이 프로젝트의 실제 시작일 (시작한 적이 없으면 null)
  actualStart: string | null;
  // 가장 최근 상태 변경일 (처음이면 null)
  lastEffectiveOn: string | null;
  // 서울 기준 오늘
  today: string;
  // 프로젝트 요약 확인 여부 (완료 → 보증 중에서만 필요)
  confirmSummary: boolean;
  // 임시 저장된 작업 내역 건수 (종료에서는 0이어야 함)
  draftLogCount: number;
  // 보증 기간(개월)과 종료 예정일, 설정이 없으면 기본 기간과 null
  warrantyMonths: number;
  warrantyEndOn: string | null;
  // 접수·처리 중인 보수 요청 건수 (보증 중 → 종료에서는 0이어야 함)
  openRepairCount: number;
};

export type TransitionCheck =
  | { ok: true }
  | {
      ok: false;
      path: 'toStatus' | 'effectiveOn' | 'reason' | 'confirmSummary';
      message: string;
    };

/**
 * @description 상태 전환이 규칙에 맞는지 검사 (허용된 전환, 날짜 순서, 사유)
 * @param input 현재 상태, 바꿀 상태, 날짜, 사유와 기준 날짜들
 * @returns 통과 여부와 어느 입력이 왜 안 되는지
 */
export const validateProjectTransition = (input: TransitionCheckInput): TransitionCheck => {
  const { from, to, effectiveOn, reason, actualStart, lastEffectiveOn, today } = input;
  const label = transitionDateLabel(from, to);

  if (!PROJECT_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      path: 'toStatus',
      message: VALIDATION_MESSAGES.STATUS_TRANSITION_NOT_ALLOWED(
        PROJECT_STATUS_LABELS[from],
        PROJECT_STATUS_LABELS[to],
      ),
    };
  }

  if (effectiveOn > today) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: VALIDATION_MESSAGES.DATE_AFTER_TODAY_INPUT(label),
    };
  }

  if (lastEffectiveOn && effectiveOn < lastEffectiveOn) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: VALIDATION_MESSAGES.DATE_BEFORE_LAST_STATUS_CHANGE(label, lastEffectiveOn),
    };
  }

  if (to === 'COMPLETED' && actualStart && effectiveOn < actualStart) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: VALIDATION_MESSAGES.ACTUAL_END_BEFORE_START,
    };
  }

  const trimmed = reason?.trim() ?? '';

  if (
    transitionNeedsReason(from, to, { effectiveOn, warrantyEndOn: input.warrantyEndOn }) &&
    trimmed.length === 0
  ) {
    return { ok: false, path: 'reason', message: VALIDATION_MESSAGES.required('사유') };
  }

  if (trimmed.length > PROJECT_REASON_MAX_LENGTH) {
    return {
      ok: false,
      path: 'reason',
      message: VALIDATION_MESSAGES.tooLong('사유', PROJECT_REASON_MAX_LENGTH),
    };
  }

  if (transitionNeedsSummaryConfirm(from, to) && !input.confirmSummary) {
    return {
      ok: false,
      path: 'confirmSummary',
      message: VALIDATION_MESSAGES.WARRANTY_CHECK_SUMMARY,
    };
  }

  if (from === 'COMPLETED' && to === 'WARRANTY' && input.warrantyMonths === 0) {
    return {
      ok: false,
      path: 'toStatus',
      message: VALIDATION_MESSAGES.WARRANTY_ZERO_MONTHS_CLOSE,
    };
  }

  if (from === 'COMPLETED' && to === 'CLOSED' && input.warrantyMonths > 0) {
    return {
      ok: false,
      path: 'toStatus',
      message: VALIDATION_MESSAGES.WARRANTY_PENDING_CLOSE(input.warrantyMonths),
    };
  }

  if (from === 'WARRANTY' && to === 'CLOSED' && input.openRepairCount > 0) {
    return {
      ok: false,
      path: 'toStatus',
      message: VALIDATION_MESSAGES.OPEN_REPAIRS_BLOCK_CLOSE(input.openRepairCount),
    };
  }

  if (to === 'CLOSED' && input.draftLogCount > 0) {
    return {
      ok: false,
      path: 'toStatus',
      message: VALIDATION_MESSAGES.DRAFT_LOGS_BLOCK_CLOSE(input.draftLogCount),
    };
  }

  return { ok: true };
};

// 상태별 기본정보 수정 제한 ("상태별 허용 작업" 표의 '기본정보 수정' 행)
export const EDITABLE_ON_WARRANTY = ['managerId', 'memo'] as const;

export const isProjectEditable = (status: ProjectStatus) =>
  status !== 'CLOSED' && status !== 'CANCELLED';

/**
 * @description 이 상태에서 수정할 수 있는 항목: 'all'(전부), 보증 중은 담당자·메모만, 종료·취소는 없음
 * @param status 프로젝트 상태
 * @returns 'all' 또는 수정 가능한 항목 이름 목록
 */
export const allowedProjectFields = (status: ProjectStatus): 'all' | readonly string[] => {
  if (!isProjectEditable(status)) return [];
  if (status === 'WARRANTY') return EDITABLE_ON_WARRANTY;

  return 'all';
};
