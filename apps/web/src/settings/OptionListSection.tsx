import {
  OPTION_KIND_LABELS,
  optionNameSchema,
  type OptionItem,
  type OptionKind,
} from '@field-note/shared';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SortableItem, SortableList } from '../components/ui/sortable-list';
import { getErrorDetailMessage } from '../lib/apiError';

import { useCreateOption, useReorderOptions, useUpdateOption } from './useOptions';

const KIND_HINTS: Record<OptionKind, string> = {
  JOB_TYPE: '직원의 기술 분류입니다',
  WORK_CATEGORY: '작업 내역에 쓰는 작업의 종류입니다',
  TRADE: '프로젝트의 공사·작업 분류입니다',
  WORKER_TYPE: '목록과 필터에 쓰는 표시입니다 (공수 계산에는 쓰지 않습니다)',
  CREDENTIAL_TYPE: '직원 서류의 종류입니다 (자격증, 안전교육 이수증, 건강검진 등)',
  EXPENSE_CATEGORY: '프로젝트에서 나간 돈을 나누는 분류입니다 (부자재, 장비, 식대 등)',
  INCOME_CATEGORY: '프로젝트에서 들어온 돈을 나누는 분류입니다 (고철 판매, 현장 지원 등)',
};

// 행 안의 아이콘 동작 버튼 (이름은 aria-label, 눈에 보이는 이름은 title)
const IconButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button variant="ghost" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
    {children}
  </Button>
);

// 항목 한 줄: 이름, 순서 이동, 이름 변경, 숨기기, 삭제 없음 (이미 기록에 쓰인 이름이 사라지지 않도록 숨기기만 제공)
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
      <SortableItem id={item.id} label={item.name} className="py-2" disabled>
        {() => (
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
        )}
      </SortableItem>
    );
  }

  return (
    <SortableItem
      id={item.id}
      label={item.name}
      disabled={isBusy}
      className="flex items-center justify-between gap-2 py-1"
    >
      {(handle) => (
        <>
          <span className="flex items-center gap-1">
            {handle}
            <span className={item.isActive ? 'font-medium' : 'text-foreground/70'}>
              {item.name}
            </span>
            {!item.isActive && <Badge className="ml-1">숨김</Badge>}
          </span>
          <div className="flex items-center gap-0.5">
            <IconButton
              label={`${item.name} 위로`}
              disabled={isBusy || index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              <ChevronUp aria-hidden className="size-5" />
            </IconButton>
            <IconButton
              label={`${item.name} 아래로`}
              disabled={isBusy || index === count - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ChevronDown aria-hidden className="size-5" />
            </IconButton>
            <IconButton label={`${item.name} 이름 변경`} onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="size-5" />
            </IconButton>
            <IconButton
              label={`${item.name} ${item.isActive ? '숨기기' : '다시 사용'}`}
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { id: item.id, isActive: !item.isActive },
                  { onError: (error) => onError(getErrorDetailMessage(error)) },
                )
              }
            >
              {item.isActive ? (
                <EyeOff aria-hidden className="size-5" />
              ) : (
                <Eye aria-hidden className="size-5" />
              )}
            </IconButton>
          </div>
        </>
      )}
    </SortableItem>
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
    <section
      className="flex flex-col gap-4 rounded-3xl bg-surface-subtle p-5"
      aria-labelledby={`options-${kind}`}
    >
      <div>
        <h2 id={`options-${kind}`} className="flex items-center gap-2 text-lg font-bold">
          {label}
          <Badge>{items.length}개</Badge>
        </h2>
        <p className="text-sm text-foreground/70">{KIND_HINTS[kind]}</p>
      </div>
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
      {message && <Alert>{message}</Alert>}
      <SortableList
        ids={items.map((item) => item.id)}
        getLabel={(id) => items.find((item) => item.id === id)?.name ?? ''}
        disabled={reorder.isPending}
        onReorder={(ids) => {
          setMessage('');
          reorder.mutate(
            { kind, ids },
            { onError: (error) => setMessage(getErrorDetailMessage(error)) },
          );
        }}
        className="divide-y divide-line"
      >
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
      </SortableList>
    </section>
  );
};
