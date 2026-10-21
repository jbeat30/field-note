import { isStagedExpired } from '@field-note/shared';

// 폼에서 올려 둔 임시 파일 (폼 저장 전까지 서버에 임시 보관, 이 기기가 어떤 파일을 올렸는지 기억해 이어서 쓸 수 있게 함)
export type StagedFile = {
  fileId: string;
  name: string;
  size: number;
  // 업로드 신청 시각(서버 기준), 보관 만료 판단의 기준
  uploadedAt: string;
};

/**
 * @description 임시 보관 시간이 지난 파일의 ID (서버가 저장 때 최종 판정하고, 이 값은 저장 전 안내용)
 * @param files 임시 파일 목록
 * @param now 현재 시각
 * @returns 만료된 파일 ID 목록
 */
export const expiredFileIds = (files: readonly StagedFile[], now: Date) =>
  files.filter((file) => isStagedExpired(file.uploadedAt, now)).map((file) => file.fileId);

export const serializeStaged = (files: readonly StagedFile[]) => JSON.stringify(files);

const isStagedFile = (value: unknown): value is StagedFile => {
  if (!value || typeof value !== 'object') return false;

  const file = value as Record<string, unknown>;

  return (
    typeof file.fileId === 'string' &&
    typeof file.name === 'string' &&
    typeof file.size === 'number' &&
    typeof file.uploadedAt === 'string' &&
    !Number.isNaN(new Date(file.uploadedAt).getTime())
  );
};

/**
 * @description 저장해 둔 임시 파일 목록을 읽음, 깨졌거나 형식이 다르면 빈 목록 (초안 때문에 화면이 멈추지 않게)
 * @param raw 저장된 글자
 * @returns 임시 파일 목록
 */
export const parseStaged = (raw: string | undefined): StagedFile[] => {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isStagedFile) : [];
  } catch {
    return [];
  }
};

// 임시 파일 초안의 저장 키 접두사 (작업 내역·자재 초안과 구분)
export const STAGED_DRAFT_PREFIX = 'staged:';

export const stagedDraftKey = (scope: string) => `${STAGED_DRAFT_PREFIX}${scope}`;

/**
 * @description 보관 시간이 모두 지난 임시 파일 초안을 걷어냄 (기기에 영원히 남지 않게)
 * @param drafts 저장된 초안 전체
 * @param now 현재 시각
 * @returns 정리한 새 객체 (지울 것이 없으면 같은 객체)
 */
export const pruneStagedDrafts = (drafts: Record<string, string>, now: Date) => {
  const kept = Object.entries(drafts).filter(([key, raw]) => {
    if (!key.startsWith(STAGED_DRAFT_PREFIX)) return true;

    const files = parseStaged(raw);

    return files.some((file) => !isStagedExpired(file.uploadedAt, now));
  });

  return kept.length === Object.keys(drafts).length ? drafts : Object.fromEntries(kept);
};
