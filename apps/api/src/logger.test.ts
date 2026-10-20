import { Writable } from 'node:stream';

import { createLogger, REDACT_CENSOR } from './logger';

const captureLog = (log: (logger: ReturnType<typeof createLogger>) => void) => {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });

  log(createLogger('info', stream));

  return JSON.parse(chunks.join('')) as Record<string, unknown>;
};

describe('createLogger', () => {
  it('요청 헤더의 쿠키와 인증 값을 마스킹한다', () => {
    const entry = captureLog((logger) =>
      logger.info({ req: { headers: { cookie: 'sid=abc', authorization: 'Bearer x' } } }, 'test'),
    );

    expect(JSON.stringify(entry)).not.toContain('sid=abc');
    expect(JSON.stringify(entry)).not.toContain('Bearer x');
    expect(JSON.stringify(entry)).toContain(REDACT_CENSOR);
  });

  it('비밀번호·2단계 코드·초대 토큰·아이디를 마스킹한다', () => {
    const entry = captureLog((logger) =>
      logger.info(
        {
          body: {
            newPassword: 'New-secret-2026!',
            currentPassword: 'Old-secret-2026!',
            totpCode: '123456',
            inviteToken: 'invite-token-value',
            loginId: 'hanbit',
            recoveryCodes: ['AAAAA-BBBBB'],
            secret: 'JBSWY3DPEHPK3PXP',
          },
        },
        'test',
      ),
    );
    const text = JSON.stringify(entry);

    for (const secret of [
      'New-secret-2026!',
      'Old-secret-2026!',
      '123456',
      'invite-token-value',
      'hanbit',
      'AAAAA-BBBBB',
      'JBSWY3DPEHPK3PXP',
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it('이름·연락처·메모 본문을 마스킹한다', () => {
    const entry = captureLog((logger) =>
      logger.info({ body: { name: '홍길동', phone: '010-1234-5678', memo: '현장 메모' } }, 'test'),
    );
    const text = JSON.stringify(entry);

    expect(text).not.toContain('홍길동');
    expect(text).not.toContain('010-1234-5678');
    expect(text).not.toContain('현장 메모');
  });

  it('개인정보가 아닌 값은 그대로 남긴다', () => {
    const entry = captureLog((logger) => logger.info({ port: 3000 }, '[api.main] 서버 시작'));

    expect(entry.port).toBe(3000);
    expect(entry.msg).toBe('[api.main] 서버 시작');
  });
});
