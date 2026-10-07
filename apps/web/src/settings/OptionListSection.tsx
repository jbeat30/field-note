import {
  OPTION_KIND_LABELS,
  optionNameSchema,
  type OptionItem,
  type OptionKind,
} from '@field-note/shared';
import { useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getErrorDetailMessage } from '../lib/apiError';

import { useCreateOption, useReorderOptions, useUpdateOption } from './useOptions';

const KIND_HINTS: Record<OptionKind, string> = {
  JOB_TYPE: '직원의 기술 분류입니다',
  WORK_CATEGORY: '작업일지에 쓰는 작업의 종류입니다',
  TRADE: '프로젝트의 공사·작업 분류입니다',
  WORKER_TYPE: '목록과 필터에 쓰는 표시입니다 (공수 계산에는 쓰지 않습니다)',
};

// 항목 한 줄: 이름, 순서 이동, 이름 변경, 숨기기. 삭제는 없다 (이미 기록에 쓰인 이름이 사라지지 않게 숨기기만 한다)
const OptionRow = ({
  item,
  index,
  count,
  isBusy,
  onMove,
  onError,
}: {
  item: OptionItem;
  index: number;
  count: number;
  isBusy: boolean;
  onMove: (from: number, to: number) => void;
  onError: (message: string) => void;
}) => {
  const update = useUpdateOption();
  const [isEditing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [nameError, setNameError] = useState('');

  const save = (event: FormEvent) => {
    event.preventDefault();

    const parsed = optionNameSchema.safeParse(name);

    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? '');
      return;
    }

    update.mutate(
      { id: item.id, name: parsed.data },
      {
        onSuccess: () => {
          setEditing(false);
          setNameError('');
        },
        onError: (error) => setNameError(getErrorDetailMessage(error)),
      },
    );
  };

  if (isEditing) {
    return (
      <li className="py-2">
        <form className="flex flex-col gap-2" onSubmit={save} noValidate>
          <label className="text-sm font-medium" htmlFor={`rename-${item.id}`}>
            {item.name} 이름 변경
          </label>
          <Input
            id={`rename-${item.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={nameError ? true : undefined}
          />
          {nameError && <p className="text-sm text-danger">{nameError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              저장
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setName(item.name);
                setNameError('');
              }}
            >
              취소
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className={item.isActive ? 'font-medium' : 'text-foreground/60 line-through'}>
        {item.name}
        {!item.isActive && <span className="ml-2 text-sm no-underline">(숨김)</span>}
      </span>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="secondary"
          aria-label={`${item.name} 위로`}
          disabled={isBusy || index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          ↑
        </Button>
        <Button
          variant="secondary"
          aria-label={`${item.name} 아래로`}
          disabled={isBusy || index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          ↓
        </Button>
        <Button
          variant="secondary"
          aria-label={`${item.name} 이름 변경`}
          onClick={() => setEditing(true)}
        >
          이름 변경
        </Button>
        <Button
          variant="secondary"
          aria-label={`${item.name} ${item.isActive ? '숨기기' : '다시 사용'}`}
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { id: item.id, isActive: !item.isActive },
              { onError: (error) => onError(getErrorDetailMessage(error)) },
            )
          }
        >
          {item.isActive ? '숨기기' : '다시 사용'}
        </Button>
      </div>
    </li>
  );
};

// 한 종류의 목록 (직종 등): 항목 목록과 추가 입력
export const OptionListSection = ({ kind, items }: { kind: OptionKind; items: OptionItem[] }) => {
  const label = OPTION_KIND_LABELS[kind];
  const create = useCreateOption();
  const reorder = useReorderOptions();
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');

  const move = (from: number, to: number) => {
    const ids = items.map((item) => item.id);
    const [moved] = ids.splice(from, 1);

    ids.splice(to, 0, moved!);
    setMessage('');
    reorder.mutate({ kind, ids }, { onError: (error) => setMessage(getErrorDetailMessage(error)) });
  };

  const add = (event: FormEvent) => {
    event.preventDefault();

    const parsed = optionNameSchema.safeParse(newName);

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? '');
      return;
    }

    setMessage('');
    create.mutate(
      { kind, name: parsed.data },
      {
        onSuccess: () => setNewName(''),
        onError: (error) => setMessage(getErrorDetailMessage(error)),
      },
    );
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`options-${kind}`}>
      <div>
        <h2 id={`options-${kind}`} className="text-lg font-bold">
          {label}
        </h2>
        <p className="text-sm text-foreground/70">{KIND_HINTS[kind]}</p>
      </div>
      {message && <Alert>{message}</Alert>}
      <ul className="divide-y divide-border">
        {items.map((item, index) => (
          <OptionRow
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            isBusy={reorder.isPending}
            onMove={move}
            onError={setMessage}
          />
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={add} noValidate>
        <Input
          aria-label={`${label} 추가`}
          placeholder={`새 ${label}`}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="submit" className="shrink-0 whitespace-nowrap" disabled={create.isPending}>
          추가
        </Button>
      </form>
    </section>
  );
};
