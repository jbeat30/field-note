import { MEMO_TAGS, MEMO_TAG_LABELS, type MemoTag } from '@field-note/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { MemoForm } from '../memos/MemoForm';
import { memoDraftKey } from '../memos/memoDraft';
import { MemoList } from '../memos/MemoList';
import { useCreateMemo, useDeleteMemo, useMemoList, useUpdateMemo } from '../memos/useMemos';
import { useProject } from '../projects/useProjects';

// 프로젝트 메모 노트: 통화·지시·이슈·할 일을 날짜별로 쌓는 자유 메모장 (서비스 기획서 §10.9)
export const ProjectMemosPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [tag, setTag] = useState<MemoTag | ''>('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const memos = useMemoList(
    { scope: 'PROJECT', projectId: id },
    // 끝내지 않은 할 일만 볼 때는 할 일 태그로 고정
    onlyOpen ? { tag: 'TODO', isDone: false } : { tag: tag || undefined },
  );
  const create = useCreateMemo();
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];

  if (project.isPending) {
    return <p className="text-sm">프로젝트를 불러오는 중</p>;
  }

  if (!project.data) {
    return <Alert>프로젝트를 불러오지 못했습니다</Alert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        className="min-h-touch content-center text-sm text-primary underline"
        to={`/projects/${id}`}
      >
        ← {project.data.name}
      </Link>
      <h1 className="text-2xl font-bold">메모 노트</h1>
      <MemoForm
        draftKey={memoDraftKey(id)}
        onSubmit={async (value) => void (await create.mutateAsync({ ...value, projectId: id }))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-auto"
          aria-label="태그로 거르기"
          value={onlyOpen ? 'TODO' : tag}
          disabled={onlyOpen}
          onChange={(event) => setTag(event.target.value as MemoTag | '')}
        >
          <option value="">모든 태그</option>
          {MEMO_TAGS.map((value) => (
            <option key={value} value={value}>
              {MEMO_TAG_LABELS[value]}
            </option>
          ))}
        </Select>
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
            : '아직 메모가 없습니다. 위에서 한 줄 적어 보세요'}
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
  );
};
