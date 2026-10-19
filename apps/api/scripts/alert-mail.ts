import { createSmtpMailer } from '../src/email/mailer';

// 점검 작업 실패 알림 메일: `echo "본문" | pnpm alert:mail "제목"`
// 받는 사람은 ALERT_MAIL_TO, 보내는 접속 정보는 서버와 같은 SMTP_* 환경 변수
// 받는 주소가 없거나 채워지지 않았으면 보내지 않고 알려 주기만 함 (알림이 없어도 작업 결과는 로그에 남음)
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ALERT_MAIL_TO } = process.env;
const [subject] = process.argv.slice(2);
const MAX_BODY_LENGTH = 4000;

if (!subject) {
  throw new Error('사용법: echo "본문" | pnpm alert:mail "제목"');
}

if (!ALERT_MAIL_TO || /[<>]/.test(ALERT_MAIL_TO)) {
  console.error('[alert-mail] ALERT_MAIL_TO가 없어 알림 메일을 보내지 않음');
  process.exit(0);
}

if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
  throw new Error('[alert-mail] SMTP_HOST, SMTP_PORT, SMTP_FROM 필요');
}

const readStdin = async () => {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }

  return Buffer.concat(chunks).toString('utf8');
};

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const body = (process.stdin.isTTY ? '' : await readStdin()).slice(-MAX_BODY_LENGTH);
const mailer = createSmtpMailer({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  from: SMTP_FROM,
  user: SMTP_USER,
  password: SMTP_PASSWORD,
});

try {
  await mailer.send({
    to: ALERT_MAIL_TO,
    subject,
    text: body || subject,
    html: `<pre>${escapeHtml(body || subject)}</pre>`,
  });
  console.log('[alert-mail] 알림 메일 발송 완료');
} catch (error) {
  console.error(`[alert-mail] 발송 실패: ${(error as Error).message}`);
  process.exitCode = 1;
}
