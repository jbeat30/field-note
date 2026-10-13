import {
  MATERIAL_RECORD_KIND_LABELS,
  type Material,
  type MaterialRecord,
} from '@field-note/shared';
import { Trash2 } from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatDay } from '../lib/dates';

/**
 * @description 사용한 자재 기록을 날짜별로 묶어 보여 줌 (최근 날짜 먼저). 예전에 남긴 반입·반출·폐기 기록은 구분 표시를 붙인다
 * @param props 기록·회사 자재·지우기 동작
 */
export const MaterialUsageList = ({
  records,
  materials,
  onDelete,
}: {
  records: readonly MaterialRecord[];
  materials: readonly Material[];
  onDelete?: (record: MaterialRecord) => void;
}) => {
  const byId = new Map(materials.map((item) => [item.id, item]));
  const dates = [...new Set(records.map((record) => record.recordDate))];

  return (
    <div className="flex flex-col gap-5">
      {dates.map((date) => (
        <section key={date} aria-label={`${formatDay(date)} 자재`} className="flex flex-col">
          <h3 className="border-b border-line pb-1.5 text-sm font-semibold text-foreground/75">
            {formatDay(date)}
          </h3>
          <ul className="divide-y divide-line">
            {records
              .filter((record) => record.recordDate === date)
              .map((record) => {
                const material = byId.get(record.materialId);
                const name = material?.name ?? '(알 수 없는 자재)';

                return (
                  <li key={record.id} className="flex items-start gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{name}</span>
                        {material?.spec && (
                          <span className="text-sm text-foreground/75">{material.spec}</span>
                        )}
                        {record.kind !== 'USED' && (
                          <Badge>{MATERIAL_RECORD_KIND_LABELS[record.kind]}</Badge>
                        )}
                      </p>
                      {(record.area || record.memo) && (
                        <p className="text-sm text-foreground/65">
                          {[record.area, record.memo].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 pt-0.5 font-semibold tabular-nums">
                      {record.quantity.toLocaleString('ko-KR')}
                      <span className="ml-0.5 text-sm font-normal text-foreground/65">
                        {material?.unit}
                      </span>
                    </p>
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${name} 기록 지우기`}
                        onClick={() => onDelete(record)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
};
