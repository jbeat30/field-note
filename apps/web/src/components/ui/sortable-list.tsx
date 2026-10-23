import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type SortableListProps = {
  // 현재 순서의 항목 id
  ids: string[];
  // 끌어서 또는 키보드로 순서를 바꾸면 새 순서의 id 반환
  onReorder: (ids: string[]) => void;
  // 항목 이름 조회 (스크린 리더 안내용)
  getLabel: (id: string) => string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  children: ReactNode;
};

// 순서 변경 목록: 마우스·터치는 손잡이를 끌고(터치는 살짝 눌렀다가), 키보드는 손잡이에서 Space → 방향키 → Space
// 손잡이 없이도 변경할 수 있도록 화면마다 위/아래 버튼을 대안으로 병행 배치
export const SortableList = ({
  ids,
  onReorder,
  getLabel,
  disabled = false,
  className,
  children,
  ...rest
}: SortableListProps) => {
  const sensors = useSensors(
    // 스크롤과 구분하려고 짧게 눌러야 끌기 시작
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));

    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  const name = (id: UniqueIdentifier) => getLabel(String(id));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            '순서를 바꾸려면 Space 키로 집고, 방향키로 옮긴 뒤 Space 키로 놓으세요. Esc 키는 취소입니다',
        },
        announcements: {
          onDragStart: ({ active }) => `${name(active.id)} 항목을 집었습니다`,
          onDragOver: ({ active, over }) =>
            over ? `${name(active.id)} 항목이 ${name(over.id)} 항목 위치로 이동합니다` : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${name(active.id)} 항목을 ${name(over.id)} 항목 위치에 놓았습니다`
              : `${name(active.id)} 항목을 제자리에 놓았습니다`,
          onDragCancel: ({ active }) => `${name(active.id)} 항목 이동을 취소했습니다`,
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={className} {...rest}>
          {children}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

type SortableItemProps = {
  id: string;
  label: string;
  className?: string;
  disabled?: boolean;
  // 손잡이 버튼을 받아 원하는 자리에 배치
  children: (handle: ReactNode) => ReactNode;
};

export const SortableItem = ({ id, label, className, disabled, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`${label} 순서 끌어서 바꾸기`}
      disabled={disabled}
      className="flex min-h-touch min-w-touch touch-none items-center justify-center rounded-full text-sub hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden className="size-5" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && 'relative z-10 rounded-lg bg-surface shadow-card')}
    >
      {children(handle)}
    </li>
  );
};
