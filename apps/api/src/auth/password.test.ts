import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('해시는 평문을 담지 않고 같은 비밀번호도 매번 다르다', async () => {
    const first = await hashPassword('Hanbit-demo-2026!');
    const second = await hashPassword('Hanbit-demo-2026!');

    expect(first).not.toContain('Hanbit');
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
  });

  it('맞는 비밀번호만 통과한다', async () => {
    const hash = await hashPassword('Hanbit-demo-2026!');

    expect(await verifyPassword(hash, 'Hanbit-demo-2026!')).toBe(true);
    expect(await verifyPassword(hash, 'hanbit-demo-2026!')).toBe(false);
  });

  it('깨진 해시는 오류 없이 불일치로 처리한다', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });
});
