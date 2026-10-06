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
 * @description SMTP 메일 발송기 (nodemailer). 로컬은 Mailpit, 운영은 메일 발송 서비스의 SMTP
 * 465 포트는 TLS 직접 연결, 그 외는 서버가 지원할 때 STARTTLS로 격상
 * @param options 접속 정보와 발신 주소
 * @returns 메일 발송기
 */
export const createSmtpMailer = (options: MailerOptions): Mailer => {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.port === 465,
    auth:
      options.user && options.password ? { user: options.user, pass: options.password } : undefined,
  });

  return {
    send: async (message) => {
      await transport.sendMail({ from: options.from, ...message });
    },
  };
};

/**
 * @description 메모리 메일 발송기 (테스트용). 보낸 메일을 기록만 함
 * @returns 발송기와 보낸 메일 목록
 */
export const createMemoryMailer = () => {
  const sent: MailMessage[] = [];

  return {
    mailer: { send: async (message) => void sent.push(message) } satisfies Mailer,
    sent,
  };
};
