import {
  fileExtension,
  type CredentialCreate,
  type CredentialUpdate,
  VALIDATION_MESSAGES,
} from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { putWithProgress, DocumentUploadError } from '../documents/uploadDocument';
import { getErrorDetailMessage } from '../lib/apiError';
import { queryKeys } from '../query/queryKeys';
import type { StagedFile } from '../staging/stagedFiles';

export const useCredentials = (employeeId: string) =>
  useQuery({
    queryKey: queryKeys.credentials(employeeId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/employees/{id}/credentials', {
        params: { path: { id: employeeId } },
      });

      if (!data) {
        throw new Error('[web.useCredentials] 서류 조회 실패');
      }

      return data.items;
    },
    // 서버가 파일 검사를 마칠 때까지 "검사 중"으로 보이므로 끝날 때까지 다시 불러옴
    refetchInterval: (query) =>
      query.state.data?.some(
        (item) => item.file && item.file.status !== 'READY' && item.file.status !== 'REJECTED',
      )
        ? 2000
        : false,
  });

// 서류가 바뀌면 투입 경고(필요 자격)도 달라지므로 투입 목록을 함께 다시 불러옴
const useRefreshCredentials = (employeeId: string) => {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.credentials(employeeId) });
    await queryClient.invalidateQueries({ queryKey: ['assignments'] });
  };
};

export const useCreateCredential = (employeeId: string) => {
  const refresh = useRefreshCredentials(employeeId);

  return useMutation({
    meta: { success: '자격을 등록했습니다' },
    mutationFn: async (body: CredentialCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/employees/{id}/credentials', {
        params: { path: { id: employeeId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useCreateCredential] 서류 등록 실패');
      }

      return data;
    },
    onSuccess: refresh,
  });
};

export const useUpdateCredential = (employeeId: string) => {
  const refresh = useRefreshCredentials(employeeId);

  return useMutation({
    meta: { success: '자격을 저장했습니다' },
    mutationFn: async ({
      credentialId,
      body,
    }: {
      credentialId: string;
      body: CredentialUpdate;
    }) => {
      const { data, error } = await apiClient.PATCH(
        '/api/v1/employees/{id}/credentials/{credentialId}',
        { params: { path: { id: employeeId, credentialId } }, body },
      );

      if (!data) {
        throw error ?? new Error('[web.useUpdateCredential] 서류 수정 실패');
      }

      return data;
    },
    onSuccess: refresh,
  });
};

export const useRemoveCredential = (employeeId: string) => {
  const refresh = useRefreshCredentials(employeeId);

  return useMutation({
    meta: { success: '자격을 삭제했습니다' },
    mutationFn: async (credentialId: string) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/employees/{id}/credentials/{credentialId}',
        { params: { path: { id: employeeId, credentialId } } },
      );

      if (!data) {
        throw error ?? new Error('[web.useRemoveCredential] 서류 삭제 실패');
      }

      return data;
    },
    onSuccess: refresh,
  });
};

/**
 * @description 서류 파일 열람 주소 (이 호출이 열람 기록으로 보존)
 * @param employeeId 직원 ID
 * @param credentialId 서류 ID
 * @returns 짧은 만료의 주소
 */
export const fetchCredentialFileUrl = async (employeeId: string, credentialId: string) => {
  const { data, error } = await apiClient.GET(
    '/api/v1/employees/{id}/credentials/{credentialId}/file-url',
    { params: { path: { id: employeeId, credentialId } } },
  );

  if (!data) {
    throw error ?? new Error('[web.fetchCredentialFileUrl] 열람 주소 발급 실패');
  }

  return data;
};

// 직원 서류로 올릴 수 있는 형식 (이미지·PDF)
const EMPLOYEE_DOCUMENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export const EMPLOYEE_DOCUMENT_ACCEPT = Object.keys(EMPLOYEE_DOCUMENT_TYPES)
  .map((extension) => `.${extension}`)
  .join(',');

/**
 * @description 직원 서류 파일 한 개를 올려 임시 보관: 신청 → 저장소 업로드 → 완료 알림, 서류 저장 때 서버가 연결해 확정
 * @param employeeId 직원 ID
 * @param file 사용자가 고른 파일
 * @param onProgress 올리는 진행률 (0~1)
 * @returns 임시 보관된 파일 (업로드 시각은 서버 기준)
 * @throws 허용되지 않은 형식이거나 서버·저장소 오류
 */
export const stageEmployeeDocument = async (
  employeeId: string,
  file: File,
  onProgress: (ratio: number) => void = () => undefined,
): Promise<StagedFile> => {
  const contentType = EMPLOYEE_DOCUMENT_TYPES[fileExtension(file.name)];

  if (!contentType) {
    throw new DocumentUploadError(VALIDATION_MESSAGES.UPLOAD_TYPE_IMAGE_PDF);
  }

  const { data: ticket, error } = await apiClient.POST('/api/v1/employees/{employeeId}/files', {
    params: { path: { employeeId } },
    body: { name: file.name, contentType, size: file.size },
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

export const useRequiredCredentials = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.requiredCredentials(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/required-credentials', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useRequiredCredentials] 필요 자격 조회 실패');
      }

      return data.items;
    },
  });

export const useSaveRequiredCredentials = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { success: '필수 자격을 저장했습니다' },
    mutationFn: async (typeIds: string[]) => {
      const { data, error } = await apiClient.PUT('/api/v1/projects/{id}/required-credentials', {
        params: { path: { id: projectId } },
        body: { typeIds },
      });

      if (!data) {
        throw error ?? new Error('[web.useSaveRequiredCredentials] 필요 자격 저장 실패');
      }

      return data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.requiredCredentials(projectId), data.items);
      // 필요 자격이 바뀌면 투입 경고도 달라짐
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
};
