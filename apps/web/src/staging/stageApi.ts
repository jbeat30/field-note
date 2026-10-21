import { apiClient } from '../api/client';
import { documentContentType } from '../documents/documentFile';
import { DocumentUploadError, putWithProgress } from '../documents/uploadDocument';
import { getErrorDetailMessage } from '../lib/apiError';

import { VALIDATION_MESSAGES } from '@field-note/shared';

import type { StagedFile } from './stagedFiles';

/**
 * @description 프로젝트 문서 파일을 올려 임시 보관: 신청 → 저장소 업로드 → 완료 알림, 폼 저장 때 서버가 연결해 확정
 * @param projectId 프로젝트 ID
 * @param file 사용자가 고른 파일
 * @param onProgress 올리는 진행률 (0~1)
 * @returns 임시 보관된 파일 (업로드 시각은 서버 기준)
 * @throws 허용되지 않은 형식이거나 서버·저장소 오류
 */
export const stageDocumentFile = async (
  projectId: string,
  file: File,
  onProgress: (ratio: number) => void = () => undefined,
): Promise<StagedFile> => {
  const contentType = documentContentType(file.name);

  if (!contentType) {
    throw new DocumentUploadError(VALIDATION_MESSAGES.UPLOAD_TYPE_DOCUMENT);
  }

  const { data: ticket, error } = await apiClient.POST('/api/v1/projects/{projectId}/files', {
    params: { path: { projectId } },
    body: { name: file.name, purpose: 'DOCUMENT', contentType, size: file.size },
  });

  if (!ticket) {
    throw new DocumentUploadError(getErrorDetailMessage(error));
  }

  await putWithProgress(ticket.upload.url, ticket.upload.headers, file, onProgress);

  const done = await apiClient.POST('/api/v1/files/{id}/complete', {
    params: { path: { id: ticket.file.id } },
  });

  if (!done.data) {
    throw new DocumentUploadError(getErrorDetailMessage(done.error));
  }

  return {
    fileId: ticket.file.id,
    name: file.name,
    size: file.size,
    uploadedAt: ticket.file.createdAt,
  };
};

/**
 * @description 임시 파일을 서버에서 바로 지움 (폼 취소·파일 교체), 실패해도 24시간 만료가 정리하므로 조용히 넘어감
 * @param fileId 파일 ID
 * @returns 지웠는지 여부
 */
export const discardStagedFile = async (fileId: string) => {
  try {
    const { data } = await apiClient.DELETE('/api/v1/files/{id}', {
      params: { path: { id: fileId } },
      keepalive: true,
    });

    return Boolean(data);
  } catch {
    return false;
  }
};
