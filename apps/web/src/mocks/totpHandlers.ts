import {
  TOTP_RECOVERY_CODE_COUNT,
  VALIDATION_MESSAGES,
  totpDisableSchema,
  totpEnableSchema,
  totpRecoveryRegenerateSchema,
  type ErrorCode,
} from '@field-note/shared';
import { http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import { MOCK_TOTP_CODE, MOCK_TOTP_SECRET, type MockAccount } from './data';
import { mockDelay } from './latency';
import { getCurrentAccount, saveMockTotp } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
  hasCsrfHeader: (request: Request) => boolean;
};

const normalize = (code: string) => code.replace(/[\s-]/g, '').toUpperCase();

// 발급 차례마다 다른 모양의 시연용 복구 코드 (실제는 무작위)
let batch = 0;

const newRecoveryCodes = () => {
  batch += 1;

  return Array.from(
    { length: TOTP_RECOVERY_CODE_COUNT },
    (_, index) => `RC${batch}${index}XY-9K${index}${batch}ZW`,
  );
};

/**
 * @description 2단계 인증이 켜진 시연 계정인지
 * @param account 시연 계정
 * @returns 켜졌으면 true
 */
export const isMockTotpEnabled = (account: MockAccount | undefined) =>
  account?.totp?.isEnabled === true;

/**
 * @description 인증 코드(고정 값) 또는 복구 코드(한 번만) 확인
 * @param account 시연 계정
 * @param code 입력한 코드
 * @returns 맞으면 true (복구 코드는 맞는 즉시 소모)
 */
export const verifyMockTotp = (account: MockAccount, code: string) => {
  const input = code.trim();

  if (input === MOCK_TOTP_CODE) {
    return true;
  }

  const totp = account.totp;
  const found = totp?.recoveryCodes.find((recovery) => normalize(recovery) === normalize(input));

  if (!totp || !found) {
    return false;
  }

  saveMockTotp(account, {
    ...totp,
    recoveryCodes: totp.recoveryCodes.filter((recovery) => recovery !== found),
  });

  return true;
};

/**
 * @description 2단계 인증 설정 API 목업 (실제 서버와 같은 규칙, 인증 코드는 MOCK_TOTP_CODE)
 * @param helpers 오류 응답·본문 검증 도우미
 * @returns 요청 핸들러 목록
 */
export const createTotpHandlers = ({ apiError, parseBody, hasCsrfHeader }: Helpers) => {
  const reject = (message: string) => apiError('VALIDATION_ERROR', [{ path: 'body', message }]);

  return [
    http.get('/api/v1/me/totp', async () => {
      await mockDelay(200);

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      return HttpResponse.json(
        isMockTotpEnabled(account)
          ? { isEnabled: true, recoveryCodesLeft: account.totp?.recoveryCodes.length ?? 0 }
          : { isEnabled: false, recoveryCodesLeft: 0 },
      );
    }),

    http.post('/api/v1/me/totp/setup', async ({ request }) => {
      await mockDelay(300);

      if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');
      if (isMockTotpEnabled(account)) return reject(VALIDATION_MESSAGES.TOTP_ALREADY_ENABLED);

      saveMockTotp(account, { isEnabled: false, recoveryCodes: [] });

      const label = encodeURIComponent(`필드노트:${account.loginId}`);

      return HttpResponse.json({
        secret: MOCK_TOTP_SECRET,
        otpauthUrl: `otpauth://totp/${label}?secret=${MOCK_TOTP_SECRET}&issuer=${encodeURIComponent('필드노트')}`,
      });
    }),

    http.post('/api/v1/me/totp/enable', async ({ request }) => {
      await mockDelay(300);

      if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, totpEnableSchema);

      if ('response' in body) return body.response;
      if (!account.totp) return reject(VALIDATION_MESSAGES.TOTP_SETUP_NOT_STARTED);
      if (account.totp.isEnabled) return reject(VALIDATION_MESSAGES.TOTP_ALREADY_ENABLED);
      if (body.data.code !== MOCK_TOTP_CODE) return apiError('TOTP_INVALID');

      const recoveryCodes = newRecoveryCodes();

      saveMockTotp(account, { isEnabled: true, recoveryCodes });

      return HttpResponse.json({ recoveryCodes });
    }),

    http.post('/api/v1/me/totp/disable', async ({ request }) => {
      await mockDelay(300);

      if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, totpDisableSchema);

      if ('response' in body) return body.response;
      if (!isMockTotpEnabled(account)) return reject(VALIDATION_MESSAGES.TOTP_NOT_ENABLED);

      // 소셜 로그인만 쓰는 계정은 확인할 비밀번호가 없음
      if (account.hasPassword !== false && body.data.currentPassword !== account.password) {
        return apiError('CURRENT_PASSWORD_INVALID');
      }

      if (!verifyMockTotp(account, body.data.code)) return apiError('TOTP_INVALID');

      saveMockTotp(account, undefined);

      return HttpResponse.json({ success: true });
    }),

    http.post('/api/v1/me/totp/recovery-codes', async ({ request }) => {
      await mockDelay(300);

      if (!hasCsrfHeader(request)) return apiError('CSRF_REJECTED');

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const body = await parseBody(request, totpRecoveryRegenerateSchema);

      if ('response' in body) return body.response;
      if (!isMockTotpEnabled(account)) return reject(VALIDATION_MESSAGES.TOTP_NOT_ENABLED);
      if (!verifyMockTotp(account, body.data.code)) return apiError('TOTP_INVALID');

      const recoveryCodes = newRecoveryCodes();

      saveMockTotp(account, { isEnabled: true, recoveryCodes });

      return HttpResponse.json({ recoveryCodes });
    }),
  ];
};
