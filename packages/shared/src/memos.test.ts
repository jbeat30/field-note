import { memoCreateSchema, memoListQuerySchema, memoUpdateSchema } from './memos';

describe('메모 입력 검증', () => {
  it('내용만으로 저장할 수 있고 태그는 기타, 앞뒤 공백은 지운다', () => {
    expect(memoCreateSchema.parse({ content: '  철거 일정 확인 ' })).toEqual({
      content: '철거 일정 확인',
      tag: 'OTHER',
    });
  });

  it('빈 내용·너무 긴 내용·모르는 태그·잘못된 날짜를 거부한다', () => {
    for (const body of [
      { content: '   ' },
      { content: '가'.repeat(5001) },
      { content: '가', tag: 'IDEA' },
      { content: '가', memoDate: '내일' },
      { content: '가', projectId: 'abc' },
    ]) {
      expect(memoCreateSchema.safeParse(body).success).toBe(false);
    }
  });

  it('수정은 바꿀 값이 하나는 있어야 하고 프로젝트를 null로 해서 메모함에 되돌릴 수 있다', () => {
    expect(memoUpdateSchema.safeParse({}).success).toBe(false);
    expect(memoUpdateSchema.parse({ projectId: null })).toEqual({ projectId: null });
  });

  it('메모함은 프로젝트 없이, 프로젝트 메모는 프로젝트와 함께만 조회한다', () => {
    const projectId = '018f3b1e-0000-7000-8000-000000000001';

    expect(memoListQuerySchema.safeParse({ scope: 'INBOX' }).success).toBe(true);
    expect(memoListQuerySchema.safeParse({ scope: 'INBOX', projectId }).success).toBe(false);
    expect(memoListQuerySchema.safeParse({ scope: 'PROJECT' }).success).toBe(false);
    expect(
      memoListQuerySchema.parse({ scope: 'PROJECT', projectId, isDone: 'false' }),
    ).toMatchObject({
      isDone: false,
      limit: 50,
    });
  });
});
