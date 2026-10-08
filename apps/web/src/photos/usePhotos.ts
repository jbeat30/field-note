import type { PhotoCategory, PhotoUpdate } from '@field-note/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export type PhotoFilter = { category?: PhotoCategory; area?: string };

const PAGE_SIZE = 30;

// 사진첩: 촬영일시 최근순으로 한 페이지씩 이어서 읽음 (사진이 많아도 처음 화면이 가벼움)
export const usePhotoList = (projectId: string, filter: PhotoFilter = {}, limit = PAGE_SIZE) =>
  useInfiniteQuery({
    queryKey: queryKeys.photos(projectId, { ...filter, limit }),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/projects/{projectId}/photos', {
        params: { path: { projectId }, query: { ...filter, limit, cursor: pageParam } },
      });

      if (!data) {
        throw new Error('[web.usePhotoList] 사진 목록 조회 실패');
      }

      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(projectId),
  });

// 원본 사진 주소는 열 때마다 새로 받음 (짧은 만료)
export const fetchPhotoOriginalUrl = async (fileId: string) => {
  const { data } = await apiClient.GET('/api/v1/files/{id}/url', {
    params: { path: { id: fileId }, query: { variant: 'original' } },
  });

  if (!data) {
    throw new Error('[web.fetchPhotoOriginalUrl] 원본 주소 발급 실패');
  }

  return data.url;
};

export const useUpdatePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PhotoUpdate }) => {
      const { data, error } = await apiClient.PATCH('/api/v1/photos/{id}', {
        params: { path: { id } },
        body,
      });

      if (!data) {
        throw error ?? new Error('[web.useUpdatePhoto] 사진 수정 실패');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos'] }),
  });
};

export const useDeletePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE('/api/v1/photos/{id}', {
        params: { path: { id } },
      });

      if (!data) {
        throw error ?? new Error('[web.useDeletePhoto] 사진 삭제 실패');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos'] }),
  });
};
