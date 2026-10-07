import { resolveEmployeeStatus, todayInSeoul } from './employeeRules';

const TODAY = '2026-10-07';

describe('서울 기준 오늘 날짜', () => {
  it('UTC로는 전날이어도 서울 날짜로 계산한다', () => {
    expect(todayInSeoul(new Date('2026-10-06T16:30:00Z'))).toBe('2026-10-07');
    expect(todayInSeoul(new Date('2026-10-06T14:59:00Z'))).toBe('2026-10-06');
  });
});

describe('상태와 퇴사일', () => {
  it('퇴사로 바꾸면 퇴사일이 오늘로 채워진다', () => {
    expect(
      resolveEmployeeStatus({ status: 'ACTIVE', leftOn: null }, { status: 'LEFT' }, TODAY),
    ).toEqual({ ok: true, status: 'LEFT', leftOn: TODAY });
  });

  it('퇴사일을 함께 보내면 그 날짜를 쓴다', () => {
    expect(
      resolveEmployeeStatus(
        { status: 'ACTIVE', leftOn: null },
        { status: 'LEFT', leftOn: '2026-09-30' },
        TODAY,
      ),
    ).toEqual({ ok: true, status: 'LEFT', leftOn: '2026-09-30' });
  });

  it('재입사(재직·휴직으로 변경)하면 퇴사일이 지워지고 같은 카드를 쓴다', () => {
    expect(
      resolveEmployeeStatus({ status: 'LEFT', leftOn: '2026-09-30' }, { status: 'ACTIVE' }, TODAY),
    ).toEqual({ ok: true, status: 'ACTIVE', leftOn: null });
    expect(
      resolveEmployeeStatus(
        { status: 'LEFT', leftOn: '2026-09-30' },
        { status: 'ON_LEAVE' },
        TODAY,
      ),
    ).toEqual({ ok: true, status: 'ON_LEAVE', leftOn: null });
  });

  it('재직·휴직 상태에서 퇴사일만 넣으면 거부한다', () => {
    expect(
      resolveEmployeeStatus({ status: 'ACTIVE', leftOn: null }, { leftOn: '2026-09-30' }, TODAY),
    ).toMatchObject({ ok: false });
    expect(
      resolveEmployeeStatus(
        { status: 'ACTIVE', leftOn: null },
        { status: 'ON_LEAVE', leftOn: '2026-09-30' },
        TODAY,
      ),
    ).toMatchObject({ ok: false });
  });

  it('퇴사 상태에서는 퇴사일을 바꿀 수 있지만 지울 수는 없다', () => {
    expect(
      resolveEmployeeStatus(
        { status: 'LEFT', leftOn: '2026-09-30' },
        { leftOn: '2026-09-28' },
        TODAY,
      ),
    ).toEqual({ ok: true, status: 'LEFT', leftOn: '2026-09-28' });
    expect(
      resolveEmployeeStatus({ status: 'LEFT', leftOn: '2026-09-30' }, { leftOn: null }, TODAY),
    ).toMatchObject({ ok: false });
  });

  it('상태 변경이 없으면 현재 값을 그대로 둔다', () => {
    expect(resolveEmployeeStatus({ status: 'ON_LEAVE', leftOn: null }, {}, TODAY)).toEqual({
      ok: true,
      status: 'ON_LEAVE',
      leftOn: null,
    });
  });

  it('이미 퇴사한 직원을 다시 퇴사로 바꿔도 기존 퇴사일을 유지한다', () => {
    expect(
      resolveEmployeeStatus({ status: 'LEFT', leftOn: '2026-09-30' }, { status: 'LEFT' }, TODAY),
    ).toEqual({ ok: true, status: 'LEFT', leftOn: '2026-09-30' });
  });
});
