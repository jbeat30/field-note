import type { UploadMeta, UploadQueue } from './uploadQueue';
import { compressImage, ImageConvertError } from './imageResize';

import { VALIDATION_MESSAGES } from '@field-note/shared';
export type EnqueueSettings = Pick<UploadMeta, 'category' | 'area' | 'description' | 'workDate'>;

export type EnqueueFailure = { name: string; message: string };

/**
 * @description 고른 사진을 JPEG로 압축해 업로드 대기열에 추가, 사진마다 촬영일시는 파일의 마지막 수정 시각(카메라로 찍은 파일은 촬영 시각) 사용
 * 압축에 실패한 사진(브라우저가 열 수 없는 형식 등)은 건너뛰고 사유를 모아 반환
 * @param queue 업로드 대기열
 * @param projectId 프로젝트 ID
 * @param files 사용자가 고른 사진
 * @param settings 이번에 고른 사진 전체에 붙일 구분·구역·설명
 * @returns 대기열에 넣지 못한 사진과 사유
 */
export const enqueueFiles = async (
  queue: UploadQueue,
  projectId: string,
  files: readonly File[],
  settings: EnqueueSettings,
): Promise<EnqueueFailure[]> => {
  const failures: EnqueueFailure[] = [];

  for (const file of files) {
    try {
      const { blob } = await compressImage(file);
      // 이름은 확장자를 .jpg로 맞춤 (서버가 내용과 확장자를 함께 검사)
      const name = `${file.name.replace(/\.[^.]*$/, '') || 'photo'}.jpg`;

      await queue.enqueue(projectId, blob, name, {
        ...settings,
        takenAt: file.lastModified > 0 ? new Date(file.lastModified).toISOString() : undefined,
      });
    } catch (error) {
      failures.push({
        name: file.name,
        message:
          error instanceof ImageConvertError
            ? VALIDATION_MESSAGES.PHOTO_FORMAT_UNSUPPORTED
            : VALIDATION_MESSAGES.PHOTO_PREPARE_FAILED,
      });
    }
  }

  return failures;
};
