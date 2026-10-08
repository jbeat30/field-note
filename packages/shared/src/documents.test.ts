import {
  documentAccessQuerySchema,
  documentCreateSchema,
  documentUpdateSchema,
  documentVersionCreateSchema,
  resolveSensitive,
} from './documents';

const fileId = '018f3b1e-0000-7000-8000-000000000001';

describe('문서 규칙', () => {
  it('계약·행정은 기본적으로 민감 자료이고 직접 정하면 그 값을 따른다', () => {
    expect(resolveSensitive('CONTRACT')).toBe(true);
    expect(resolveSensitive('DRAWING')).toBe(false);
    expect(resolveSensitive('CONTRACT', false)).toBe(false);
    expect(resolveSensitive('DRAWING', true)).toBe(true);
  });

  it('파일과 이름만으로 문서를 만들 수 있고 분류는 기타', () => {
    expect(documentCreateSchema.parse({ fileId, title: ' 시공도 ' })).toEqual({
      fileId,
      title: '시공도',
      category: 'OTHER',
    });
  });

  it('이름이 비었거나 길거나, 분류·날짜가 잘못되면 거부한다', () => {
    for (const body of [
      { fileId, title: '   ' },
      { fileId, title: '가'.repeat(101) },
      { fileId, title: '가', category: 'PHOTO' },
      { fileId, title: '가', revisionDate: '어제' },
      { fileId, title: '가', reason: '가'.repeat(201) },
      { title: '가' },
    ]) {
      expect(documentCreateSchema.safeParse(body).success).toBe(false);
    }
  });

  it('새 버전은 파일만으로 올릴 수 있고 수정은 바꿀 값이 하나는 있어야 한다', () => {
    expect(documentVersionCreateSchema.safeParse({ fileId }).success).toBe(true);
    expect(documentUpdateSchema.safeParse({}).success).toBe(false);
    expect(documentUpdateSchema.parse({ isPinned: true })).toEqual({ isPinned: true });
  });

  it('열람 방식은 기본이 바로 열기이고 모르는 값은 거부한다', () => {
    expect(documentAccessQuerySchema.parse({}).mode).toBe('view');
    expect(documentAccessQuerySchema.safeParse({ mode: 'print' }).success).toBe(false);
  });
});
