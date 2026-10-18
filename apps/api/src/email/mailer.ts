import nodemailer from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// 메일 발송 추상화: 업무 코드는 SMTP 세부를 모름 (공급자는 접속 정보로만 교체)
export type Mailer = {
  send: (message: MailMessage) => Promise<void>;
};

export type MailerOptions = {
  host: string;
  port: number;
  from: string;
  // 운영 메일 서비스는 계정 필요, 로컬 Mailpit은 없음
  user?: string;
  password?: string;
};

/**
 * @description SMTP 메일 발송기 (nodemailer), 로컬은 Mailpit, 운영은 메일 발송 서비스의 SMTP
 * 465 포트는 TLS 직접 연결, 그 외는 서버가 지원할 때 STARTTLS로 격상
 * @param options 접속 정보와 발신 주소
 * @returns 메일 발송기
 */
export const createSmtpMailer = (options: MailerOptions): Mailer => {
  const hasAuth = Boolean(options.user && options.password);
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.port === 465,
    // 계정 정보를 보내는 연결은 TLS가 반드시 있어야 함 (격상이 안 되면 중단해 평문으로 보내지 않음), 접속 정보가 없는 로컬 수신기는 제외
    requireTLS: hasAuth && options.port !== 465,
    tls: { minVersion: 'TLSv1.2' },
    // 메일 서버가 응답하지 않아도 작업 처리기가 오래 붙잡히지 않게 함 (실패하면 작업 큐가 다시 시도)
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    auth: hasAuth ? { user: options.user, pass: options.password } : undefined,
  });

  return {
    send: async (message) => {
      await transport.sendMail({ from: options.from, ...message });
    },
  };
};

/**
 * @description 메모리 메일 발송기 (테스트용), 보낸 메일을 기록만 함
 * @returns 발송기와 보낸 메일 목록
 */
export const createMemoryMailer = () => {
  const sent: MailMessage[] = [];

  return {
    mailer: { send: async (message) => void sent.push(message) } satisfies Mailer,
    sent,
  };
};
