export type AccountErrorCode =
  | 'INVITATION_INVALID'
  | 'LOGIN_ID_TAKEN'
  | 'EMAIL_TAKEN'
  | 'CONSENT_REQUIRED'
  | 'CONSENT_UNKNOWN_DOCUMENT'
  | 'INVALID_CREDENTIALS'
  | 'CURRENT_PASSWORD_INVALID'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_NOT_FOUND'
  | 'SOCIAL_NOT_LINKED'
  | 'SOCIAL_ALREADY_LINKED'
  | 'SOCIAL_EMAIL_REQUIRED'
  | 'LAST_LOGIN_METHOD'
  | 'ACCOUNT_CLOSING';

// 업무 규칙 위반 (HTTP 응답으로의 변환은 라우트가 담당)
export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode) {
    super(`[auth.accountService] ${code}`);
  }
}
