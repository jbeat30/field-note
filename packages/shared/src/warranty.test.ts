import {
  addMonths,
  computeWarrantyEnd,
  resolveWarrantyUpdate,
  warrantyCertificateUpdateSchema,
  warrantyDaysLeft,
  warrantyProjectCheck,
  warrantyUpdateSchema,
} from './warranty';

describe('addMonths', () => {
  it('개월 수를 더하고 말일은 해당 달 말일로 맞춘다', () => {
    expect(addMonths('2026-03-12', 12)).toBe('2027-03-12');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2026-12-15', 24)).toBe('2028-12-15');
  });
});

describe('computeWarrantyEnd·warrantyDaysLeft', () => {
  it('종료 예정일은 시작일 + 기간이고 기간 0이면 시작일과 같다', () => {
    expect(computeWarrantyEnd('2026-03-12', 12)).toBe('2027-03-12');
    expect(computeWarrantyEnd('2026-03-12', 0)).toBe('2026-03-12');
  });

  it('남은 일수는 종료 예정일 당일 0, 지나면 음수다', () => {
    expect(warrantyDaysLeft('2026-10-12', '2026-10-12')).toBe(0);
    expect(warrantyDaysLeft('2026-10-20', '2026-10-12')).toBe(8);
    expect(warrantyDaysLeft('2026-10-10', '2026-10-12')).toBe(-2);
  });
});

describe('warrantyProjectCheck', () => {
  it('완료·보증 중에만 설정할 수 있다', () => {
    expect(warrantyProjectCheck('COMPLETED').ok).toBe(true);
    expect(warrantyProjectCheck('WARRANTY').ok).toBe(true);
    expect(warrantyProjectCheck('CLOSED')).toMatchObject({ ok: false });
    expect(warrantyProjectCheck('IN_PROGRESS')).toMatchObject({ ok: false });
  });
});

describe('resolveWarrantyUpdate', () => {
  const base = { months: 12, startBasis: 'ACTUAL_END' as const };

  it('실제 완료일 기준은 완료일에서 기간을 더한다', () => {
    expect(
      resolveWarrantyUpdate({ input: base, actualEnd: '2026-03-12', hasRecord: false }),
    ).toEqual({ ok: true, startOn: '2026-03-12', endOn: '2027-03-12', reason: null });
  });

  it('검수일·직접 지정은 시작일을 입력해야 한다', () => {
    expect(
      resolveWarrantyUpdate({
        input: { ...base, startBasis: 'INSPECTION' },
        actualEnd: '2026-03-12',
        hasRecord: false,
      }),
    ).toMatchObject({ ok: false, path: 'startOn' });
    expect(
      resolveWarrantyUpdate({
        input: { ...base, startBasis: 'INSPECTION', startOn: '2026-03-20' },
        actualEnd: '2026-03-12',
        hasRecord: false,
      }),
    ).toMatchObject({ ok: true, startOn: '2026-03-20', endOn: '2027-03-20' });
  });

  it('기간 0은 보증 없음이라 종료 예정일이 시작일과 같고 직접 정한 종료일은 무시한다', () => {
    expect(
      resolveWarrantyUpdate({
        input: { ...base, months: 0, endOn: '2030-01-01' },
        actualEnd: '2026-03-12',
        hasRecord: false,
      }),
    ).toMatchObject({ ok: true, endOn: '2026-03-12' });
  });

  it('종료 예정일을 직접 바꾸면 사유가 필수이고 시작일보다 빠를 수 없다', () => {
    const input = { ...base, endOn: '2027-09-12' };

    expect(
      resolveWarrantyUpdate({ input, actualEnd: '2026-03-12', hasRecord: false }),
    ).toMatchObject({ ok: false, path: 'reason' });
    expect(
      resolveWarrantyUpdate({
        input: { ...input, reason: ' 재보수로 연장 ' },
        actualEnd: '2026-03-12',
        hasRecord: false,
      }),
    ).toEqual({ ok: true, startOn: '2026-03-12', endOn: '2027-09-12', reason: '재보수로 연장' });
    expect(
      resolveWarrantyUpdate({
        input: { ...base, endOn: '2026-03-01', reason: '오타' },
        actualEnd: '2026-03-12',
        hasRecord: false,
      }),
    ).toMatchObject({ ok: false, path: 'endOn' });
  });

  it('이미 설정이 있으면 바꿀 때 사유가 필수이다', () => {
    expect(
      resolveWarrantyUpdate({ input: base, actualEnd: '2026-03-12', hasRecord: true }),
    ).toMatchObject({ ok: false, path: 'reason' });
  });

  it('실제 완료일이 없으면 완료일 기준 시작일을 정할 수 없다', () => {
    expect(resolveWarrantyUpdate({ input: base, actualEnd: null, hasRecord: false })).toMatchObject(
      {
        ok: false,
        path: 'startOn',
      },
    );
  });
});

describe('스키마', () => {
  it('보증 기간은 0~120 정수다', () => {
    const ok = { months: 12, startBasis: 'ACTUAL_END' };

    expect(warrantyUpdateSchema.safeParse(ok).success).toBe(true);
    expect(warrantyUpdateSchema.safeParse({ ...ok, months: -1 }).success).toBe(false);
    expect(warrantyUpdateSchema.safeParse({ ...ok, months: 121 }).success).toBe(false);
    expect(warrantyUpdateSchema.safeParse({ ...ok, months: 1.5 }).success).toBe(false);
  });

  it('보증서 수정은 바꿀 값이 하나는 있어야 한다', () => {
    expect(warrantyCertificateUpdateSchema.safeParse({}).success).toBe(false);
    expect(warrantyCertificateUpdateSchema.safeParse({ expiresOn: '2027-01-01' }).success).toBe(
      true,
    );
  });
});
