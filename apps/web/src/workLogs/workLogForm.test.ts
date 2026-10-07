import type { CompanySettings } from '@field-note/shared';

import {
  entriesToLines,
  linesToEntries,
  minutesToValue,
  quickValue,
  valueToMinutes,
  type EntryLine,
} from './workLogForm';

const RATIO: CompanySettings = {
  standardWorkMinutes: 480,
  monthlyWorkDays: 22,
  workUnitMode: 'RATIO',
};
const HOURS: CompanySettings = {
  standardWorkMinutes: 480,
  monthlyWorkDays: 22,
  workUnitMode: 'HOURS',
};
const A = '0198d000-0000-7000-8000-000000000001';
const C1 = '0198d000-0000-7000-8000-0000000000c1';
const C2 = '0198d000-0000-7000-8000-0000000000c2';
const NAMES = new Map([[A, '김작업']]);

const line = (patch: Partial<EntryLine> = {}): EntryLine => ({
  key: 'k',
  employeeId: A,
  categoryId: C1,
  value: '1',
  included: true,
  ...patch,
});

describe('공수 입력 값과 분 변환', () => {
  it('비율 방식은 MD로, 시간 방식은 시간으로 입력하고 분으로 저장한다 (연장 1.5는 12시간)', () => {
    expect(valueToMinutes('1', RATIO)).toBe(480);
    expect(valueToMinutes('1.5', RATIO)).toBe(720);
    expect(valueToMinutes('0.5', RATIO)).toBe(240);
    expect(valueToMinutes('8', HOURS)).toBe(480);
    expect(valueToMinutes('12', HOURS)).toBe(720);
    expect(valueToMinutes('7.5', HOURS)).toBe(450);
  });

  it('분을 입력 값으로 되돌리면 소수 오차 없이 같은 값이다', () => {
    expect(minutesToValue(720, RATIO)).toBe('1.5');
    expect(minutesToValue(450, HOURS)).toBe('7.5');
    expect(valueToMinutes(minutesToValue(485, RATIO), RATIO)).toBe(485);
  });

  it('비었거나 0 이하이거나 숫자가 아니면 null이다', () => {
    for (const value of ['', '   ', '0', '-1', 'abc', '1e']) {
      expect(valueToMinutes(value, RATIO)).toBeNull();
    }
  });

  it('빠른 선택 값은 하루 기준시간의 배수다 (기준시간 9시간 회사도 같은 비율)', () => {
    expect(quickValue(0.5, RATIO)).toBe('0.5');
    expect(quickValue(1.5, RATIO)).toBe('1.5');
    expect(quickValue(1, HOURS)).toBe('8');
    expect(quickValue(1.5, { ...HOURS, standardWorkMinutes: 540 })).toBe('13.5');
  });
});

describe('입력 줄 ↔ 서버 항목', () => {
  it('서버 항목을 줄로 바꾸고 다시 항목으로 바꾸면 같다', () => {
    const entries = [{ employeeId: A, categoryId: C1, minutes: 720 }];

    expect(linesToEntries(entriesToLines(entries, RATIO), RATIO, NAMES)).toEqual({
      ok: true,
      entries,
    });
  });

  it('체크를 해제한 줄(결근)은 보내지 않는다', () => {
    expect(
      linesToEntries([line({ included: false }), line({ categoryId: C2 })], RATIO, NAMES),
    ).toEqual({
      ok: true,
      entries: [{ employeeId: A, categoryId: C2, minutes: 480 }],
    });
  });

  it('작업 구분이 없거나 공수가 잘못된 줄은 직원 이름과 함께 알려 준다', () => {
    expect(linesToEntries([line({ categoryId: '' })], RATIO, NAMES)).toEqual({
      ok: false,
      message: '김작업님의 작업 구분을 선택해 주세요',
    });
    expect(linesToEntries([line({ value: '0' })], RATIO, NAMES)).toMatchObject({
      ok: false,
      message: expect.stringContaining('김작업님의 공수(MD)'),
    });
    expect(linesToEntries([line({ value: '25' })], HOURS, NAMES)).toMatchObject({
      ok: false,
      message: expect.stringContaining('24시간'),
    });
  });

  it('같은 직원·작업 구분이 두 줄이면 거부하고 작업 구분이 다르면 나눠 입력할 수 있다', () => {
    expect(linesToEntries([line(), line({ key: 'k2' })], RATIO, NAMES)).toMatchObject({
      ok: false,
    });
    expect(
      linesToEntries(
        [line({ value: '0.5' }), line({ key: 'k2', categoryId: C2, value: '0.5' })],
        RATIO,
        NAMES,
      ),
    ).toEqual({
      ok: true,
      entries: [
        { employeeId: A, categoryId: C1, minutes: 240 },
        { employeeId: A, categoryId: C2, minutes: 240 },
      ],
    });
  });

  it('체크한 줄이 하나도 없으면 빈 항목이다 (임시 저장은 가능)', () => {
    expect(linesToEntries([line({ included: false })], RATIO, NAMES)).toEqual({
      ok: true,
      entries: [],
    });
  });
});
