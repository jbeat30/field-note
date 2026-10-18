import {
  LEGAL_DOCUMENT_META,
  companyRulesSchema,
  companySettingsSchema,
  deviceParamsSchema,
  devicesResponseSchema,
  emailResendResponseSchema,
  emailVerifyRequestSchema,
  invitationParamsSchema,
  invitationResponseSchema,
  loginRequestSchema,
  meResponseSchema,
  signupRequestSchema,
  emailChangeSchema,
  emailResendResponseSchema as emailChangeResponseSchema,
  passwordChangeSchema,
  passwordSetSchema,
  passwordResetConfirmSchema,
  passwordResetLinkResponseSchema,
  passwordResetParamsSchema,
  passwordResetRequestSchema,
  type CompanyRules,
  type CompanySettings,
  type EmailChange,
  type PasswordChange,
  type PasswordSet,
  type PasswordResetConfirm,
  type LoginRequest,
  type SignupRequest,
  signupResponseSchema,
  successResponseSchema,
  VALIDATION_MESSAGES,
} from '@field-note/shared';

import { AccountError, type AccountService } from '../auth/accountService';
import type { CompanySettingsService } from '../company/companySettingsService';
import { EmailVerificationError, type EmailVerificationService } from '../auth/emailVerification';
import { PasswordError, type PasswordService } from '../auth/passwordService';
import { maskEmail } from '../email/accountEmails';
import type { SecurityNotifier } from '../email/securityNotice';
import { AppError } from '../http/AppError';
import type { Logger } from '../logger';
import type { InvitationStore } from '../invitation/invitationStore';
import { buildDeviceLabel } from '../session/deviceLabel';
import { clientIp } from '../session/clientIp';
import { readSessionToken, setSessionCookie } from '../session/cookie';
import type { SessionStore } from '../session/sessionStore';
import type { RouteHandler, RouteRegistry } from '../http/route';

// 계약 선행 라우트: 화면은 이 계약(OpenAPI)으로 목업과 함께 먼저 구현하고 실제 구현은 P0-2~P0-8에서 채움
const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

type AccountRouteOptions = {
  // 없으면 해당 API는 구현 전 상태(501)로 동작
  invitationStore?: InvitationStore;
  accountService?: AccountService;
  sessionStore?: SessionStore;
  emailVerification?: EmailVerificationService;
  passwordService?: PasswordService;
  companySettings?: CompanySettingsService;
  notifier?: SecurityNotifier;
  logger?: Logger;
  isSecureCookie?: boolean;
};

// 계정 서비스의 업무 오류를 공통 오류 형식으로 변환
export const toAppError = (error: unknown): unknown => {
  if (!(error instanceof AccountError)) {
    return error;
  }

  switch (error.code) {
    // 만료·사용 완료·없는 링크는 구분하지 않음
    case 'INVITATION_INVALID':
      return new AppError('NOT_FOUND');
    case 'LOGIN_ID_TAKEN':
      return new AppError('LOGIN_ID_TAKEN');
    case 'EMAIL_TAKEN':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.email', message: VALIDATION_MESSAGES.EMAIL_TAKEN },
      ]);
    case 'CONSENT_REQUIRED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.consents', message: VALIDATION_MESSAGES.REQUIRED_TERMS_NOT_AGREED },
      ]);
    case 'CONSENT_UNKNOWN_DOCUMENT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.consents', message: VALIDATION_MESSAGES.TERMS_DOCUMENT_INVALID },
      ]);
    case 'INVALID_CREDENTIALS':
      return new AppError('INVALID_CREDENTIALS');
    case 'CURRENT_PASSWORD_INVALID':
      return new AppError('CURRENT_PASSWORD_INVALID');
    case 'ACCOUNT_LOCKED':
      return new AppError('ACCOUNT_LOCKED');
    case 'TOTP_REQUIRED':
      return new AppError('TOTP_REQUIRED');
    case 'TOTP_INVALID':
      return new AppError('TOTP_INVALID');
    case 'ACCOUNT_NOT_FOUND':
      return new AppError('UNAUTHORIZED');
    case 'SOCIAL_NOT_LINKED':
      return new AppError('NOT_FOUND');
    case 'SOCIAL_ALREADY_LINKED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.SOCIAL_ACCOUNT_UNAVAILABLE },
      ]);
    case 'LAST_LOGIN_METHOD':
      return new AppError('LAST_LOGIN_METHOD');
    case 'ACCOUNT_CLOSING':
      return new AppError('ACCOUNT_CLOSING');
    case 'PASSWORD_ALREADY_SET':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.PASSWORD_LOGIN_ALREADY_SET },
      ]);
  }
};

