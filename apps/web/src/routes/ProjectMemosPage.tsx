import { MEMO_TAGS, MEMO_TAG_LABELS, type MemoTag } from '@field-note/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { PageHeader } from '../components/ui/page-header';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { seoulToday } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';
import { MemoList } from '../memos/MemoList';
import { useDeleteMemo, useMemoList, useUpdateMemo } from '../memos/useMemos';
import { useProject } from '../projects/useProjects';

// 칩 필터: 모든 메모 / 태그 하나 / 끝내지 않은 할 일
type Filter = 'ALL' | MemoTag | 'OPEN_TODO';

const filterQuery = (filter: Filter) => {
  if (filter === 'ALL') return {};
  if (filter === 'OPEN_TODO') return { tag: 'TODO' as const, isDone: false };

  return { tag: filter };
};

// 프로젝트 메모 노트: 하루 기록에서 쓴 메모를 날짜별로 모아서 조회, 할 일 체크·수정·삭제도 여기서 가능
export const ProjectMemosPage = () => {
  const { id = '' } = useParams();
  const project = useProject(id);
  const [filter, setFilter] = useState<Filter>('ALL');
  const memos = useMemoList({ scope: 'PROJECT', projectId: id }, filterQuery(filter));
  const update = useUpdateMemo();
  const remove = useDeleteMemo();
  const items = memos.data?.pages.flatMap((page) => page.items) ?? [];

  if (project.isPending) return <p className="text-sm">프로젝트를 불러오는 중</p>;
  if (!project.data) return <Alert>프로젝트를 불러오지 못했습니다</Alert>;

  const filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: '모든 메모' },
    ...MEMO_TAGS.map((tag) => ({ value: tag, label: MEMO_TAG_LABELS[tag] })),
    { value: 'OPEN_TODO', label: '끝내지 않은 할 일' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        level={2}
        title="메모 노트"
        description="하루 기록에서 쓴 메모를 날짜별로 모아 봅니다. 메모는 하루 기록의 메모 단계에서 씁니다"
      />
      <div role="group" aria-label="메모 거르기" className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Chip
            key={item.value}
            selected={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      {(update.error ?? remove.error) && (
        <Alert>처리하지 못했습니다. 잠시 후 다시 시도해 주세요</Alert>
      )}
      {memos.isPending && <p className="text-sm">메모를 불러오는 중</p>}
      {memos.isError && <Alert>메모를 불러오지 못했습니다</Alert>}
      {memos.isSuccess && items.length === 0 && (
        <EmptyState
          title={
            filter === 'OPEN_TODO'
              ? '끝내지 않은 할 일이 없습니다'
              : filter === 'ALL'
                ? '아직 메모가 없습니다'
                : '이 태그의 메모가 없습니다'
          }
          description={
            filter === 'ALL' ? '하루 기록의 메모 단계에서 쓴 메모가 여기에 모입니다' : undefined
          }
          action={
            filter === 'ALL' && (
              <Link
                to={projectWorkPath(id, seoulToday())}
                className="text-sm font-semibold text-primary hover:text-sub"
              >
                오늘 하루 기록으로
              </Link>
            )
          }
        />
      )}
      {items.length > 0 && (
        <MemoList
          memos={items}
          projectId={id}
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
          className="self-center"
          disabled={memos.isFetchingNextPage}
          onClick={() => void memos.fetchNextPage()}
        >
          {memos.isFetchingNextPage ? '불러오는 중' : '더 보기'}
        </Button>
      )}
    </div>
  );
};
