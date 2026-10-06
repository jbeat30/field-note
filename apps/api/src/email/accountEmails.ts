import type { MailMessage } from './mailer';

/**
 * @description 비밀번호 재설정 링크 메일 (본문에 개인정보 없음)
 * @param to 받는 주소
 * @param link 재설정 링크 (토큰 원문은 이 링크에만 담김)
 * @param ttlMinutes 링크 유효 시간(분)
 * @returns 발송할 메일
 */
export const buildPasswordResetEmail = (
  to: string,
  link: string,
  ttlMinutes: number,
): MailMessage => ({
  to,
  subject: '[field-note] 비밀번호 재설정 안내',
  text: [
    '비밀번호 재설정을 요청하셨습니다.',
    '',
    `아래 링크에서 새 비밀번호를 설정해 주세요. 링크는 ${ttlMinutes}분 동안, 한 번만 사용할 수 있습니다.`,
    link,
    '',
    '본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 바뀌지 않습니다.',
  ].join('\n'),
  html: `<p>비밀번호 재설정을 요청하셨습니다.</p>
<p>아래 링크에서 새 비밀번호를 설정해 주세요. 링크는 ${ttlMinutes}분 동안, 한 번만 사용할 수 있습니다.</p>
<p><a href="${link}">비밀번호 재설정하기</a></p>
<p>본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 바뀌지 않습니다.</p>`,
});

export type SecurityNoticeKind = 'PASSWORD_CHANGED' | 'PASSWORD_RESET_DONE' | 'EMAIL_CHANGED';

const NOTICES: Record<SecurityNoticeKind, { subject: string; lines: (hint?: string) => string[] }> =
  {
    PASSWORD_CHANGED: {
      subject: '[field-note] 비밀번호가 변경되었습니다',
      lines: () => [
        '계정의 비밀번호가 변경되었습니다.',
        '다른 기기의 로그인은 모두 해제되었습니다.',
      ],
    },
    PASSWORD_RESET_DONE: {
      subject: '[field-note] 비밀번호가 재설정되었습니다',
      lines: () => [
        '비밀번호 재설정이 완료되었습니다.',
        '모든 기기의 로그인이 해제되었습니다. 새 비밀번호로 다시 로그인해 주세요.',
      ],
    },
    EMAIL_CHANGED: {
      subject: '[field-note] 계정 이메일이 변경되었습니다',
      lines: (hint) => [
        `계정의 이메일이 ${hint ?? '새 주소'}(으)로 변경되었습니다.`,
        '이 주소로는 더 이상 인증 코드와 안내 메일이 오지 않습니다.',
      ],
    },
  };

/**
 * @description 계정 보안 변경 알림 메일 (본인이 하지 않은 변경을 알아차리게 하는 용도)
 * @param kind 변경 종류
 * @param to 받는 주소
 * @param hint 새 주소를 일부만 가린 표시 (이메일 변경 시에만)
 * @returns 발송할 메일
 */
export const buildSecurityNoticeEmail = (
  kind: SecurityNoticeKind,
  to: string,
  hint?: string,
): MailMessage => {
  const notice = NOTICES[kind];
  const lines = [
    ...notice.lines(hint),
    '',
    '본인이 한 변경이 아니라면 즉시 운영자에게 연락해 주세요.',
  ];

  return {
    to,
    subject: notice.subject,
    text: lines.join('\n'),
    html: lines.map((line) => (line ? `<p>${line}</p>` : '')).join('\n'),
  };
};

/**
 * @description 이메일 주소를 일부 가려 표시 (알림 메일에서 새 주소 전체를 노출하지 않기 위함)
 * @param email 이메일 주소
 * @returns 예: ab***@example.com
 */
export const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');

  return `${local.slice(0, 2)}***@${domain}`;
};
