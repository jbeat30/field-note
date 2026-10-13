import {
  MATERIAL_RECORD_KIND_LABELS,
  type Material,
  type MaterialRecord,
} from '@field-note/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatDay } from '../lib/dates';

import { parseQuantity } from './materialRows';

type MaterialRecordListProps = {
  records: readonly MaterialRecord[];
  materials: readonly Pick<Material, 'id' | 'name' | 'spec' | 'unit'>[];
  // 날짜별 제목을 붙일지 (하루치만 보여 줄 때는 끔)
  showDates?: boolean;
  onChangeQuantity: (record: MaterialRecord, quantity: number) => void;
  onDelete: (record: MaterialRecord) => void;
};

const RecordItem = ({
  record,
  material,
  onChangeQuantity,
  onDelete,
}: {
  record: MaterialRecord;
  material?: Pick<Material, 'name' | 'spec' | 'unit'>;
} & Pick<MaterialRecordListProps, 'onChangeQuantity' | 'onDelete'>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(String(record.quantity));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const parsed = parseQuantity(text);

  const subInfo = [
    record.area,
    record.isChange && '변경·추가 작업',
    record.isAfterService && '사후 작업',
    record.memo,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface-subtle px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {material
              ? `${material.name}${material.spec ? ` ${material.spec}` : ''}`
              : '(삭제된 자재)'}
          </p>
          {subInfo && <p className="text-sm text-foreground/70">{subInfo}</p>}
        </div>
        <span className="shrink-0 text-lg font-bold">
          {MATERIAL_RECORD_KIND_LABELS[record.kind]} {record.quantity}
          {material?.unit}
        </span>
        {!isEditing && (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              aria-label="기록 수정"
              title="기록 수정"
              onClick={() => setIsEditing(true)}
            >
              <Pencil aria-hidden className="size-5" />
            </Button>
            {isConfirmingDelete ? (
              <Button type="button" variant="danger" onClick={() => onDelete(record)}>
                정말 삭제
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                aria-label="삭제"
                title="삭제"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2 aria-hidden className="size-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {isEditing && (
        <div className="flex items-center gap-2">
          <Input
            className="min-w-0 flex-1 text-right text-xl font-bold"
            inputMode="decimal"
            aria-label="수정할 수량"
            value={text}
            aria-invalid={parsed === null ? true : undefined}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            type="button"
            disabled={parsed === null}
            onClick={() => {
              onChangeQuantity(record, parsed!);
              setIsEditing(false);
            }}
          >
            저장
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            취소
          </Button>
        </div>
      )}
    </li>
  );
};

// 자재 기록 목록 (날짜별 묶음은 선택). 수량 수정은 서버가 확인한 뒤 반영하고, 삭제는 한 번 더 확인
export const MaterialRecordList = ({
  records,
  materials,
  showDates = false,
  onChangeQuantity,
  onDelete,
}: MaterialRecordListProps) => {
  const groups = new Map<string, MaterialRecord[]>();

  for (const record of records) {
    groups.set(showDates ? record.recordDate : '', [
      ...(groups.get(showDates ? record.recordDate : '') ?? []),
      record,
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([date, items]) => (
        <section
          key={date}
          className="flex flex-col gap-2"
          aria-label={date ? formatDay(date) : '자재 기록'}
        >
          {date && <h3 className="text-sm font-bold text-foreground/70">{formatDay(date)}</h3>}
          <ul className="flex flex-col gap-2">
            {items.map((record) => (
              <RecordItem
                key={record.id}
                record={record}
                material={materials.find((material) => material.id === record.materialId)}
                onChangeQuantity={onChangeQuantity}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
