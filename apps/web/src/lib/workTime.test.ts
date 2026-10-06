import { hoursToMinutes, minutesToHours } from './workTime';

describe('workTime', () => {
  it('시간과 분을 오차 없이 오간다', () => {
    expect(hoursToMinutes(8)).toBe(480);
    expect(hoursToMinutes(7.5)).toBe(450);
    expect(minutesToHours(540)).toBe(9);
  });

  it('소수 오차가 생기는 입력도 정수 분으로 저장한다', () => {
    expect(hoursToMinutes(0.1 + 0.2)).toBe(18);
    expect(Number.isInteger(hoursToMinutes(8.333))).toBe(true);
  });
});
