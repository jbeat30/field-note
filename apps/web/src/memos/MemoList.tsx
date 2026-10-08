import { MEMO_TAGS, MEMO_TAG_LABELS, type Memo, type MemoTag } from '@field-note/shared';
import { useState } from 'react';

import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { formatDay } from '../lib/dates';

type ProjectOption = { id: string; name: string };

type MemoListProps = {
  memos: readonly Memo[];
  // 메모함에서 프로젝트에 연결할 수 있게 고를 목록 (없으면 연결 칸을 숨김)
  projects?: readonly ProjectOption[];
  // 프로젝트 이름을 보여 줄 때 쓰는 표 (메모함이 아닌 곳에서 쓸 때)
  onToggleDone: (memo: Memo, isDone: boolean) => void;
  onLink?: (memo: Memo, projectId: string) => void;
  onDelete: (memo: Memo) => void;
  onEdit?: (memo: Memo, content: string, tag: MemoTag) => void;
};

// 날짜(최근 먼저)별로 묶음
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
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
          <span className="w-fit rounded bg-muted px-1.5 py-0.5 text-xs">
            {MEMO_TAG_LABELS[memo.tag]}
          </span>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-surface p-2 text-base"
                aria-label="메모 내용"
                value={content}
                maxLength={5000}
                onChange={(event) => setContent(event.target.value)}
              />
              <Select
                aria-label="태그"
                value={tag}
                onChange={(event) => setTag(event.target.value as MemoTag)}
              >
                {MEMO_TAGS.map((value) => (
                  <option key={value} value={value}>
                    {MEMO_TAG_LABELS[value]}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={!content.trim()}
                  onClick={() => {
                    onEdit?.(memo, content, tag);
                    setIsEditing(false);
                  }}
                >
                  저장
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={
                memo.isDone
                  ? 'whitespace-pre-wrap text-foreground/60 line-through'
                  : 'whitespace-pre-wrap'
              }
            >
              {memo.content}
            </p>
          )}
        </div>
      </div>
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-2">
          {projects && onLink && (
            <Select
              className="w-auto flex-1"
              aria-label={`${memo.content} 프로젝트에 연결`}
              value=""
              onChange={(event) => event.target.value && onLink(memo, event.target.value)}
            >
              <option value="">프로젝트에 연결…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
          {onEdit && (
            <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
              수정
            </Button>
          )}
          {isConfirmingDelete ? (
            <Button type="button" variant="danger" onClick={() => onDelete(memo)}>
              정말 삭제
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setIsConfirmingDelete(true)}>
              삭제
            </Button>
          )}
        </div>
      )}
    </li>
  );
};

// 메모 목록: 날짜별로 묶어 최근 것부터. 할 일은 완료 체크, 메모함에서는 프로젝트 연결, 삭제는 한 번 더 확인
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
