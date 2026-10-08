import { documentContentType, titleFromFileName } from './documentFile';

describe('문서 파일', () => {
  it('확장자로 문서 형식을 정하고 대소문자를 가리지 않는다', () => {
    expect(documentContentType('시공도.PDF')).toBe('application/pdf');
    expect(documentContentType('현장.jpg')).toBe('image/jpeg');
    expect(documentContentType('견적.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('허용되지 않은 확장자는 null이다', () => {
    for (const name of ['설치.exe', '도면.dwg', '압축.zip', '이름없음']) {
      expect(documentContentType(name)).toBeNull();
    }
  });

  it('문서 이름 제안은 마지막 확장자만 빼고 비면 원래 이름을 쓴다', () => {
    expect(titleFromFileName('1층 시공도.최종.pdf')).toBe('1층 시공도.최종');
    expect(titleFromFileName('.pdf')).toBe('.pdf');
    expect(titleFromFileName('이름없음')).toBe('이름없음');
  });
});
