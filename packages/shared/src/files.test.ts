import {
  FILE_MAX_BYTES,
  fileExtension,
  fileObjectKey,
  fileUploadRequestSchema,
  isAllowedFileType,
} from './files';

const photo = { name: '현장.jpg', purpose: 'PHOTO', contentType: 'image/jpeg', size: 1000 };

describe('파일 형식 규칙', () => {
  it('확장자는 마지막 점 뒤를 소문자로 돌려준다', () => {
    expect(fileExtension('도면.최종.PDF')).toBe('pdf');
    expect(fileExtension('이름없음')).toBe('');
  });

  it('허용 목록의 형식과 확장자 조합만 통과한다', () => {
    expect(isAllowedFileType('PHOTO', 'image/jpeg', 'a.JPG')).toBe(true);
    expect(isAllowedFileType('DOCUMENT', 'application/pdf', 'a.pdf')).toBe(true);
    // 사진 용도는 문서 형식을 받지 않음
    expect(isAllowedFileType('PHOTO', 'application/pdf', 'a.pdf')).toBe(false);
    // 형식과 확장자가 어긋나면 거부
    expect(isAllowedFileType('PHOTO', 'image/jpeg', 'a.png')).toBe(false);
    // 실행 파일은 목록에 없음
    expect(isAllowedFileType('DOCUMENT', 'application/x-msdownload', 'a.exe')).toBe(false);
  });

  it('객체 키에 회사·프로젝트·파일이 들어간다', () => {
    expect(fileObjectKey('c1', 'p1', 'f1', 'thumbnail')).toBe('company/c1/project/p1/f1/thumbnail');
  });
});

describe('업로드 신청 검증', () => {
  it('허용된 형식과 크기면 통과하고 이름 앞뒤 공백은 지운다', () => {
    expect(fileUploadRequestSchema.parse({ ...photo, name: ' 현장.jpg ' }).name).toBe('현장.jpg');
  });

  it('허용되지 않은 형식·확장자 불일치·큰 파일·빈 파일·경로가 든 이름을 거부한다', () => {
    for (const body of [
      { ...photo, name: '악성.exe', contentType: 'application/x-msdownload' },
      { ...photo, contentType: 'application/pdf' },
      { ...photo, size: FILE_MAX_BYTES.PHOTO + 1 },
      { ...photo, size: 0 },
      { ...photo, name: '../현장.jpg' },
      { ...photo, name: '현\n장.jpg' },
      { ...photo, purpose: 'VIDEO' },
    ]) {
      expect(fileUploadRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});
