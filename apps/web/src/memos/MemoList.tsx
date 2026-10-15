import { MEMO_TAGS, MEMO_TAG_LABELS, type Memo, type MemoTag } from '@field-note/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Select } from '../components/ui/select';
import { formatDay, formatLongDay } from '../lib/dates';
import { projectWorkPath } from '../lib/projectPaths';

type ProjectOption = { id: string; name: string };

type MemoListProps = {
  memos: readonly Memo[];
  projects?: readonly ProjectOption[];
  onToggleDone: (memo: Memo, isDone: boolean) => void;
  onLink?: (memo: Memo, projectId: string) => void;
  onDelete: (memo: Memo) => void;
  onEdit?: (memo: Memo, content: string, tag: MemoTag) => void;
  // 프로젝트 메모면 날짜 머리에 연도까지 보이고 그날 작업 기록으로 가는 링크를 단다
  projectId?: string;
};

const groupByDate = (memos: readonly Memo[]) => {
  const groups = new Map<string, Memo[]>();

  for (const memo of memos) {
    groups.set(memo.memoDate, [...(groups.get(memo.memoDate) ?? []), memo]);
  }

  return [...groups.entries()];
};

const MemoItem = ({
  memo,
  projects,
  onToggleDone,
  onLink,
  onDelete,
  onEdit,
}: Omit<MemoListProps, 'memos' | 'projectId'> & { memo: Memo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(memo.content);
  const [tag, setTag] = useState<MemoTag>(memo.tag);
  const { confirm, dialog } = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: '메모를 지울까요?',
      description: '지우면 되돌릴 수 없습니다',
      confirmLabel: '지우기',
      danger: true,
    });
    if (ok) onDelete(memo);
  };

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      {dialog}
      <div className="flex items-start gap-3">
        {memo.tag === 'TODO' && (
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={memo.isDone}
            aria-label={`${memo.content} 완료`}
            onChange={(event) => onToggleDone(memo, event.target.checked)}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                aria-label="메모 내용"
                className="min-h-16 w-full rounded-md border border-control-border bg-surface p-2 text-sm outline-none focus:border-primary"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Select
                  aria-label="태그"
                  size="sm"
                  className="w-28"
                  value={tag}
                  onValueChange={(value) => setTag(value as MemoTag)}
                  options={MEMO_TAGS.map((t) => ({ value: t, label: MEMO_TAG_LABELS[t] }))}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setContent(memo.content);
                    setTag(memo.tag);
                    setIsEditing(false);
                  }}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onEdit?.(memo, content, tag);
                    setIsEditing(false);
                  }}
                >
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">
              <Badge
                className="mr-2 align-middle"
                tone={memo.tag === 'TODO' ? 'primary' : 'neutral'}
              >
                {MEMO_TAG_LABELS[memo.tag]}
              </Badge>
              <span className={memo.isDone ? 'text-foreground/70 line-through' : undefined}>
                {memo.content}
              </span>
            </p>
          )}
        </div>
        {!isEditing && (
          <div className="-my-1 flex shrink-0 gap-0.5">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="수정"
                onClick={() => setIsEditing(true)}
              >
                <Pencil aria-hidden />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="삭제"
              className="hover:text-danger"
              onClick={() => void handleDelete()}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {!isEditing && projects && onLink && (
        <Select
          aria-label={`${memo.content} 프로젝트에 연결`}
          size="sm"
          value=""
          placeholder="프로젝트에 연결…"
          onValueChange={(projectId) => onLink(memo, projectId)}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
      )}
    </li>
  );
};

// 메모 목록: 날짜별로 묶어 최근 것부터, 한 줄에 태그·내용과 수정·삭제 아이콘. 할 일은 완료 체크, 메모함에서는 프로젝트 연결, 삭제는 확인 창
export const MemoList = ({ memos, projectId, ...handlers }: MemoListProps) => (
  <div className="flex flex-col gap-4">
    {groupByDate(memos).map(([date, items]) => (
      <section key={date} className="flex flex-col gap-2" aria-label={formatDay(date)}>
        {projectId ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-semibold">{formatLongDay(date)}</h3>
            <span className="text-sm text-foreground/65">{items.length}건</span>
            <Link
              to={projectWorkPath(projectId, date)}
              className="ml-auto text-sm font-medium text-primary hover:underline"
            >
              작업 기록 보기
            </Link>
          </div>
        ) : (
          <h2 className="text-sm font-bold text-foreground/70">{formatDay(date)}</h2>
        )}
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((memo) => (
            <MemoItem key={memo.id} memo={memo} {...handlers} />
          ))}
        </ul>
      </section>
    ))}
  </div>
);
