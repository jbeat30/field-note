import { filenameFromDisposition } from './exportReport';

describe('내려받기 파일 이름', () => {
  it('한글 파일 이름을 헤더에서 읽는다', () => {
    const header = `attachment; filename*=UTF-8''${encodeURIComponent('작업일보_2026-001_2026-10-01_2026-10-31.xlsx')}`;

    expect(filenameFromDisposition(header, '기본.xlsx')).toBe(
      '작업일보_2026-001_2026-10-01_2026-10-31.xlsx',
    );
  });

  it('헤더가 없거나 형식이 다르거나 깨졌으면 기본 이름을 쓴다', () => {
    expect(filenameFromDisposition(null, '기본.xlsx')).toBe('기본.xlsx');
    expect(filenameFromDisposition('attachment; filename="a.xlsx"', '기본.xlsx')).toBe('기본.xlsx');
    expect(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4%A", '기본.xlsx')).toBe(
      '기본.xlsx',
    );
  });
});
