import { z } from 'zod';

import { VALIDATION_MESSAGES } from './errorMessages';
// 회사 데이터 관리: 저장 용량 현황과 해지 전 전체 데이터 내보내기

export const storageUsageSchema = z.object({
  // 회사별 저장 용량 한도와 사용량 (바이트)
  quotaBytes: z.number().int(),
  usedBytes: z.number().int(),
  // 사용량 중 아직 폼에 연결되지 않은 임시 보관 파일 (저장하거나 지우면 줄어듦)
  stagedBytes: z.number().int(),
  stagedCount: z.number().int(),
  // 용도별 사용량 (사진·문서·직원 서류)
  byPurpose: z.array(
    z.object({
      purpose: z.enum(['PHOTO', 'DOCUMENT', 'EMPLOYEE_DOCUMENT']),
      bytes: z.number().int(),
      count: z.number().int(),
    }),
  ),
  // 프로젝트별 사용량 (큰 순, 프로젝트에 속하지 않는 직원 서류는 projectId null)
  byProject: z.array(
    z.object({
      projectId: z.uuid().nullable(),
      name: z.string(),
      bytes: z.number().int(),
      count: z.number().int(),
    }),
  ),
});

export type StorageUsage = z.infer<typeof storageUsageSchema>;

// 전체 데이터 내보내기는 본인 확인을 위해 비밀번호 재입력 필요
export const companyExportRequestSchema = z.object({
  currentPassword: z.string().min(1, VALIDATION_MESSAGES.required('비밀번호')).max(200),
});

export type CompanyExportRequest = z.infer<typeof companyExportRequestSchema>;

export const STORAGE_WARN_PERCENT = 80;

export type StorageLevel = 'OK' | 'WARN' | 'FULL';

/**
 * @description 저장 용량 사용 수준 판정 (서버·목업·화면 공용)
 * @param usedBytes 사용량
 * @param quotaBytes 한도
 * @returns 한도의 80% 미만 OK, 80% 이상 WARN, 한도 이상 FULL
 */
export const storageLevel = (usedBytes: number, quotaBytes: number): StorageLevel => {
  if (quotaBytes <= 0) return 'FULL';

  const percent = (usedBytes / quotaBytes) * 100;

  return percent >= 100 ? 'FULL' : percent >= STORAGE_WARN_PERCENT ? 'WARN' : 'OK';
};

/**
 * @description 바이트를 사람이 읽는 단위로 표시 (소수 첫째 자리)
 * @param bytes 바이트
 * @returns 예: 1.5 GB
 */
export const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${index === 0 ? value : Math.round(value * 10) / 10} ${units[index]}`;
};