const assertNever = (value: never): never => {
  throw new Error(`[routes.account] 처리되지 않은 오류 코드 ${String(value)}`);
};

// 이메일 인증 서비스의 업무 오류를 공통 오류 형식으로 변환
const toVerificationError = (error: unknown): unknown => {
  if (!(error instanceof EmailVerificationError)) {
    return error;
  }

  switch (error.code) {
    case 'CODE_INVALID':
      return new AppError('EMAIL_CODE_INVALID');
    case 'RESEND_TOO_SOON':
    case 'HOURLY_LIMIT':
      return new AppError('TOO_MANY_REQUESTS');
    case 'ALREADY_VERIFIED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.EMAIL_ALREADY_VERIFIED },
      ]);
    case 'NO_EMAIL':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body', message: VALIDATION_MESSAGES.EMAIL_NOTHING_TO_VERIFY },
      ]);
    case 'EMAIL_TAKEN':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.newEmail', message: VALIDATION_MESSAGES.EMAIL_TAKEN },
      ]);
    case 'SAME_EMAIL':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.newEmail', message: VALIDATION_MESSAGES.EMAIL_SAME_AS_CURRENT },
      ]);
    default:
      // 새 오류 코드를 추가하고 변환을 빠뜨리면 500이 아니라 컴파일 단계에서 잡히게 함
      return assertNever(error.code);
  }
};

const EMAIL_RESEND_WAIT_SECONDS = 30;

