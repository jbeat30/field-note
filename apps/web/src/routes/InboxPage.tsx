import type { Memo } from '@field-note/shared';
import { Link, Navigate } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { MemoList } from '../memos/MemoList';
import { useCreateMemo, useDeleteMemo, useMemoList, useUpdateMemo } from '../memos/useMemos';
import { useProjectChoices } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

// 메모함: 프로젝트를 정하지 않고 먼저 적어 둔 메모 보관, 나중에 프로젝트 연결 또는 삭제
export const InboxPage = () => {
  const memos = useMemoList({ scope: 'INBOX' });
  const projects = useProjectChoices();
  const create = useCreateMemo();
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];
  const failure = update.error ?? remove.error;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="메모함" description="프로젝트에 연결하지 않은 메모를 모아 둡니다" />
      <p className="text-sm text-sub">
        프로젝트를 정하지 않고 먼저 적어 두세요. 나중에 프로젝트에 연결해 정리합니다
      </p>
      <MemoForm
        draftKey={memoDraftKey()}
        submitLabel="메모함에 저장"
        onSubmit={async (value) => void (await create.mutateAsync(value))}
      />
      {failure && <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>}
      {memos.isPending && <LoadingBlock label="메모를 불러오는 중" />}
      {memos.isError && <Alert>메모를 불러오지 못했습니다</Alert>}
      {memos.isSuccess && items.length === 0 && (
        <p className="text-sm text-sub">정리할 메모가 없습니다</p>
      )}
      {items.length > 0 && (
        <MemoList
          memos={items}
          projects={(projects.data ?? []).map((project) => ({
            id: project.id,
            name: project.name,
          }))}
          onToggleDone={(memo: Memo, isDone) => update.mutate({ id: memo.id, body: { isDone } })}
          onLink={(memo, projectId) => update.mutate({ id: memo.id, body: { projectId } })}
          onEdit={(memo, content, tag) => update.mutate({ id: memo.id, body: { content, tag } })}
          onDelete={(memo) => remove.mutate(memo.id)}
        />
      )}
      {memos.hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          disabled={memos.isFetchingNextPage}
          onClick={() => void memos.fetchNextPage()}
        >
          {memos.isFetchingNextPage ? '불러오는 중' : '더 보기'}
        </Button>
      )}
      <Link
        className="min-h-touch content-center text-sm text-primary hover:text-sub"
        to="/projects"
      >
        프로젝트 목록으로
      </Link>
    </div>
  );
};

export const InboxRedirect = () => <Navigate to="/" replace />;
