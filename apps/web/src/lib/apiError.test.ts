import { getErrorCode, getErrorMessage } from './apiError';

describe('apiError', () => {
  it('서버 오류 코드를 공유 문구로 바꾼다', () => {
    const error = { error: { code: 'INVALID_CREDENTIALS', message: '서버가 준 문구' } };

    expect(getErrorCode(error)).toBe('INVALID_CREDENTIALS');
    expect(getErrorMessage(error)).toBe('아이디 또는 비밀번호가 올바르지 않습니다');
  });

  it('형식이 다른 오류는 일반 문구를 보여주고 내부 내용을 노출하지 않는다', () => {
    expect(getErrorCode({ stack: 'secret' })).toBeUndefined();
    expect(getErrorMessage({ stack: 'secret' })).not.toContain('secret');
    expect(getErrorMessage(undefined)).toContain('일시적인 오류');
  });
});
