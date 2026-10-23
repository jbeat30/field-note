import {
  MATERIAL_UNIT_PRESETS,
  findMaterialMatch,
  quantitySchema,
  type Material,
} from '@field-note/shared';
import { Copy, Plus, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { DateInput } from '../components/ui/date-input';
import { FormNotice } from '../components/ui/form-notice';
import { Input } from '../components/ui/input';
import { getErrorCode } from '../lib/apiError';
import { splitServerErrors } from '../lib/serverErrors';

import { useCreateMaterial, useCreateMaterialRecords, useMaterials } from './useMaterials';

type Row = {
  key: string;
  name: string;
  spec: string;
  quantity: string;
  unit: string;
  area: string;
  memo: string;
};

let sequence = 0;

const newRow = (patch: Partial<Row> = {}): Row => {
  sequence += 1;

  return {
    key: `row-${sequence}`,
    name: '',
    spec: '',
    quantity: '',
    unit: '',
    area: '',
    memo: '',
    ...patch,
  };
};

const isBlank = (row: Row) => !row.name.trim() && !row.spec.trim() && !row.quantity.trim();

// 칸 머리: 품명 | 규격 | 수량 | 단위 | 위치(선택) | 액션
const GRID =
  'md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_5.5rem_5rem_minmax(0,1fr)_4.5rem] md:gap-2';

/**
 * @description 사용한 자재 기록: 목록에서 고르지 않고 품명·규격(치수·두께·재질·색)·수량·단위를 그 자리에서 입력
 * 현장마다 다르게 만드는 맞춤 자재를 그대로 기록하기 위함, 새 품명·규격은 저장 시 회사 자재로 자동 등록
 * @param props 프로젝트·기본 날짜·고를 수 있는 날짜 범위
 */
export const MaterialUsageForm = ({
  projectId,
  defaultDate,
  minDate,
  maxDate,
  fixedDate = false,
}: {
  projectId: string;
  defaultDate: string;
  minDate?: string;
  maxDate: string;
  // 하루 기록 화면처럼 날짜가 정해진 곳에서는 날짜 칸을 숨김
  fixedDate?: boolean;
}) => {
  const listId = useId();
  const materials = useMaterials();
  const createMaterial = useCreateMaterial();
  const createRecords = useCreateMaterialRecords(projectId);
  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [rootError, setRootError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const known = materials.data ?? [];
  // 최근 쓴 자재 (한 번 눌러 줄 추가)
  const recent = known.filter((item) => item.lastRecordedAt).slice(0, 8);
  const names = [...new Set(known.map((item) => item.name))];

  const patch = (key: string, value: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...value } : row)));

  // 전에 쓴 자재와 같으면 단위를 미리 채움 (단위는 자재마다 하나)
  const fillUnit = (row: Row) => {
    if (row.unit.trim()) return;

    const match =
      findMaterialMatch(known, row.name, row.spec) ??
      known.find((item) => item.name.trim() === row.name.trim());

    if (match) patch(row.key, { unit: match.unit });
  };

  const addFrom = (material: Material) =>
    setRows((current) => [
      ...current.filter((row) => !isBlank(row)),
      newRow({ name: material.name, spec: material.spec ?? '', unit: material.unit }),
    ]);

  const copyRow = (row: Row) =>
    setRows((current) => {
      const index = current.findIndex((item) => item.key === row.key);

      return [
        ...current.slice(0, index + 1),
        newRow({ name: row.name, spec: row.spec, unit: row.unit, area: row.area, memo: row.memo }),
        ...current.slice(index + 1),
      ];
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setNotice(null);
    setRootError('');
    setSaved('');

    const filled = rows.filter((row) => !isBlank(row));
    const found: Record<string, string> = {};

    if (filled.length === 0) {
      setNotice('기록할 자재를 한 줄 이상 적어 주세요');
      return;
    }

    for (const row of filled) {
      const match = findMaterialMatch(known, row.name, row.spec);

      if (!row.name.trim()) found[`${row.key}.name`] = '품명을 적어 주세요';
      if (!quantitySchema.safeParse(Number(row.quantity)).success || !row.quantity.trim()) {
        found[`${row.key}.quantity`] = '0보다 큰 수량';
      }
      if (!row.unit.trim()) found[`${row.key}.unit`] = '단위';
      if (match && row.unit.trim() && match.unit !== row.unit.trim()) {
        found[`${row.key}.unit`] = `이 자재는 '${match.unit}' 단위`;
      }
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setBusy(true);

    try {
      let list = known;
      const ids: string[] = [];

      // 새 품명·규격은 회사 자재로 먼저 만듦 (이미 다른 곳에서 만들었으면 다시 읽어 찾음)
      for (const row of filled) {
        let match = findMaterialMatch(list, row.name, row.spec);

        if (!match) {
          try {
            match = await createMaterial.mutateAsync({
              name: row.name.trim(),
              spec: row.spec.trim() || undefined,
              unit: row.unit.trim(),
              category: 'CONSUMABLE',
            });
            list = [...list, match];
          } catch (error) {
            if (getErrorCode(error) !== 'CONFLICT') throw error;

            list = (await materials.refetch()).data ?? list;
            match = findMaterialMatch(list, row.name, row.spec);

            if (!match) throw error;
          }
        }

        ids.push(match.id);
      }

      await createRecords.mutateAsync({
        records: filled.map((row, index) => ({
          materialId: ids[index]!,
          recordDate: date,
          kind: 'USED',
          quantity: Number(row.quantity),
          isChange: false,
          isAfterService: false,
          ...(row.area.trim() ? { area: row.area.trim() } : {}),
          ...(row.memo.trim() ? { memo: row.memo.trim() } : {}),
        })),
      });
      setRows([newRow()]);
      setSaved(`자재 ${filled.length}건을 기록했습니다`);
    } catch (error) {
      setRootError(
        splitServerErrors(error, ['records', 'recordDate', 'name', 'unit']).root ||
          '저장하지 못했습니다. 잠시 후 다시 시도해 주세요',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-label="사용한 자재 기록"
    >
      {!fixedDate && (
        <label className="flex items-center gap-2 text-sm font-medium">
          쓴 날
          <DateInput
            className="w-44"
            size="sm"
            aria-label="자재 쓴 날"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      )}

      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-sub">최근 쓴 자재</span>
          {recent.map((material) => (
            <Button
              key={material.id}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addFrom(material)}
            >
              <Plus aria-hidden />
              {material.name}
              {material.spec ? ` ${material.spec}` : ''}
            </Button>
          ))}
        </div>
      )}

      <div>
        <div aria-hidden className={`hidden pb-1.5 text-xs font-semibold text-sub ${GRID}`}>
          <span>품명</span>
          <span>규격 (치수·두께·재질·색)</span>
          <span>수량</span>
          <span>단위</span>
          <span>위치 (선택)</span>
          <span />
        </div>
        <ul className="flex flex-col gap-3 md:gap-2" aria-label="자재 줄">
          {rows.map((row, index) => {
            const label = `${index + 1}번 줄`;

            return (
              <li
                key={row.key}
                className={`grid grid-cols-2 gap-2 border-b border-line pb-3 md:border-b-0 md:pb-0 ${GRID}`}
              >
                <div className="col-span-2 md:col-span-1">
                  <Input
                    size="sm"
                    aria-label={`${label} 품명`}
                    placeholder="품명 (예: 철문)"
                    list={`${listId}-names`}
                    value={row.name}
                    aria-invalid={Boolean(errors[`${row.key}.name`])}
                    onChange={(event) => patch(row.key, { name: event.target.value })}
                    onBlur={() => fillUnit(row)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input
                    size="sm"
                    aria-label={`${label} 규격`}
                    placeholder="예: 900×2100 1.6T 백색"
                    value={row.spec}
                    onChange={(event) => patch(row.key, { spec: event.target.value })}
                    onBlur={() => fillUnit(row)}
                  />
                </div>
                <Input
                  size="sm"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  aria-label={`${label} 수량`}
                  placeholder="수량"
                  className="text-right tabular-nums"
                  value={row.quantity}
                  aria-invalid={Boolean(errors[`${row.key}.quantity`])}
                  onChange={(event) => patch(row.key, { quantity: event.target.value })}
                />
                <Input
                  size="sm"
                  aria-label={`${label} 단위`}
                  placeholder="단위"
                  list={`${listId}-units`}
                  value={row.unit}
                  aria-invalid={Boolean(errors[`${row.key}.unit`])}
                  onChange={(event) => patch(row.key, { unit: event.target.value })}
                />
                <Input
                  size="sm"
                  aria-label={`${label} 위치`}
                  placeholder="위치 (선택)"
                  value={row.area}
                  onChange={(event) => patch(row.key, { area: event.target.value })}
                />
                <div className="col-span-2 flex justify-end gap-0.5 md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${label} 복사`}
                    title="이 줄 복사 (규격만 바꿔 쓰기)"
                    onClick={() => copyRow(row)}
                  >
                    <Copy aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${label} 지우기`}
                    disabled={rows.length === 1}
                    onClick={() =>
                      setRows((current) => current.filter((item) => item.key !== row.key))
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </div>
                {(errors[`${row.key}.name`] ||
                  errors[`${row.key}.quantity`] ||
                  errors[`${row.key}.unit`]) && (
                  <p className="col-span-2 text-sm text-danger md:col-span-6">
                    {[
                      errors[`${row.key}.name`],
                      errors[`${row.key}.quantity`],
                      errors[`${row.key}.unit`],
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <datalist id={`${listId}-names`}>
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <datalist id={`${listId}-units`}>
          {MATERIAL_UNIT_PRESETS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRows((current) => [...current, newRow()])}
        >
          <Plus aria-hidden />줄 추가
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? '저장 중' : '저장'}
        </Button>
      </div>
      <FormNotice message={notice} />
      {rootError && <Alert>{rootError}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}
    </form>
  );
};
