import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_RECORD_KINDS,
  MATERIAL_RECORD_KIND_LABELS,
  MATERIAL_UNIT_PRESETS,
  type Material,
  type MaterialCategory,
  type MaterialCreate,
  type MaterialRecord,
  type MaterialRecordCreate,
  type MaterialRecordKind,
} from '@field-note/shared';
import { useEffect, useId, useState } from 'react';

import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { FormField } from '../components/ui/form-field';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { useLocalDraft } from '../drafts/useLocalDraft';
import { getErrorDetailMessage } from '../lib/apiError';

import {
  EMPTY_COMMON,
  addRow,
  checkRows,
  copyUsedRows,
  newRow,
  recentMaterials,
  toRecords,
  type MaterialCommon,
  type MaterialRow,
} from './materialRows';

type MaterialEntryFormProps = {
  date: string;
  // 입력 중인 행을 기기에 임시 저장하는 키 (없으면 저장하지 않음). 앱을 닫아도 이어서 입력할 수 있게
  draftKey?: string;
  // 서버가 준 순서(최근 기록한 자재가 먼저)의 쓸 수 있는 자재
  materials: readonly Material[];
  categories: readonly { id: string; name: string }[];
  // "어제와 동일"에 쓸 직전 기록일의 기록 (없으면 버튼이 꺼짐)
  previousRecords?: readonly MaterialRecord[];
  // 저장은 서버가 확인한 뒤에만 입력을 비운다. 실패하면 던져서 알린다
  onSubmit: (records: MaterialRecordCreate[]) => Promise<void>;
  // 목록에 없는 자재를 그 자리에서 추가
  onCreateMaterial: (input: MaterialCreate) => Promise<Material>;
};

const materialLabel = (material: Material) =>
  `${material.name}${material.spec ? ` ${material.spec}` : ''} (${material.unit})`;

// 일지 안 자재 입력: 최근 쓴 자재를 한 번 눌러 추가하고 큰 숫자로 수량만 적는다. 여러 자재를 목록으로 한꺼번에 저장 (서비스 기획서 §11.6)
type EntrySnapshot = { rows: MaterialRow[]; common: MaterialCommon };

// 비교용 글자: 행의 임시 키는 빼고 내용만 비교
const signatureOf = ({ rows, common }: EntrySnapshot) =>
  JSON.stringify({
    rows: rows.map(({ materialId, kind, quantity }) => ({ materialId, kind, quantity })),
    common,
  });

