import { apiClient } from '../api/client';
import { getErrorDetailMessage } from '../lib/apiError';

import { documentContentType } from './documentFile';

export class DocumentUploadError extends Error {}

// 저장소로 직접 올림. 진행률을 알리기 위해 fetch 대신 XMLHttpRequest 사용
const putWithProgress = (
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (ratio: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', url);

    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new DocumentUploadError('저장소에 올리지 못했습니다. 다시 시도해 주세요'));
    request.onerror = () =>
      reject(new DocumentUploadError('연결이 끊겼습니다. 연결을 확인하고 다시 시도해 주세요'));
    request.send(file);
  });

/**
 * @description 문서 파일 한 개를 올림: 신청 → 저장소 업로드 → 완료 알림. 올라간 파일의 ID를 돌려주며 문서 등록은 호출한 쪽이 한다
 * 문서는 사진보다 적고 한 번에 한 개라 대기열 없이 진행률을 보여 주고, 실패하면 사유와 함께 다시 시도하게 한다
 * @param projectId 프로젝트 ID
 * @param file 사용자가 고른 파일
 * @param onProgress 올리는 진행률 (0~1)
 * @returns 업로드한 파일 ID
 * @throws 허용되지 않은 형식이거나 서버·저장소 오류
 */
export const uploadDocumentFile = async (
  projectId: string,
  file: File,
  onProgress: (ratio: number) => void = () => undefined,
): Promise<string> => {
  const contentType = documentContentType(file.name);

  if (!contentType) {
    throw new DocumentUploadError(
      '올릴 수 없는 파일 형식입니다 (이미지, PDF, Word·Excel·PowerPoint만 가능)',
    );
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

  return ticket.file.id;
};
