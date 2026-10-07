import { DEFAULT_COMPANY_SETTINGS } from '@field-note/shared';

import { formatBurnRate, formatManMonths, formatWork } from './formatWork';

const settings = DEFAULT_COMPANY_SETTINGS;

describe('formatWork', () => {
  it('기획서 §9.5 예시: 21.0 MD는 0.95 MM', () => {
    expect(formatWork(480 * 21, settings)).toBe('21.0 MD (168시간)');
    expect(formatManMonths(480 * 21, settings)).toBe('0.95 MM');
  });

  it('시간 방식 회사는 시간을 앞에 보여 준다', () => {
    expect(formatWork(750, { ...settings, workUnitMode: 'HOURS' })).toBe('12.5시간 (1.6 MD)');
  });

  it('소진율은 계획이 있을 때만 계산한다', () => {
    expect(formatBurnRate(480 * 7, 480 * 10, settings)).toBe('70%');
    expect(formatBurnRate(480, null, settings)).toBe('계획 없음');
    expect(formatBurnRate(480, 0, settings)).toBe('계획 없음');
  });
});
