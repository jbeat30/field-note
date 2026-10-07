import { addDays, formatDay } from './dates';

describe('날짜 계산', () => {
  it('달·해 경계를 넘어 더하고 뺀다', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('요일과 함께 표시한다', () => {
    expect(formatDay('2026-10-07')).toBe('10월 7일 (수)');
  });
});
