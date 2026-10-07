import {
  hoursToMinutes,
  manDaysToMinutes,
  minutesToHours,
  minutesToManDays,
  roundTo,
  type CompanySettings,
  type WorkLogEntry,
} from '@field-note/shared';

// 일지 입력 폼의 한 줄: 직원 × 작업 구분 × 공수. 입력 칸은 회사의 공수 입력 방식(비율 MD·시간)으로 다루고, 저장은 분으로 한다
export type EntryLine = {
  // 화면에서 줄을 구분하는 값 (서버 값이 아님)
  key: string;
  employeeId: string;
  categoryId: string;
  // 입력 칸의 값 (비율이면 MD, 시간이면 시간)
  value: string;
  // 체크를 해제하면 결근·미작업으로 보고 저장하지 않음
  included: boolean;
};

let sequence = 0;

export const newLineKey = () => {
  sequence += 1;

  return `line-${sequence}`;
};

export const unitLabel = (settings: CompanySettings) =>
  settings.workUnitMode === 'HOURS' ? '시간' : 'MD';

/**
 * @description 분을 입력 칸의 값으로 바꿈 (비율 방식이면 MD, 시간 방식이면 시간)
 * @param minutes 공수(분)
 * @param settings 회사 설정
 * @returns 입력 칸에 넣을 문자열
 */
export const minutesToValue = (minutes: number, settings: CompanySettings) =>
  String(
    settings.workUnitMode === 'HOURS'
      ? roundTo(minutesToHours(minutes), 2)
      : roundTo(minutesToManDays(minutes, settings.standardWorkMinutes), 2),
  );

/**
 * @description 입력 칸의 값을 분으로 바꿈
 * @param value 입력 칸의 문자열
 * @param settings 회사 설정
 * @returns 정수 분, 올바르지 않은 값(비었거나 0 이하·숫자 아님)이면 null
 */
export const valueToMinutes = (value: string, settings: CompanySettings) => {
  const number = Number(value);

  if (value.trim() === '' || !Number.isFinite(number) || number <= 0) {
    return null;
  }

  return settings.workUnitMode === 'HOURS'
    ? hoursToMinutes(number)
    : manDaysToMinutes(number, settings.standardWorkMinutes);
};

// 빠른 선택 버튼: 하루 기준시간의 배수 (반일 0.5, 하루 1.0, 연장 1.5)
export const QUICK_MULTIPLIERS = [
  { label: '반일', multiplier: 0.5 },
  { label: '하루', multiplier: 1 },
  { label: '연장', multiplier: 1.5 },
] as const;

export const quickValue = (multiplier: number, settings: CompanySettings) =>
  minutesToValue(Math.round(settings.standardWorkMinutes * multiplier), settings);

/**
 * @description 서버의 공수 항목을 입력 줄로 바꿈
 * @param entries 서버 항목
 * @param settings 회사 설정
 * @returns 입력 줄
 */
export const entriesToLines = (
  entries: readonly WorkLogEntry[],
  settings: CompanySettings,
): EntryLine[] =>
  entries.map((entry) => ({
    key: newLineKey(),
    employeeId: entry.employeeId,
    categoryId: entry.categoryId,
    value: minutesToValue(entry.minutes, settings),
    included: true,
  }));

export type LinesResult = { ok: true; entries: WorkLogEntry[] } | { ok: false; message: string };

/**
 * @description 입력 줄을 서버로 보낼 항목으로 바꿈: 체크한 줄만, 작업 구분과 공수가 있어야 하고 같은 직원·작업 구분이 겹치면 안 됨
 * @param lines 입력 줄
 * @param settings 회사 설정
 * @param names 직원 id → 이름 (오류 문구용)
 * @returns 변환한 항목 또는 어느 줄이 왜 안 되는지
 */
export const linesToEntries = (
  lines: readonly EntryLine[],
  settings: CompanySettings,
  names: ReadonlyMap<string, string>,
): LinesResult => {
  const entries: WorkLogEntry[] = [];
  const seen = new Set<string>();

  for (const line of lines.filter((item) => item.included)) {
    const who = names.get(line.employeeId) ?? '직원';

    if (!line.categoryId) {
      return { ok: false, message: `${who}님의 작업 구분을 선택해 주세요` };
    }

    const minutes = valueToMinutes(line.value, settings);

    if (minutes === null) {
      return {
        ok: false,
        message: `${who}님의 공수(${unitLabel(settings)})를 0보다 큰 숫자로 입력해 주세요`,
      };
    }

    if (minutes > 1440) {
      return { ok: false, message: `${who}님의 공수가 하루 24시간을 넘습니다` };
    }

    const key = `${line.employeeId}:${line.categoryId}`;

    if (seen.has(key)) {
      return {
        ok: false,
        message: `${who}님에게 같은 작업 구분이 두 번 있습니다. 하나로 합쳐 주세요`,
      };
    }

    seen.add(key);
    entries.push({ employeeId: line.employeeId, categoryId: line.categoryId, minutes });
  }

  return { ok: true, entries };
};
