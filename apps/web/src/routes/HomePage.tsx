import { APP_NAME } from '@field-note/shared';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { queryKeys } from '../query/queryKeys';

export const HomePage = () => {
  const health = useQuery({
    queryKey: queryKeys.health(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/v1/health');

      if (error) {
        throw new Error('[web.HomePage] 서버 상태 확인 실패');
      }

      return data;
    },
  });

  return (
    <section>
      <h1 className="text-2xl font-bold">{APP_NAME}</h1>
      {health.isPending && <p className="mt-2 text-sm">서버 상태 확인 중</p>}
      {health.isError && <p className="mt-2 text-sm text-danger">서버에 연결할 수 없습니다</p>}
      {health.isSuccess && <p className="mt-2 text-sm">서버 연결됨</p>}
    </section>
  );
};