export const MaterialEntryForm = ({
  date,
  draftKey,
  materials,
  categories,
  previousRecords = [],
  onSubmit,
  onCreateMaterial,
}: MaterialEntryFormProps) => {
  const saved = useLocalDraft<EntrySnapshot>({
    key: draftKey ?? '',
    baseVersion: null,
    initialSignature: signatureOf({ rows: [], common: EMPTY_COMMON }),
    signatureOf,
  });
  const restored = draftKey && saved.status !== 'none' ? saved.value : undefined;
  const [rows, setRows] = useState<MaterialRow[]>(restored?.rows ?? []);
  const [common, setCommon] = useState<MaterialCommon>(restored?.common ?? EMPTY_COMMON);
  const [isRestoredNoticeOpen, setRestoredNoticeOpen] = useState(Boolean(restored));
  const [isCommonOpen, setIsCommonOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    spec: '',
    unit: '장',
    category: 'CONSUMABLE' as MaterialCategory,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const unitListId = useId();

  // 입력이 바뀔 때마다 (잠깐 멈추면) 기기에 저장하고, 비우면 초안을 지움
  const signature = signatureOf({ rows, common });

  useEffect(() => {
    if (draftKey) saved.write({ rows, common });
    // 값이 바뀐 것만 보면 되므로 비교용 글자에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const recent = recentMaterials(materials);
  const { savable } = checkRows(rows);
  const copySource = copyUsedRows(previousRecords, materials);

  const patchRow = (key: string, patch: Partial<MaterialRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const add = (materialId: string) => setRows((current) => addRow(current, materialId).rows);

  const create = async () => {
    setCreateError(null);

    try {
      const created = await onCreateMaterial({
        name: draft.name,
        spec: draft.spec.trim() || undefined,
        unit: draft.unit,
        category: draft.category,
      });

      add(created.id);
      setDraft({ name: '', spec: '', unit: draft.unit, category: 'CONSUMABLE' });
      setIsCreating(false);
    } catch (caught) {
      setCreateError(getErrorDetailMessage(caught));
    }
  };

  const submit = async () => {
    const checked = checkRows(rows);

    setProblems(
      Object.fromEntries(checked.problems.map((problem) => [problem.key, problem.message])),
    );
    setError(null);

    if (checked.problems.length > 0) return;

    if (checked.savable === 0) {
      setError('저장할 수량을 입력해 주세요');

      return;
    }

    setIsSaving(true);

    try {
      await onSubmit(toRecords(rows, date, common));
      setRows([]);
      setCommon(EMPTY_COMMON);
      setRestoredNoticeOpen(false);
      saved.clear();
    } catch (caught) {
      // 실패해도 입력한 행은 그대로 두고 사유를 알림
      setError(getErrorDetailMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {recent.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">최근 쓴 자재 (눌러서 추가)</p>
          <ul className="flex flex-wrap gap-2">
            {recent.map((material) => (
              <li key={material.id}>
                <Button type="button" variant="secondary" onClick={() => add(material.id)}>
                  {material.name}
                  {material.spec ? ` ${material.spec}` : ''}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Select
          className="min-w-0 flex-1"
          aria-label="자재 골라서 추가"
          value=""
          onChange={(event) => event.target.value && add(event.target.value)}
        >
          <option value="">자재 골라서 추가…</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {materialLabel(material)}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={() => setIsCreating((value) => !value)}>
          새 자재
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={copySource.length === 0}
          onClick={() =>
            setRows(
              copySource.map((row) => ({ ...newRow(row.materialId, row.kind, row.quantity) })),
            )
          }
        >
          어제와 동일
        </Button>
      </div>

      {isCreating && (
        <div
          className="flex flex-col gap-2 rounded-md border border-border p-3"
          role="group"
          aria-label="새 자재 만들기"
        >
          <FormField label="자재명">
            <Input
              value={draft.name}
              maxLength={50}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </FormField>
          <FormField label="규격 (선택)">
            <Input
              value={draft.spec}
              maxLength={50}
              placeholder="예: 1.0T"
              onChange={(event) => setDraft({ ...draft, spec: event.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="단위">
              <Input
                list={unitListId}
                value={draft.unit}
                maxLength={10}
                onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
              />
            </FormField>
            <FormField label="분류">
              <Select
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value as MaterialCategory })
                }
              >
                {MATERIAL_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {MATERIAL_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <datalist id={unitListId}>
            {MATERIAL_UNIT_PRESETS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          {createError && <Alert>{createError}</Alert>}
          <Button
            type="button"
            disabled={!draft.name.trim() || !draft.unit.trim()}
            onClick={() => void create()}
          >
            자재 추가하고 입력 행에 넣기
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const material = materials.find((item) => item.id === row.materialId);

            return (
              <li key={row.key} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Select
                    className="min-w-0 flex-1"
                    aria-label="자재"
                    value={row.materialId}
                    onChange={(event) => patchRow(row.key, { materialId: event.target.value })}
                  >
                    <option value="">자재 선택</option>
                    {materials.map((item) => (
                      <option key={item.id} value={item.id}>
                        {materialLabel(item)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${material?.name ?? '자재'} 행 지우기`}
                    onClick={() =>
                      setRows((current) => current.filter((item) => item.key !== row.key))
                    }
                  >
                    ✕
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    className="w-28"
                    aria-label="구분"
                    value={row.kind}
                    onChange={(event) =>
                      patchRow(row.key, { kind: event.target.value as MaterialRecordKind })
                    }
                  >
                    {MATERIAL_RECORD_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {MATERIAL_RECORD_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    className="min-w-0 flex-1 text-right text-xl font-bold"
                    inputMode="decimal"
                    aria-label="수량"
                    placeholder="수량"
                    value={row.quantity}
                    onChange={(event) => patchRow(row.key, { quantity: event.target.value })}
                    aria-invalid={problems[row.key] ? true : undefined}
                  />
                  <span className="w-10 shrink-0 text-sm">{material?.unit ?? ''}</span>
                </div>
                {problems[row.key] && <p className="text-sm text-danger">{problems[row.key]}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <>
          <button
            type="button"
            className="min-h-touch w-fit text-left text-sm text-primary underline"
            aria-expanded={isCommonOpen}
            onClick={() => setIsCommonOpen((value) => !value)}
          >
            작업 구분·구역·변경 작업 표시 (선택)
          </button>
          {isCommonOpen && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <FormField label="작업 구분">
                <Select
                  value={common.categoryId}
                  onChange={(event) => setCommon({ ...common, categoryId: event.target.value })}
                >
                  <option value="">선택 안 함</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="구역">
                <Input
                  value={common.area}
                  maxLength={100}
                  placeholder="예: 3층 301호"
                  onChange={(event) => setCommon({ ...common, area: event.target.value })}
                />
              </FormField>
              <label className="flex min-h-touch items-center gap-3 text-base">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={common.isChange}
                  onChange={(event) => setCommon({ ...common, isChange: event.target.checked })}
                />
                변경·추가 작업에 쓴 자재
              </label>
              <label className="flex min-h-touch items-center gap-3 text-base">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={common.isAfterService}
                  onChange={(event) =>
                    setCommon({ ...common, isAfterService: event.target.checked })
                  }
                />
                사후 작업에 쓴 자재
              </label>
            </div>
          )}
        </>
      )}

      {isRestoredNoticeOpen && rows.length > 0 && (
        <Alert variant="info" className="flex flex-col gap-2">
          <span>저장하지 않고 닫았던 자재 입력을 복구했습니다</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRows([]);
              setCommon(EMPTY_COMMON);
              setRestoredNoticeOpen(false);
              saved.clear();
            }}
          >
            복구한 입력 버리기
          </Button>
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      <Button type="button" disabled={isSaving || rows.length === 0} onClick={() => void submit()}>
        {isSaving ? '저장하는 중' : savable > 0 ? `자재 ${savable}건 저장` : '자재 저장'}
      </Button>
    </div>
  );
};
