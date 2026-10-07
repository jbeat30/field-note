import {
  PARTNER_KINDS,
  normalizePartnerName,
  partnerCreateSchema,
  partnerUpdateSchema,
} from './partners';

describe('명부 입력 검증', () => {
  it('구분과 상호만으로 등록할 수 있고 앞뒤 공백은 지운다', () => {
    expect(partnerCreateSchema.parse({ kind: 'CLIENT', name: '  가나다건설 ' })).toEqual({
      kind: 'CLIENT',
      name: '가나다건설',
    });
  });

  it('구분이 없거나 틀리고 상호가 비었거나 연락처 형식이 틀리면 거부한다', () => {
    for (const body of [
      { name: '가나다' },
      { kind: 'VENDOR', name: '가나다' },
      { kind: 'CLIENT', name: '   ' },
      { kind: 'CLIENT', name: '가'.repeat(51) },
      { kind: 'CLIENT', name: '가', phone: '전화' },
      { kind: 'CLIENT', name: '가', contactName: '가'.repeat(31) },
    ]) {
      expect(partnerCreateSchema.safeParse(body).success).toBe(false);
    }
  });

  it('수정에서는 구분을 보낼 수 없고(무시) 바꿀 값이 하나는 있어야 한다', () => {
    expect(partnerUpdateSchema.safeParse({}).success).toBe(false);
    expect(partnerUpdateSchema.parse({ isActive: false, kind: 'SUPPLIER' })).toEqual({
      isActive: false,
    });
  });

  it('공백·대소문자만 다른 상호는 같은 키가 된다', () => {
    expect(normalizePartnerName(' ABC  철강 ')).toBe(normalizePartnerName('abc 철강'));
    expect(PARTNER_KINDS).toHaveLength(3);
  });
});
