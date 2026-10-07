import { PROJECT_STATUS_LABELS, type ProjectStatus } from './projects';

// 프로젝트 상태 전환 규칙 (서비스 기획서 §10.3). 서버와 목업 서버가 같은 규칙을 쓴다
// 완료 → 보증 중 → 종료와 종료 재오픈은 보증 기능(4단계)과 함께 만든다. 그래서 지금은 완료에서 더 바꿀 수 없다
// 진행 → 완료의 "임시 저장 일지 확인·진행률 100% 안내·남은 자재 확인"은 일지·자재가 생긴 뒤 이 검사에 더한다
export const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUSPENDED', 'COMPLETED', 'CANCELLED'],
  SUSPENDED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  WARRANTY: [],
  CLOSED: [],
  CANCELLED: [],
};

// 사유가 반드시 필요한 전환 (기록의 신뢰성: 왜 멈췄고 왜 취소했는지)
export const PROJECT_REASON_REQUIRED: readonly ProjectStatus[] = ['SUSPENDED', 'CANCELLED'];
export const PROJECT_REASON_MAX_LENGTH = 500;

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
};

export type TransitionCheck =
  { ok: true } | { ok: false; path: 'toStatus' | 'effectiveOn' | 'reason'; message: string };

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
      message: `'${PROJECT_STATUS_LABELS[from]}' 상태에서는 '${PROJECT_STATUS_LABELS[to]}'(으)로 바꿀 수 없습니다`,
    };
  }

  if (effectiveOn > today) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: `${label}은 오늘 이후 날짜로 입력할 수 없습니다`,
    };
  }

  if (lastEffectiveOn && effectiveOn < lastEffectiveOn) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: `${label}은 이전 상태 변경일(${lastEffectiveOn})보다 빠를 수 없습니다`,
    };
  }

  if (to === 'COMPLETED' && actualStart && effectiveOn < actualStart) {
    return {
      ok: false,
      path: 'effectiveOn',
      message: '실제 완료일은 실제 시작일보다 빠를 수 없습니다',
    };
  }

  const trimmed = reason?.trim() ?? '';

  if (PROJECT_REASON_REQUIRED.includes(to) && trimmed.length === 0) {
    return { ok: false, path: 'reason', message: '사유를 입력해 주세요' };
  }

  if (trimmed.length > PROJECT_REASON_MAX_LENGTH) {
    return {
      ok: false,
      path: 'reason',
      message: `사유는 ${PROJECT_REASON_MAX_LENGTH}자까지 입력할 수 있습니다`,
    };
  }

  return { ok: true };
};

// 상태별 기본정보 수정 제한 (§10.3 "상태별 허용 작업" 표의 '기본정보 수정' 행)
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
