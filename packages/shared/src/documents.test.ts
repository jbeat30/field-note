import {
  documentAccessQuerySchema,
  documentCreateSchema,
  documentUpdateSchema,
  documentVersionCreateSchema,
  resolveSensitive,
} from './documents';

const fileId = '018f3b1e-0000-7000-8000-000000000001';

describe('문서 규칙', () => {
  it('문서 종류의 민감 기본값을 따르고 직접 정하면 그 값이 우선한다', () => {
    expect(resolveSensitive(true)).toBe(true);
    expect(resolveSensitive(false)).toBe(false);
    expect(resolveSensitive(true, false)).toBe(false);
    expect(resolveSensitive(false, true)).toBe(true);
  });

  it('파일과 이름과 문서 종류로 문서를 만들 수 있다', () => {
    expect(documentCreateSchema.parse({ fileId, title: ' 시공도 ', categoryId: fileId })).toEqual({
      fileId,
      title: '시공도',
      categoryId: fileId,
    });
  });

  it('이름이 비었거나 길거나, 분류·날짜가 잘못되면 거부한다', () => {
    for (const body of [
      { fileId, title: '   ', categoryId: fileId },
      { fileId, title: '가'.repeat(101), categoryId: fileId },
      { fileId, title: '가', categoryId: 'PHOTO' },
      { fileId, title: '가' },
      { fileId, title: '가', categoryId: fileId, revisionDate: '어제' },
      { fileId, title: '가', categoryId: fileId, reason: '가'.repeat(201) },
      { title: '가', categoryId: fileId },
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
