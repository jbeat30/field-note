import type { MailMessage } from './mailer';

/**
 * @description 이메일 인증 코드 메일 본문 (텍스트판 포함)
 * 메일에는 개인정보(전화번호 등)를 넣지 않고 코드와 유효 시간만 담는다 (기술 기획서 §11)
 * @param to 받는 사람 주소
 * @param code 6자리 인증 코드
 * @param ttlMinutes 코드 유효 시간(분)
 * @returns 발송할 메일
 */
export const buildVerificationEmail = (
  to: string,
  code: string,
  ttlMinutes: number,
): MailMessage => ({
  to,
  subject: `[field-note] 이메일 인증 코드 ${code}`,
  text: [
    'field-note 이메일 인증 코드입니다.',
    '',
    `인증 코드: ${code}`,
    '',
    `이 코드는 ${ttlMinutes}분 동안만 유효합니다.`,
    '본인이 요청하지 않았다면 이 메일을 무시해 주세요.',
  ].join('\n'),
  html: `<p>field-note 이메일 인증 코드입니다.</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>이 코드는 ${ttlMinutes}분 동안만 유효합니다.</p>
<p>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>`,
});
