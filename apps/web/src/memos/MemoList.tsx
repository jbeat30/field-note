import { MEMO_TAGS, MEMO_TAG_LABELS, type Memo, type MemoTag } from '@field-note/shared';
import { useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Select } from '../components/ui/select';
import { formatDay } from '../lib/dates';

type ProjectOption = { id: string; name: string };

type MemoListProps = {
  memos: readonly Memo[];
  projects?: readonly ProjectOption[];
  onToggleDone: (memo: Memo, isDone: boolean) => void;
  onLink?: (memo: Memo, projectId: string) => void;
  onDelete: (memo: Memo) => void;
  onEdit?: (memo: Memo, content: string, tag: MemoTag) => void;
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
}: Omit<MemoListProps, 'memos'> & { memo: Memo }) => {
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
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle p-4">
      {dialog}
      <div className="flex items-start gap-2">
        {memo.tag === 'TODO' && (
          <input
            type="checkbox"
            className="mt-1 size-6 shrink-0"
            checked={memo.isDone}
            aria-label={`${memo.content} 완료`}
            onChange={(event) => onToggleDone(memo, event.target.checked)}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Badge className="w-fit" tone={memo.tag === 'TODO' ? 'primary' : 'neutral'}>
            {MEMO_TAG_LABELS[memo.tag]}
          </Badge>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                aria-label="메모 내용"
                className="min-h-16 w-full rounded-md border border-control-border bg-surface p-2 text-sm outline-none focus:border-primary"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <div className="flex gap-2">
                <Select
                  aria-label="태그"
                  size="sm"
                  value={tag}
                  onValueChange={(value) => setTag(value as MemoTag)}
                  options={MEMO_TAGS.map((t) => ({ value: t, label: MEMO_TAG_LABELS[t] }))}
                />
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
              </div>
            </div>
          ) : (
            <p className={memo.isDone ? 'text-sm text-foreground/70 line-through' : 'text-sm'}>
              {memo.content}
            </p>
          )}
        </div>
      </div>
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-2">
          {projects && onLink && (
            <Select
              className="min-w-0 flex-1"
              aria-label={`${memo.content} 프로젝트에 연결`}
              value=""
              placeholder="프로젝트에 연결…"
              onValueChange={(projectId) => onLink(memo, projectId)}
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
            />
          )}
          {onEdit && (
            <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
              수정
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => void handleDelete()}>
            삭제
          </Button>
        </div>
      )}
    </li>
  );
};

// 메모 목록: 날짜별로 묶어 최근 것부터. 할 일은 완료 체크, 메모함에서는 프로젝트 연결, 삭제는 확인 창
export const MemoList = ({ memos, ...handlers }: MemoListProps) => (
  <div className="flex flex-col gap-4">
    {groupByDate(memos).map(([date, items]) => (
      <section key={date} className="flex flex-col gap-2" aria-label={formatDay(date)}>
        <h2 className="text-sm font-bold text-foreground/70">{formatDay(date)}</h2>
        <ul className="flex flex-col gap-2">
          {items.map((memo) => (
            <MemoItem key={memo.id} memo={memo} {...handlers} />
          ))}
        </ul>
      </section>
    ))}
  </div>
);
