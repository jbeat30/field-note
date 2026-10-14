import { MEMO_TAGS, MEMO_TAG_LABELS, type MemoTag } from '@field-note/shared';
import { useState } from 'react';
import { useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { MemoList } from '../memos/MemoList';
import { useCreateMemo, useDeleteMemo, useMemoList, useUpdateMemo } from '../memos/useMemos';
import { useProject } from '../projects/useProjects';

export const ProjectMemosPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [tag, setTag] = useState<MemoTag | ''>('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const memos = useMemoList(
    { scope: 'PROJECT', projectId: id },
    onlyOpen ? { tag: 'TODO', isDone: false } : { tag: tag || undefined },
  );
  const create = useCreateMemo();
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];

  if (project.isPending) return <p className="text-sm">프로젝트를 불러오는 중</p>;
  if (!project.data) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        level={2}
        title="메모 노트"
        description="이 프로젝트의 메모를 날짜순으로 봅니다"
      />

      {/* xl+: 왼쪽 입력 / 오른쪽 목록 */}
      <div className="grid items-start gap-5 xl:grid-cols-[360px_1fr]">
        {/* 왼쪽: 메모 입력 폼 */}
        <div className="rounded-xl bg-surface-subtle p-4">
          <MemoForm
            draftKey={memoDraftKey(id)}
            onSubmit={async (value) => void (await create.mutateAsync({ ...value, projectId: id }))}
          />
        </div>

        {/* 오른쪽: 필터 + 목록 */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-40"
              aria-label="태그로 거르기"
              value={onlyOpen ? 'TODO' : tag}
              disabled={onlyOpen}
              emptyLabel="모든 태그"
              onValueChange={setTag}
              options={MEMO_TAGS.map((value) => ({ value: value, label: MEMO_TAG_LABELS[value] }))}
            />
            <label className="flex min-h-touch items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={onlyOpen}
                onChange={(event) => setOnlyOpen(event.target.checked)}
              />
              끝내지 않은 할 일만
            </label>
          </div>
          {(update.error ?? remove.error) && (
            <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>
          )}
          {memos.isPending && <p className="text-sm">메모를 불러오는 중</p>}
          {memos.isError && <Alert>메모를 불러오지 못했습니다</Alert>}
          {memos.isSuccess && items.length === 0 && (
            <p className="text-sm text-foreground/70">
              {onlyOpen
                ? '끝내지 않은 할 일이 없습니다'
                : '아직 메모가 없습니다. 왼쪽에서 한 줄 적어 보세요'}
            </p>
          )}
          {items.length > 0 && (
            <MemoList
              memos={items}
              onToggleDone={(memo, isDone) => update.mutate({ id: memo.id, body: { isDone } })}
              onEdit={(memo, content, nextTag) =>
                update.mutate({ id: memo.id, body: { content, tag: nextTag } })
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
        </div>
      </div>
    </div>
  );
};
