import type {
  ProjectWarranty,
  WarrantyCertificateCreate,
  WarrantyCertificateUpdate,
  WarrantyUpdate,
} from '@field-note/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const useWarranty = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.warranty(projectId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/projects/{id}/warranty', {
        params: { path: { id: projectId } },
      });

      if (!data) {
        throw new Error('[web.useWarranty] 보증 조회 실패');
      }

      return data;
    },
  });

// 저장·등록·삭제는 모두 변경된 보증 전체를 반환하므로 그 값을 바로 캐시에 반영
const useApplyWarranty = (projectId: string) => {
  const queryClient = useQueryClient();

  return (data: ProjectWarranty) => queryClient.setQueryData(queryKeys.warranty(projectId), data);
};

export const useSaveWarranty = (projectId: string) => {
  const apply = useApplyWarranty(projectId);

  return useMutation({
    mutationFn: async (body: WarrantyUpdate) => {
      const { data, error } = await apiClient.PUT('/api/v1/projects/{id}/warranty', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useSaveWarranty] 보증 저장 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};

export const useAddCertificate = (projectId: string) => {
  const apply = useApplyWarranty(projectId);

  return useMutation({
    mutationFn: async (body: WarrantyCertificateCreate) => {
      const { data, error } = await apiClient.POST('/api/v1/projects/{id}/warranty/certificates', {
        params: { path: { id: projectId } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useAddCertificate] 보증서 등록 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};

export const useUpdateCertificate = (projectId: string) => {
  const apply = useApplyWarranty(projectId);

  return useMutation({
    mutationFn: async ({
      certificateId,
      body,
    }: {
      certificateId: string;
      body: WarrantyCertificateUpdate;
    }) => {
      const { data, error } = await apiClient.PATCH(
        '/api/v1/projects/{id}/warranty/certificates/{certificateId}',
        { params: { path: { id: projectId, certificateId } }, body },
      );

      if (!data) {
        throw error ?? new Error('[web.useUpdateCertificate] 보증서 수정 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};

export const useRemoveCertificate = (projectId: string) => {
  const apply = useApplyWarranty(projectId);

  return useMutation({
    mutationFn: async (certificateId: string) => {
      const { data, error } = await apiClient.DELETE(
        '/api/v1/projects/{id}/warranty/certificates/{certificateId}',
        { params: { path: { id: projectId, certificateId } } },
      );

      if (!data) {
        throw error ?? new Error('[web.useRemoveCertificate] 보증서 삭제 실패');
      }

      return data;
    },
    onSuccess: apply,
  });
};
