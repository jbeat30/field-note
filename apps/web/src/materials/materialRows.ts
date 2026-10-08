import {
  MATERIAL_QUANTITY_MAX,
  type Material,
  type MaterialRecord,
  type MaterialRecordCreate,
  type MaterialRecordKind,
} from '@field-note/shared';

// 일지 안 자재 입력: 여러 자재를 목록형으로 입력하는 행 (저장 전 화면 상태)
export type MaterialRow = {
  // 화면에서 행을 구분하는 값 (서버로 보내지 않음)
  key: string;
  materialId: string;
  kind: MaterialRecordKind;
  // 입력 중인 수량 글자 (숫자로 바꾸기 전)
  quantity: string;
};

// 공통 항목: 이번에 저장하는 모든 행에 같이 붙는다 (현장에서 행마다 입력하지 않게)
export type MaterialCommon = {
  categoryId: string;
  area: string;
  isChange: boolean;
  isAfterService: boolean;
};

export const EMPTY_COMMON: MaterialCommon = {
  categoryId: '',
  area: '',
  isChange: false,
  isAfterService: false,
};

let counter = 0;

export const newRow = (
  materialId = '',
  kind: MaterialRecordKind = 'USED',
  quantity = '',
): MaterialRow => {
  counter += 1;

  return { key: `row-${counter}`, materialId, kind, quantity };
};

/**
 * @description 입력한 수량 글자를 숫자로 바꿈. 쉼표·공백은 무시하고, 0 이하·소수 셋째 자리 초과·너무 큰 값·숫자가 아닌 글자는 null
 * @param text 입력 글자
 * @returns 수량 (올바르지 않으면 null)
 */
export const parseQuantity = (text: string): number | null => {
  const cleaned = text.replace(/[,\s]/g, '');

  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;

  const value = Number(cleaned);

  return value > 0 && value <= MATERIAL_QUANTITY_MAX ? value : null;
};

/**
 * @description 이미 같은 자재·구분 행이 있으면 새로 만들지 않고 그 행을 쓴다 (최근 자재를 두 번 눌러도 행이 늘지 않게)
 * @param rows 현재 행
 * @param materialId 추가할 자재
 * @param kind 기록 구분
 * @returns 행 목록과 입력을 이어갈 행의 key
 */
export const addRow = (
  rows: readonly MaterialRow[],
  materialId: string,
  kind: MaterialRecordKind = 'USED',
) => {
  const existing = rows.find((row) => row.materialId === materialId && row.kind === kind);

  if (existing) return { rows: [...rows], focusKey: existing.key };

  const row = newRow(materialId, kind);

  return { rows: [...rows, row], focusKey: row.key };
};

export type RowProblem = { key: string; message: string };

/**
 * @description 저장 전 행 검사. 수량이 비어 있는 행은 입력하다 만 행이라 건너뛰고(저장 대상 아님), 수량이 있는데 자재가 없거나 수량이 잘못된 행은 문제로 알린다
 * @param rows 입력 행
 * @returns 문제 목록 (없으면 비어 있음)과 저장할 행 수
 */
export const checkRows = (rows: readonly MaterialRow[]) => {
  const problems: RowProblem[] = [];
  let savable = 0;

  for (const row of rows) {
    if (!row.quantity.trim() && !row.materialId) continue;

    if (!row.materialId) {
      problems.push({ key: row.key, message: '자재를 골라 주세요' });
    } else if (!row.quantity.trim()) {
      continue;
    } else if (parseQuantity(row.quantity) === null) {
      problems.push({
        key: row.key,
        message: '수량은 0보다 큰 숫자로 입력해 주세요 (소수 셋째 자리까지)',
      });
    } else {
      savable += 1;
    }
  }

  return { problems, savable };
};

/**
 * @description 입력 행을 저장 요청으로 바꿈 (수량이 비어 있는 행은 제외, 공통 항목은 비어 있으면 보내지 않음)
 * @param rows 입력 행
 * @param date 기록 날짜
 * @param common 공통 항목
 * @returns 서버에 보낼 기록 목록
 */
export const toRecords = (
  rows: readonly MaterialRow[],
  date: string,
  common: MaterialCommon,
): MaterialRecordCreate[] =>
  rows.flatMap((row) => {
    const quantity = parseQuantity(row.quantity);

    if (!row.materialId || quantity === null) return [];

    return [
      {
        materialId: row.materialId,
        recordDate: date,
        kind: row.kind,
        quantity,
        categoryId: common.categoryId || undefined,
        area: common.area.trim() || undefined,
        isChange: common.isChange,
        isAfterService: common.isAfterService,
      },
    ];
  });

/**
 * @description "어제와 동일": 이전 기록일의 사용 기록을 같은 자재·수량의 행으로 복사 (같은 자재는 합산, 숨긴 자재는 제외)
 * @param records 이전 기록일의 기록
 * @param materials 지금 쓸 수 있는 자재 목록
 * @returns 복사한 행
 */
export const copyUsedRows = (
  records: readonly Pick<MaterialRecord, 'materialId' | 'kind' | 'quantity'>[],
  materials: readonly Pick<Material, 'id' | 'isActive'>[],
): MaterialRow[] => {
  const totals = new Map<string, number>();

  for (const record of records) {
    if (record.kind !== 'USED') continue;
    if (!materials.some((material) => material.id === record.materialId && material.isActive))
      continue;

    totals.set(
      record.materialId,
      Math.round(((totals.get(record.materialId) ?? 0) + record.quantity) * 1000) / 1000,
    );
  }

  return [...totals.entries()].map(([materialId, quantity]) =>
    newRow(materialId, 'USED', String(quantity)),
  );
};

/**
 * @description 한 번 눌러 추가하는 "최근 쓴 자재" 목록: 기록이 있는 자재 중 최근 순 몇 개 (숨긴 자재 제외)
 * @param materials 최근 순으로 정렬된 자재 목록 (서버 응답 순서)
 * @param limit 보여 줄 개수
 * @returns 최근 쓴 자재
 */
export const recentMaterials = <T extends Pick<Material, 'lastUsedOn' | 'isActive'>>(
  materials: readonly T[],
  limit = 5,
) =>
  materials.filter((material) => material.isActive && material.lastUsedOn !== null).slice(0, limit);
