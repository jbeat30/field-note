import { z } from 'zod';

// 프로젝트 경고 종류 (서비스 기획서 §10.4). 목록·현황·홈 알림이 함께 쓰므로 가벼운 별도 모듈에 둔다
export const PROJECT_WARNING_TYPES = [
  'BURN_WARN',
  'BURN_LIMIT',
  'BURN_AHEAD',
  'OVERDUE',
  'BEHIND_SCHEDULE',
] as const;

export const projectWarningTypeSchema = z.enum(PROJECT_WARNING_TYPES);

export type ProjectWarningType = z.infer<typeof projectWarningTypeSchema>;

export const PROJECT_WARNING_LABELS: Record<ProjectWarningType, string> = {
  BURN_WARN: '공수 소진율 경고 기준 도달',
  BURN_LIMIT: '공수 소진율 한도 도달',
  BURN_AHEAD: '진행률보다 공수가 빨리 소진되는 중',
  OVERDUE: '종료 예정일이 지났는데 끝나지 않음',
  BEHIND_SCHEDULE: '진행률이 일정보다 뒤처짐',
};
