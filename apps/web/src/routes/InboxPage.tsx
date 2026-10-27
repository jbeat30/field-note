import type { Memo } from '@field-note/shared';
import { Link, Navigate } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { MemoList } from '../memos/MemoList';
import {
  useCreateMemo,
  useDeleteMemo,
  useMemoList,
  useMemoSummary,
  useUpdateMemo,
} from '../memos/useMemos';
import { useProjectChoices } from '../projects/useProjects';
import { LoadingBlock } from '../components/ui/loading-block';

// 메모함: 프로젝트를 정하지 않고 먼저 적어 둔 메모 보관, 나중에 프로젝트 연결 또는 삭제
export const InboxPage = () => {
  const memos = useMemoList({ scope: 'INBOX' });
  const summary = useMemoSummary();
  const projects = useProjectChoices();
  const create = useCreateMemo();
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];
  const failure = update.error ?? remove.error;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overlap
        eyebrow={
          summary.data && (
            <span>
              정리 안 된 메모 <span className="font-emphasis">{summary.data.inboxCount}</span>개 ·
              끝내지 않은 할 일 <span className="font-emphasis">{summary.data.openTodoCount}</span>
              개
            </span>
          )
        }
        title="메모함"
      />
      <div className="relative -mt-14 grid items-start gap-6 md:-mt-16 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section
          aria-label="메모 목록"
          className="flex min-w-0 flex-col gap-4 rounded-[30px] bg-surface-subtle p-6 md:p-8"
        >
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
              onToggleDone={(memo: Memo, isDone) =>
                update.mutate({ id: memo.id, body: { isDone } })
              }
              onLink={(memo, projectId) => update.mutate({ id: memo.id, body: { projectId } })}
              onEdit={(memo, content, tag) =>
                update.mutate({ id: memo.id, body: { content, tag } })
              }
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
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          <MemoForm
            draftKey={memoDraftKey()}
            submitLabel="메모함에 저장"
            onSubmit={async (value) => void (await create.mutateAsync(value))}
          />
          <section className="flex flex-col gap-3 rounded-[30px] bg-[#14110d] p-7 text-[#fcf9f2]">
            <h2 className="text-xl font-extrabold">정리하는 방법</h2>
            <p className="text-[14.5px] leading-[1.65] font-medium text-[#d9d0bc]">
              프로젝트를 정하지 않고 먼저 적어 두세요. 메모마다 &quot;프로젝트에 연결&quot;을 누르면
              그 프로젝트의 메모 노트로 옮겨지고, 할 일은 체크하면 완료 시각이 기록됩니다.
            </p>
          </section>
          <Link
            className="min-h-touch content-center text-sm text-primary hover:text-sub"
            to="/projects"
          >
            프로젝트 목록으로
          </Link>
        </div>
      </div>
    </div>
  );
};

export const InboxRedirect = () => <Navigate to="/" replace />;
