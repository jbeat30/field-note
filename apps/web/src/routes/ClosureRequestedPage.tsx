import { useLocation, Link } from 'react-router';

import { formatClosureDate } from '../lib/formatDate';

// 해지를 요청한 직후의 안내 화면 (이미 로그아웃된 상태)
export const ClosureRequestedPage = () => {
  const { state } = useLocation() as { state: { purgeAfter?: string } | null };
  const purgeAfter = state?.purgeAfter;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">해지를 요청했습니다</h1>
      <p className="text-sm">
        모든 기기에서 로그아웃되었습니다.
        {purgeAfter
          ? ` ${formatClosureDate(purgeAfter)} 이후 회사의 모든 데이터가 삭제됩니다.`
          : ''}{' '}
        그 전에는 메일로 받은 해지 취소 링크로 계정을 복구할 수 있습니다
      </p>
      <Link className="min-h-touch content-center text-primary underline" to="/login">
        로그인 화면으로
      </Link>
    </div>
  );
};
