import { getErrorDetailMessage } from '../lib/apiError';

import { StepError, type UploadApi, type UploadTicket } from './uploadQueue';
import { apiClient } from '../api/client';

/**
 * @description HTTP 상태를 대기열의 오류 종류로 구분: 서버·연결 문제는 다시 시도하고, 요청 자체가 잘못됐거나 권한이 없으면 멈춘다
 * @param status HTTP 상태
 * @returns 오류 종류
 */
export const classifyStatus = (status: number): 'TRANSIENT' | 'PERMANENT' => {
  // 요청 시간 초과(408)·너무 많은 요청(429)·서버 오류(5xx)는 잠시 뒤 다시 시도
  if (status === 408 || status === 429 || status >= 500) return 'TRANSIENT';

  return 'PERMANENT';
};

// 연결이 끊겨 fetch 자체가 실패한 경우
const networkError = () =>
  new StepError('TRANSIENT', '연결이 끊겼습니다. 연결되면 이어서 올립니다');

const callApi = async <T>(
  run: () => Promise<{ data?: T; error?: unknown; response: Response }>,
) => {
  let result: { data?: T; error?: unknown; response: Response };

  try {
    result = await run();
  } catch {
    throw networkError();
  }

  if (result.data === undefined) {
    const { status } = result.response;

    throw new StepError(
      classifyStatus(status),
      status === 401
        ? '로그인이 필요합니다. 다시 로그인해 주세요'
        : getErrorDetailMessage(result.error),
    );
  }

  return result.data;
};

/**
 * @description 업로드 대기열이 쓰는 실제 서버 호출 (파일 신청·저장소 업로드·완료 알림·사진 등록)
 */
export const createUploadApi = (): UploadApi => ({
  requestUpload: async (projectId, file) => {
    const ticket = await callApi(() =>
      apiClient.POST('/api/v1/projects/{projectId}/files', {
        params: { path: { projectId } },
        body: { name: file.name, purpose: 'PHOTO', contentType: 'image/jpeg', size: file.size },
      }),
    );

    return {
      fileId: ticket.file.id,
      ticket: {
        url: ticket.upload.url,
        headers: ticket.upload.headers,
        expiresAt: ticket.upload.expiresAt,
      },
    };
  },

  put: async (ticket: UploadTicket, blob) => {
    let response: Response;

    try {
      response = await fetch(ticket.url, { method: 'PUT', headers: ticket.headers, body: blob });
    } catch {
      throw networkError();
    }

    if (response.ok) return;

    // 서명이 맞지 않거나 주소가 만료되면 403: 새 주소를 받아 처음부터
    if (response.status === 403) {
      throw new StepError('RESTART', '업로드 주소가 유효하지 않습니다');
    }

    throw new StepError(classifyStatus(response.status), '저장소에 올리지 못했습니다');
  },

  complete: async (fileId) => {
    try {
      await callApi(() =>
        apiClient.POST('/api/v1/files/{id}/complete', { params: { path: { id: fileId } } }),
      );
    } catch (error) {
      // 저장소에 파일이 아직 없다는 응답(400)이면 올리기부터 다시
      if (error instanceof StepError && error.kind === 'PERMANENT') {
        throw new StepError('RESTART', error.message);
      }

      throw error;
    }
  },

  register: async (projectId, fileId, meta) => {
    await callApi(() =>
      apiClient.POST('/api/v1/projects/{projectId}/photos', {
        params: { path: { projectId } },
        body: { fileId, ...meta },
      }),
    );
  },
});
