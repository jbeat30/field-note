import { Link } from 'react-router';

import { useMe } from '../auth/useMe';
import { useMemoSummary } from '../memos/useMemos';

// 로그인 후 첫 화면: 정리 안 된 메모함과 끝내지 않은 할 일을 알려 준다 (대시보드의 나머지는 이후 단계)
export const HomePage = () => {
  const me = useMe();
  const summary = useMemoSummary();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{me.data?.companyName ?? '홈'}</h1>
        <p className="mt-2 text-sm">{me.data?.displayName}님, 안녕하세요</p>
      </div>
      <Link
        to="/inbox"
        className="flex min-h-touch flex-col gap-1 rounded-md border border-border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="text-lg font-bold">메모함</span>
        {summary.data ? (
          <span className="text-sm" aria-live="polite">
            정리 안 된 메모 {summary.data.inboxCount}건 · 끝내지 않은 할 일{' '}
            {summary.data.openTodoCount}건
          </span>
        ) : (
          <span className="text-sm text-foreground/70">불러오는 중</span>
        )}
      </Link>
    </section>
  );
};
