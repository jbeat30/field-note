import {
  successResponseSchema,
  totpDisableSchema,
  totpEnableSchema,
  totpRecoveryCodesResponseSchema,
  totpRecoveryRegenerateSchema,
  totpSetupResponseSchema,
  totpStatusSchema,
  VALIDATION_MESSAGES,
  type TotpDisable,
  type TotpEnable,
  type TotpRecoveryRegenerate,
} from '@field-note/shared';

import type { AccountService } from '../auth/accountService';
import { TotpError, type TotpService } from '../auth/totpService';
import type { SecurityNotifier } from '../email/securityNotice';
import { AppError } from '../http/AppError';
import type { Logger } from '../logger';
import type { RouteHandler, RouteRegistry } from '../http/route';

import { toAppError } from './account';

// 서비스가 연결되지 않은 환경(계약 문서 생성 등)에서는 구현 전 상태(501)로 동작
const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 연결되지 않았을 때 구조 분해만 통과시키는 자리 값 (핸들러는 호출되지 않음)
const UNUSED_OPTIONS = {} as TotpRouteOptions;

type TotpRouteOptions = {
  totp: TotpService;
  accountService: AccountService;
  // 켜기·끄기 사실을 이메일로 알림 (없으면 생략)
  notifier?: SecurityNotifier;
  logger?: Logger;
};

// 2단계 인증 서비스의 업무 오류를 공통 오류 형식으로 변환
const toTotpError = (error: unknown): unknown => {
  const mapped = toAppError(error);

  if (!(mapped instanceof TotpError)) {
    return mapped;
  }

  switch (mapped.code) {
    case 'CODE_INVALID':
      return new AppError('TOTP_INVALID');
    case 'ALREADY_ENABLED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.TOTP_ALREADY_ENABLED },
      ]);
    case 'NOT_ENABLED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.TOTP_NOT_ENABLED },
      ]);
    case 'SETUP_NOT_STARTED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.TOTP_SETUP_NOT_STARTED },
      ]);
  }
};

/**
 * @description 2단계 인증(TOTP) 설정 API 등록 (켜기·끄기는 설정 화면에서 로그인한 상태로만)
 * @param registry 라우트 등록기
 * @param config 2단계 인증 서비스와 알림 (없으면 501)
 */
export const registerTotpRoutes = (registry: RouteRegistry, config?: TotpRouteOptions) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, config ? handler : notImplemented);
  const { totp, accountService, notifier, logger } = config ?? UNUSED_OPTIONS;

  // 알림 요청이 실패해도 이미 처리한 변경은 유지
  const notify = async (
    account: { userId: string; companyId: string },
    kind: 'TOTP_ENABLED' | 'TOTP_DISABLED',
  ) => {
    const me = await accountService.getMe(account);

    if (me.email) {
      await notifier?.notify(kind, me.email).catch((error: unknown) => {
        logger?.error({ err: error }, '[routes.totp] 보안 알림 요청 실패');
      });
    }
  };

  add(
    {
      method: 'get',
      path: '/me/totp',
      summary: '2단계 인증 상태',
      auth: 'required',
      response: { status: 200, schema: totpStatusSchema },
    },
    async ({ auth }) => totp.getStatus(auth!),
  );

  add(
    {
      method: 'post',
      path: '/me/totp/setup',
      summary: '2단계 인증 등록 시작 (인증 키 발급, 확인 전에는 켜지지 않음)',
      auth: 'required',
      response: { status: 200, schema: totpSetupResponseSchema },
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ auth }) => {
      try {
        return await totp.beginSetup(auth!);
      } catch (error) {
        throw toTotpError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/me/totp/enable',
      summary: '인증 앱의 코드로 등록 확인 (켜지고 복구 코드를 한 번만 보여 줌)',
      auth: 'required',
      request: { body: totpEnableSchema },
      response: { status: 200, schema: totpRecoveryCodesResponseSchema },
      errors: ['TOTP_INVALID'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ auth, body }) => {
      try {
        const recoveryCodes = await totp.enable(auth!, (body as TotpEnable).code);

        await notify(auth!, 'TOTP_ENABLED');

        return { recoveryCodes };
      } catch (error) {
        throw toTotpError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/me/totp/disable',
      summary:
        '2단계 인증 끄기 (인증 코드 또는 복구 코드 필요, 비밀번호가 있는 계정은 현재 비밀번호도 필요)',
      auth: 'required',
      request: { body: totpDisableSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['CURRENT_PASSWORD_INVALID', 'TOTP_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ auth, body }) => {
      const input = body as TotpDisable;

      try {
        if (!(await totp.isEnabled(auth!))) {
          throw new TotpError('NOT_ENABLED');
        }

        // 소셜 로그인만 쓰는 계정은 확인할 비밀번호가 없어 건너뜀
        if (await accountService.hasPassword(auth!)) {
          await accountService.verifyCurrentPassword(auth!, input.currentPassword ?? '');
        }

        await accountService.verifySecondFactor(auth!, input.code);
        await totp.disable(auth!);
        await notify(auth!, 'TOTP_DISABLED');

        return { success: true as const };
      } catch (error) {
        throw toTotpError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/me/totp/recovery-codes',
      summary: '복구 코드 다시 발급 (이전 코드는 모두 무효, 인증 코드 또는 복구 코드 필요)',
      auth: 'required',
      request: { body: totpRecoveryRegenerateSchema },
      response: { status: 200, schema: totpRecoveryCodesResponseSchema },
      errors: ['TOTP_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ auth, body }) => {
      try {
        if (!(await totp.isEnabled(auth!))) {
          throw new TotpError('NOT_ENABLED');
        }

        await accountService.verifySecondFactor(auth!, (body as TotpRecoveryRegenerate).code);

        return { recoveryCodes: await totp.regenerateRecoveryCodes(auth!) };
      } catch (error) {
        throw toTotpError(error);
      }
    },
  );
};
