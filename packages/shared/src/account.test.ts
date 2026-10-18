import { VALIDATION_MESSAGES } from './errorMessages';
import { passwordSchema } from './account';

describe('비밀번호 정책', () => {
  it.each(['Correct-horse-2026!', 'abcdefghi#', '비밀번호는열글자이상?!', '1234567890!'])(
    '%s 는 통과한다',
    (value) => {
      expect(passwordSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each([
    ['short1!', VALIDATION_MESSAGES.PASSWORD_TOO_SHORT],
    ['1234567890', VALIDATION_MESSAGES.PASSWORD_DIGITS_ONLY],
    ['0000000000000', VALIDATION_MESSAGES.PASSWORD_DIGITS_ONLY],
    ['onlylettersandnumbers123', VALIDATION_MESSAGES.PASSWORD_NEEDS_SYMBOL],
    ['has spaces only 12345', VALIDATION_MESSAGES.PASSWORD_NEEDS_SYMBOL],
    [`${'a'.repeat(72)}!`, VALIDATION_MESSAGES.PASSWORD_TOO_LONG],
  ])('%s 는 거부하고 안내 문구를 준다', (value, message) => {
    const result = passwordSchema.safeParse(value);

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it('숫자만 10자 이상이면 숫자 안내가 가장 먼저 나온다', () => {
    const result = passwordSchema.safeParse('1234567890');

    expect(result.error?.issues[0]?.message).toBe(VALIDATION_MESSAGES.PASSWORD_DIGITS_ONLY);
  });
});
