import {
  burnRate,
  estimateRequiredManDays,
  hoursToMinutes,
  materialRemaining,
  minutesToHours,
  minutesToManDays,
  manDaysToMinutes,
  roundTo,
  sumManDays,
  toManMonths,
} from './workUnits';

// 기준시간 8시간, 월 기준일수 22일 (서비스 기획서 §9.5 예시와 같은 설정)
const STANDARD = 480;
const MONTHLY_DAYS = 22;

describe('시간과 분 변환', () => {
  it('0.5시간 단위도 소수 오차 없이 정수 분이 된다', () => {
    expect(hoursToMinutes(8)).toBe(480);
    expect(hoursToMinutes(7.5)).toBe(450);
    expect(hoursToMinutes(0.1 + 0.2)).toBe(18);
    expect(minutesToHours(450)).toBe(7.5);
  });
});

describe('공수(MD) 변환', () => {
  it('비율을 기준시간으로 환산해 분으로 저장한다 (1.5는 8시간 기준 12시간)', () => {
    expect(manDaysToMinutes(1, STANDARD)).toBe(480);
    expect(manDaysToMinutes(1.5, STANDARD)).toBe(720);
    expect(manDaysToMinutes(0.5, STANDARD)).toBe(240);
  });

  it('기준시간이 달라도 같은 비율이면 같은 공수다', () => {
    expect(manDaysToMinutes(1.5, 420)).toBe(630);
    expect(minutesToManDays(630, 420)).toBe(1.5);
  });

  it('시간 입력(8시간 + 4시간)은 같은 12시간으로 1.5 공수가 된다', () => {
    expect(minutesToManDays(hoursToMinutes(8) + hoursToMinutes(4), STANDARD)).toBe(1.5);
  });

  it('기준시간을 나중에 바꿔도 저장된 분은 변하지 않고 공수만 다시 계산된다', () => {
    const stored = manDaysToMinutes(1, STANDARD);

    expect(minutesToManDays(stored, STANDARD)).toBe(1);
    expect(minutesToManDays(stored, 420)).toBeCloseTo(1.142857, 5);
  });

  it('기준시간이 0 이하이면 오류다', () => {
    expect(() => minutesToManDays(480, 0)).toThrow('기준시간');
    expect(() => manDaysToMinutes(1, -1)).toThrow('기준시간');
  });
});

describe('서비스 기획서 §9.5 예시: 한 달 20일 투입 중 연장 2일(1.5)', () => {
  const days = [
    ...Array.from({ length: 18 }, () => manDaysToMinutes(1, STANDARD)),
    ...Array.from({ length: 2 }, () => manDaysToMinutes(1.5, STANDARD)),
  ];

  it('MD는 21.0이다', () => {
    expect(sumManDays(days, STANDARD)).toBe(21);
  });

  it('MM는 약 0.95다', () => {
    expect(roundTo(toManMonths(sumManDays(days, STANDARD), MONTHLY_DAYS), 2)).toBe(0.95);
  });

  it('분을 먼저 합산해 나눠서 0.1 같은 값이 쌓여도 오차가 없다', () => {
    const tenths = Array.from({ length: 10 }, () => manDaysToMinutes(0.1, STANDARD));

    expect(sumManDays(tenths, STANDARD)).toBe(1);
  });

  it('월 기준일수가 0 이하이면 오류다', () => {
    expect(() => toManMonths(21, 0)).toThrow('월 기준일수');
  });
});

describe('서비스 기획서 §10.4 예시: 계획 80MD, 투입 56MD, 진행률 45%', () => {
  it('공수 소진율은 70%다', () => {
    expect(burnRate(56, 80)).toBe(0.7);
  });

  it('계획 공수가 없으면 소진율을 계산하지 않는다', () => {
    expect(burnRate(56, 0)).toBeNull();
  });

  it('현재 속도로 끝내려면 약 124MD가 필요하다', () => {
    expect(roundTo(estimateRequiredManDays(56, 0.45) ?? 0, 0)).toBe(124);
  });

  it('진행률이 0이면 필요 공수를 추정하지 않는다', () => {
    expect(estimateRequiredManDays(56, 0)).toBeNull();
  });

  it('진행률이 100%이면 투입한 공수가 그대로 총 공수다', () => {
    expect(estimateRequiredManDays(56, 1)).toBe(56);
  });
});

describe('서비스 기획서 §11 예시: 아연도강판 반입 100, 사용 72, 반출 10, 폐기 3', () => {
  it('잔량은 15장이다', () => {
    expect(materialRemaining({ received: 100, used: 72, returned: 10, discarded: 3 })).toBe(15);
  });

  it('소수 수량도 오차 없이 계산한다 (0.1 + 0.2 문제)', () => {
    expect(materialRemaining({ received: 0.3, used: 0.1, returned: 0.1, discarded: 0 })).toBe(0.1);
  });

  it('잔량이 음수가 되면 그대로 보여 입력 오류를 알 수 있게 한다', () => {
    expect(materialRemaining({ received: 10, used: 12, returned: 0, discarded: 0 })).toBe(-2);
  });
});

describe('반올림', () => {
  it('지정한 자리까지 반올림한다', () => {
    expect(roundTo(0.954545, 2)).toBe(0.95);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(123.7, 0)).toBe(124);
  });
});
