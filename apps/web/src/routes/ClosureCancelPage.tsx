import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { apiClient } from '../api/client';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { getErrorMessage } from '../lib/apiError';
import { formatClosureDate } from '../lib/formatDate';

const InvalidLink = () => (
  <div className="flex flex-col gap-3">
    <h1 className="text-xl font-bold">링크를 사용할 수 없습니다</h1>
    <p className="text-sm">
      링크가 만료되었거나 이미 사용되었을 수 있습니다. 해지 요청 후 14일이 지나 데이터가 삭제된
      경우에는 복구할 수 없습니다
    </p>
    <Link className="min-h-touch content-center text-primary underline" to="/login">
      로그인 화면으로
    </Link>
  </div>
);

// 메일의 링크로 들어오는 해지 취소 화면 (로그인 없이 사용, 링크는 한 번만)
export const ClosureCancelPage = () => {
  const { token = '' } = useParams();
  const [isDone, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const link = useQuery({
    queryKey: ['closure-link', 'detail', { token }],
    queryFn: async () => {
      const { data, response } = await apiClient.GET('/api/v1/auth/closure/{token}', {
        params: { path: { token } },
      });

      // 사용·만료·없는 링크는 서버가 구분하지 않으므로 화면도 같은 안내
      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('[web.ClosureCancelPage] 링크 확인 실패');
      }

      return data;
    },
    retry: false,
  });

  if (isDone) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">해지를 취소했습니다</h1>
        <Alert variant="info">계정이 복구되었습니다. 다시 로그인할 수 있습니다</Alert>
        <Link className="min-h-touch content-center text-primary underline" to="/login">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  if (link.isPending) {
    return <p className="text-sm">링크 확인 중</p>;
  }

  if (link.isError) {
    return <Alert>서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요</Alert>;
  }

  if (!link.data) {
    return <InvalidLink />;
  }

  const onCancel = async () => {
    setSubmitting(true);
    setMessage('');

    const { data, error, response } = await apiClient.POST('/api/v1/auth/closure/cancel', {
      body: { token },
    });

    setSubmitting(false);

    if (!data) {
      setMessage(
        response.status === 404
          ? '링크가 만료되었거나 이미 사용되었습니다'
          : getErrorMessage(error),
      );
      return;
    }

    setDone(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">해지를 취소할까요</h1>
      <p className="text-sm">
        {formatClosureDate(link.data.purgeAfter)} 이후 회사의 모든 데이터가 삭제될 예정입니다.
        취소하면 계정이 바로 복구되고 다시 로그인할 수 있습니다
      </p>
      {message && <Alert>{message}</Alert>}
      <Button onClick={onCancel} disabled={isSubmitting}>
        {isSubmitting ? '취소 중' : '해지 취소'}
      </Button>
    </div>
  );
};
