import nodemailer from 'nodemailer';

import { createSmtpMailer } from './mailer';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail: jest.fn() })) },
}));

const lastOptions = () => {
  const calls = jest.mocked(nodemailer.createTransport).mock.calls;

  return calls[calls.length - 1]![0] as Record<string, unknown>;
};

describe('SMTP 발송기 연결 설정', () => {
  it('계정으로 접속하는 587 포트는 TLS 격상이 안 되면 중단한다', () => {
    createSmtpMailer({
      host: 'smtp.example.com',
      port: 587,
      from: 'a@example.com',
      user: 'u',
      password: 'p',
    });

    expect(lastOptions()).toMatchObject({
      secure: false,
      requireTLS: true,
      tls: { minVersion: 'TLSv1.2' },
    });
  });

  it('465 포트는 처음부터 TLS로 연결한다', () => {
    createSmtpMailer({
      host: 'smtp.example.com',
      port: 465,
      from: 'a@example.com',
      user: 'u',
      password: 'p',
    });

    expect(lastOptions()).toMatchObject({ secure: true, requireTLS: false });
  });

  it('접속 정보가 없는 로컬 수신기는 TLS를 요구하지 않는다', () => {
    createSmtpMailer({ host: 'localhost', port: 1025, from: 'a@example.com' });

    expect(lastOptions()).toMatchObject({ requireTLS: false, auth: undefined });
  });

  it('응답 없는 메일 서버에 오래 붙잡히지 않도록 제한 시간을 둔다', () => {
    createSmtpMailer({ host: 'smtp.example.com', port: 587, from: 'a@example.com' });

    expect(lastOptions()).toMatchObject({
      connectionTimeout: expect.any(Number),
      greetingTimeout: expect.any(Number),
      socketTimeout: expect.any(Number),
    });
  });
});
