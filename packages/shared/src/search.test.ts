import { escapeLike, makeSnippet, searchQuerySchema } from './search';

describe('검색 입력', () => {
  it('검색어 앞뒤 공백을 지우고 개수 기본값은 5개다', () => {
    expect(searchQuerySchema.parse({ q: '  시공도 ' })).toEqual({ q: '시공도', limit: 5 });
  });

  it('빈 검색어·너무 긴 검색어·잘못된 프로젝트·범위를 벗어난 개수를 거부한다', () => {
    for (const query of [
      { q: '   ' },
      { q: '가'.repeat(51) },
      { q: '가', projectId: 'abc' },
      { q: '가', limit: 0 },
      { q: '가', limit: 21 },
    ]) {
      expect(searchQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});

describe('검색 결과 발췌', () => {
  it('검색어가 나온 곳 앞뒤만 잘라 보여 주고 잘린 쪽에 말줄임표를 붙인다', () => {
    const text = `${'앞'.repeat(50)}배관 위치 변경${'뒤'.repeat(50)}`;
    const snippet = makeSnippet(text, '배관');

    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('배관 위치 변경');
    expect(snippet.length).toBeLessThan(text.length);
  });

  it('짧은 글은 그대로이고 대소문자를 가리지 않으며 줄바꿈은 공백이 된다', () => {
    expect(makeSnippet('Zinc 강판\n반입', 'zinc')).toBe('Zinc 강판 반입');
  });

  it('본문에 검색어가 없으면 앞부분을 보여 준다', () => {
    const snippet = makeSnippet('가'.repeat(200), '없는말');

    expect(snippet.startsWith('가')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
});

describe('LIKE 검색어 이스케이프', () => {
  it('퍼센트·밑줄·역슬래시를 일반 글자로 바꾼다', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('A_B')).toBe('A\\_B');
    expect(escapeLike('경로\\폴더')).toBe('경로\\\\폴더');
    expect(escapeLike('배관')).toBe('배관');
  });
});
