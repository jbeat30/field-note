import { createSmtpMailer } from '../src/email/mailer';

// 메일 발송 접속 확인: `pnpm mail:check [받는 주소]`
// 주소 없이 실행하면 서버 연결·TLS·로그인만 확인하고, 주소를 주면 확인용 메일도 한 통 보냄
// 접속 정보는 서버와 같은 환경 변수(SMTP_*)를 읽으며 값은 출력하지 않음
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
  throw new Error('[mail-check] SMTP_HOST, SMTP_PORT, SMTP_FROM 필요');
}

const mailer = createSmtpMailer({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  from: SMTP_FROM,
  user: SMTP_USER,
  password: SMTP_PASSWORD,
});
const [to] = process.argv.slice(2);

try {
  await mailer.verify();
  console.log(`[mail-check] 연결·TLS·로그인 확인 완료 host=${SMTP_HOST} port=${SMTP_PORT}`);

  if (to) {
    await mailer.send({
      to,
      subject: '[현장노트] 메일 발송 확인',
      text: '현장노트 서버의 메일 발송 설정 확인용 메일입니다. 답장하지 않으셔도 됩니다.',
      html: '<p>현장노트 서버의 메일 발송 설정 확인용 메일입니다. 답장하지 않으셔도 됩니다.</p>',
    });
    console.log('[mail-check] 확인 메일 발송 완료 (받은편지함 또는 스팸함을 확인)');
  }
} catch (error) {
  console.error(`[mail-check] 실패: ${(error as Error).message}`);
  process.exitCode = 1;
}
