import { OPTION_KINDS, normalizeOptionName, optionUpdateSchema, optionNameSchema } from './options';
import { OPTION_PRESETS } from './optionPresets';

describe('이름 비교 키', () => {
  it('공백·대소문자·표기 차이를 같은 이름으로 본다', () => {
    expect(normalizeOptionName('  판금   공 ')).toBe('판금 공');
    expect(normalizeOptionName('CNC')).toBe(normalizeOptionName('cnc'));
    // 자모가 분리된 표기(NFD)도 완성형(NFC)과 같게 취급
    expect(normalizeOptionName('한'.normalize('NFD'))).toBe('한');
  });
});

describe('입력 검증', () => {
  it('앞뒤 공백을 지우고 빈 값과 너무 긴 값은 거부한다', () => {
    expect(optionNameSchema.parse('  설치 ')).toBe('설치');
    expect(optionNameSchema.safeParse('   ').success).toBe(false);
    expect(optionNameSchema.safeParse('가'.repeat(31)).success).toBe(false);
  });

  it('변경 요청에는 바꿀 값이 하나는 있어야 한다', () => {
    expect(optionUpdateSchema.safeParse({}).success).toBe(false);
    expect(optionUpdateSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});

describe('프리셋', () => {
  it('모든 종류에 프리셋이 있고 이름이 겹치지 않는다', () => {
    for (const kind of OPTION_KINDS) {
      const names = OPTION_PRESETS[kind].map(normalizeOptionName);

      expect(names.length).toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