export const registerAccountRoutes = (
  { add }: RouteRegistry,
  {
    invitationStore,
    accountService,
    sessionStore,
    emailVerification,
    passwordService,
    companySettings,
    notifier,
    logger,
    isSecureCookie = false,
  }: AccountRouteOptions = {},
) => {
  const isAccountReady = accountService && sessionStore;

  add(
    {
      method: 'get',
      path: '/invitations/{token}',
      summary: '초대 링크 확인 (가입 화면 진입)',
      auth: 'none',
      request: { params: invitationParamsSchema },
      response: { status: 200, schema: invitationResponseSchema },
      // 만료·사용 완료·존재하지 않는 링크는 구분하지 않음
      errors: ['NOT_FOUND'],
      rateLimit: { windowMs: 60_000, limit: 30 },
    },
    invitationStore
      ? async ({ params }) => {
          const { token } = params as { token: string };
          const invitation = await invitationStore.find(token);

          // 만료·사용 완료·없는 링크·정지된 회사는 구분하지 않고 같은 응답
          if (!invitation) {
            throw new AppError('NOT_FOUND');
          }

          const documents = await invitationStore.listCurrentDocuments();

          return {
            companyName: invitation.companyName,
            adminName: invitation.adminName,
            expiresAt: invitation.expiresAt.toISOString(),
            purpose: invitation.purpose,
            documents: documents.map((document) => ({
              id: document.id,
              type: document.type,
              version: document.version,
              isRequired: document.isRequired,
              ...LEGAL_DOCUMENT_META[document.type],
            })),
          };
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/signup',
      summary: '초대 링크로 가입 (약관 동의·만 14세 확인)',
      auth: 'none',
      request: { body: signupRequestSchema },
      response: { status: 201, schema: signupResponseSchema },
      errors: ['NOT_FOUND', 'LOGIN_ID_TAKEN'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    isAccountReady
      ? async ({ body, request, response }) => {
          const input = body as SignupRequest;

          try {
            const account = await accountService.signup({
              inviteToken: input.inviteToken,
              loginId: input.loginId.toLowerCase(),
              password: input.password,
              email: input.email.trim().toLowerCase(),
              consents: input.consents,
            });
            // 가입 직후 로그인 상태(이메일 인증 전)로 두어 인증 화면으로 이어지게 함
            const session = await sessionStore.create(
              { userId: account.userId, companyId: account.companyId },
              {
                deviceLabel: buildDeviceLabel(request.get('user-agent')),
                ipAddress: clientIp(request),
              },
            );

            setSessionCookie(response, session, isSecureCookie);

            // 복구·소유자 이전은 이전 이메일로 알림 (본인 확인 외 변경 시 운영자 연락 안내)
            if (account.previousEmail) {
              await notifier
                ?.notify('OWNER_REGISTERED_AGAIN', account.previousEmail)
                .catch((error: unknown) => {
                  logger?.error({ err: error }, '[routes.signup] 이전 이메일 알림 요청 실패');
                });
            }

            // 가입은 이미 완료됐으므로 발송 요청이 실패해도 가입은 유지하고, 인증 화면의 재발송으로 이어지게 함
            await emailVerification?.request(account).catch((error: unknown) => {
              logger?.error({ err: error }, '[routes.signup] 인증 코드 발송 요청 실패');
            });

            return { email: account.email, resendAfterSeconds: EMAIL_RESEND_WAIT_SECONDS };
          } catch (error) {
            throw toAppError(error);
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/email/verify',
      summary: '이메일 인증 코드 확인 (가입 완료)',
      auth: 'required',
      request: { body: emailVerifyRequestSchema },
      response: { status: 200, schema: meResponseSchema },
      errors: ['EMAIL_CODE_INVALID'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    emailVerification && accountService
      ? async ({ auth, body }) => {
          try {
            const { previousEmail } = await emailVerification.verify(
              auth!,
              (body as { code: string }).code,
            );
            const me = await accountService.getMe(auth!);

            // 이메일이 바뀐 경우 이전 주소로 변경 사실을 알림 (본인이 하지 않은 변경을 알아차리게 함)
            if (previousEmail && me.email) {
              await notifier
                ?.notify('EMAIL_CHANGED', previousEmail, maskEmail(me.email))
                .catch((error: unknown) => {
                  logger?.error({ err: error }, '[routes.verifyEmail] 이메일 변경 알림 요청 실패');
                });
            }

            return me;
          } catch (error) {
            throw toVerificationError(toAppError(error));
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/email/resend',
      summary: '이메일 인증 코드 재발송',
      auth: 'required',
      response: { status: 200, schema: emailResendResponseSchema },
      errors: ['TOO_MANY_REQUESTS'],
      rateLimit: { windowMs: 60_000, limit: 3 },
    },
    emailVerification
      ? async ({ auth }) => {
          try {
            return await emailVerification.request(auth!);
          } catch (error) {
            throw toVerificationError(error);
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/login',
      summary: '아이디 로그인',
      auth: 'none',
      request: { body: loginRequestSchema },
      response: { status: 200, schema: meResponseSchema },
      errors: ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'TOTP_REQUIRED', 'TOTP_INVALID'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    isAccountReady
      ? async ({ body, request, response }) => {
          const input = body as LoginRequest;

          try {
            const account = await accountService.login({
              loginId: input.loginId.trim().toLowerCase(),
              password: input.password,
              totpCode: input.totpCode,
            });
            const session = await sessionStore.create(account, {
              isRemembered: input.isRemembered,
              deviceLabel: buildDeviceLabel(request.get('user-agent')),
              ipAddress: clientIp(request),
            });

            setSessionCookie(response, session, isSecureCookie);

            return await accountService.getMe(account);
          } catch (error) {
            throw toAppError(error);
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/me',
      summary: '로그인한 관리자 정보',
      auth: 'required',
      response: { status: 200, schema: meResponseSchema },
    },
    accountService
      ? async ({ auth }) => {
          try {
            // auth: 'required'이므로 세션을 통과한 요청만 도달
            return await accountService.getMe(auth!);
          } catch (error) {
            throw toAppError(error);
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/company/settings',
      summary: '회사 설정 조회 (기준시간·월 기준일수·공수 방식)',
      auth: 'required',
      response: { status: 200, schema: companySettingsSchema },
    },
    // 회사 ID는 세션에서만 얻음 (요청 값 사용 금지)
    companySettings ? async ({ auth }) => companySettings.get(auth!.companyId) : notImplemented,
  );

  add(
    {
      method: 'put',
      path: '/company/settings',
      summary: '회사 설정 변경',
      auth: 'required',
      request: { body: companySettingsSchema },
      response: { status: 200, schema: companySettingsSchema },
    },
    companySettings
      ? async ({ auth, body }) => companySettings.save(auth!.companyId, body as CompanySettings)
      : notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/company/rules',
      summary: '회사 경고 기준·보증 기본 기간 조회 (저장한 적이 없으면 기본값)',
      auth: 'required',
      response: { status: 200, schema: companyRulesSchema },
    },
    companySettings
      ? async ({ auth }) => companySettings.getRules(auth!.companyId)
      : notImplemented,
  );

  add(
    {
      method: 'put',
      path: '/company/rules',
      summary:
        '회사 경고 기준·보증 기본 기간 변경 (공수 소진율 경고·한도, 진행률 간격, 보증 기본 개월 수)',
      auth: 'required',
      request: { body: companyRulesSchema },
      response: { status: 200, schema: companyRulesSchema },
    },
    companySettings
      ? async ({ auth, body }) => companySettings.saveRules(auth!.companyId, body as CompanyRules)
      : notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/me/devices',
      summary: '로그인 기기 목록',
      auth: 'required',
      response: { status: 200, schema: devicesResponseSchema },
    },
    sessionStore
      ? async ({ auth, request }) => {
          const devices = await sessionStore.listDevices(
            auth!.userId,
            readSessionToken(request) ?? '',
          );

          return {
            devices: devices.map((device) => ({
              id: device.id,
              label: device.label,
              lastActiveAt: device.lastActiveAt.toISOString(),
              isCurrent: device.isCurrent,
              ipAddress: device.ipAddress,
              lastIp: device.lastIp,
            })),
          };
        }
      : notImplemented,
  );

  add(
    {
      method: 'delete',
      path: '/me/devices/{id}',
      summary: '기기 원격 로그아웃',
      auth: 'required',
      request: { params: deviceParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    sessionStore
      ? async ({ auth, params, request }) => {
          const { id } = params as { id: string };
          const isRevoked = await sessionStore.revokeDevice(
            auth!.userId,
            id,
            readSessionToken(request) ?? '',
          );

          // 없는 기기, 다른 사용자의 기기, 현재 기기(로그아웃 API로만 종료)는 구분하지 않음
          if (!isRevoked) {
            throw new AppError('NOT_FOUND');
          }

          return { success: true };
        }
      : notImplemented,
  );

  // 비밀번호 재설정 (로그인 전)
  add(
    {
      method: 'post',
      path: '/auth/password-reset/request',
      summary: '비밀번호 재설정 메일 요청 (가입 여부와 관계없이 같은 응답)',
      auth: 'none',
      request: { body: passwordResetRequestSchema },
      response: { status: 200, schema: successResponseSchema },
      rateLimit: { windowMs: 60_000, limit: 5 },
    },
    passwordService
      ? async ({ body }) => {
          // 처리 중 오류가 나도 같은 응답을 주어 오류 여부로 계정 존재를 추측하지 못하게 함
          await passwordService
            .requestReset((body as { email: string }).email.trim().toLowerCase())
            .catch((error: unknown) => {
              logger?.error({ err: error }, '[routes.passwordReset] 재설정 요청 처리 실패');
            });

          return { success: true };
        }
      : notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/auth/password-reset/{token}',
      summary: '비밀번호 재설정 링크 확인 (2단계 인증 코드 입력 필요 여부 포함)',
      auth: 'none',
      request: { params: passwordResetParamsSchema },
      response: { status: 200, schema: passwordResetLinkResponseSchema },
      errors: ['NOT_FOUND'],
      rateLimit: { windowMs: 60_000, limit: 30 },
    },
    passwordService
      ? async ({ params }) => {
          // 사용·만료·없는 링크는 구분하지 않음
          const link = await passwordService.checkResetLink((params as { token: string }).token);

          if (!link) {
            throw new AppError('NOT_FOUND');
          }

          return { success: true as const, requiresTotp: link.requiresTotp };
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/password-reset/confirm',
      summary: '새 비밀번호 설정 (모든 기기 로그아웃)',
      auth: 'none',
      request: { body: passwordResetConfirmSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND', 'TOTP_REQUIRED', 'TOTP_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    passwordService
      ? async ({ body }) => {
          const input = body as PasswordResetConfirm;

          try {
            await passwordService.confirmReset(input.token, input.newPassword, input.totpCode);
          } catch (error) {
            throw error instanceof PasswordError ? new AppError('NOT_FOUND') : toAppError(error);
          }

          return { success: true };
        }
      : notImplemented,
  );

  // 로그인 상태의 비밀번호·이메일 변경 (현재 비밀번호 재확인)
  add(
    {
      method: 'post',
      path: '/me/password',
      summary: '비밀번호 변경 (다른 기기 로그아웃)',
      auth: 'required',
      request: { body: passwordChangeSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['CURRENT_PASSWORD_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    passwordService
      ? async ({ auth, body, request }) => {
          const input = body as PasswordChange;

          try {
            await passwordService.changePassword(auth!, {
              currentPassword: input.currentPassword,
              newPassword: input.newPassword,
              currentSessionToken: readSessionToken(request) ?? '',
            });
          } catch (error) {
            throw toAppError(error);
          }

          return { success: true };
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/me/email/change',
      summary:
        '이메일 변경·등록 요청 (새 주소로 인증 코드 발송, 인증해야 반영, 비밀번호가 있는 계정은 현재 비밀번호 필요)',
      auth: 'required',
      request: { body: emailChangeSchema },
      response: { status: 200, schema: emailChangeResponseSchema },
      errors: ['CURRENT_PASSWORD_INVALID', 'ACCOUNT_LOCKED', 'TOO_MANY_REQUESTS'],
      rateLimit: { windowMs: 60_000, limit: 5 },
    },
    emailVerification && accountService
      ? async ({ auth, body }) => {
          const input = body as EmailChange;

          try {
            // 계정 탈취 시 이메일을 바꿔 복구 수단을 가로채지 못하도록 비밀번호를 먼저 재확인
            // 비밀번호가 없는 계정(소셜 로그인만 사용)은 확인할 수단이 없어 건너뜀
            if (await accountService.hasPassword(auth!)) {
              await accountService.verifyCurrentPassword(auth!, input.currentPassword ?? '');
            }

            return await emailVerification.requestChange(
              auth!,
              input.newEmail.trim().toLowerCase(),
            );
          } catch (error) {
            throw toVerificationError(toAppError(error));
          }
        }
      : notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/me/password/set',
      summary: '소셜 로그인만 쓰는 계정의 아이디·비밀번호 로그인 설정 (이미 있으면 거부)',
      auth: 'required',
      request: { body: passwordSetSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['LOGIN_ID_TAKEN'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    accountService
      ? async ({ auth, body }) => {
          try {
            await accountService.setPassword(auth!, body as PasswordSet);
          } catch (error) {
            throw toAppError(error);
          }

          return { success: true };
        }
      : notImplemented,
  );
};
