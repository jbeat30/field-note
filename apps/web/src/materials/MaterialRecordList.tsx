import {
  MATERIAL_RECORD_KIND_LABELS,
  type Material,
  type MaterialRecord,
} from '@field-note/shared';
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

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {material
            ? `${material.name}${material.spec ? ` ${material.spec}` : ''}`
            : '(삭제된 자재)'}
        </span>
        <span className="text-lg font-bold">
          {MATERIAL_RECORD_KIND_LABELS[record.kind]} {record.quantity}
          {material?.unit}
        </span>
      </div>
      {(record.area || record.isChange || record.isAfterService || record.memo) && (
        <p className="text-sm text-foreground/70">
          {[
            record.area,
            record.isChange && '변경·추가 작업',
            record.isAfterService && '사후 작업',
            record.memo,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            className="min-w-0 flex-1 text-right text-xl font-bold"
            inputMode="decimal"
            aria-label="수량 수정"
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
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setIsEditing(true)}>
            수량 수정
          </Button>
          {isConfirmingDelete ? (
            <Button type="button" variant="danger" onClick={() => onDelete(record)}>
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
