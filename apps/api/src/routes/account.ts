import {
  LEGAL_DOCUMENT_META,
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
  type LoginRequest,
  type SignupRequest,
  signupResponseSchema,
  successResponseSchema,
} from '@field-note/shared';

import { AccountError, type AccountService } from '../auth/accountService';
import { AppError } from '../http/AppError';
import type { InvitationStore } from '../invitation/invitationStore';
import { setSessionCookie } from '../session/cookie';
import type { SessionStore } from '../session/sessionStore';
import type { RouteHandler, RouteRegistry } from '../http/route';

// 계약 선행 라우트: 화면은 이 계약(OpenAPI)으로 목업과 함께 먼저 만들고, 실제 구현은 P0-2~P0-8에서 채운다
const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

type AccountRouteOptions = {
  // 없으면 해당 API는 구현 전 상태(501)로 동작
  invitationStore?: InvitationStore;
  accountService?: AccountService;
  sessionStore?: SessionStore;
  isSecureCookie?: boolean;
};

// 계정 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
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
        { path: 'body.email', message: '이미 사용 중인 이메일입니다' },
      ]);
    case 'CONSENT_REQUIRED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.consents', message: '필수 약관에 모두 동의해야 합니다' },
      ]);
    case 'CONSENT_UNKNOWN_DOCUMENT':
      return new AppError('VALIDATION_ERROR', [
        { path: 'body.consents', message: '동의할 수 없는 문서가 포함되어 있습니다' },
      ]);
    case 'INVALID_CREDENTIALS':
      return new AppError('INVALID_CREDENTIALS');
    case 'ACCOUNT_LOCKED':
      return new AppError('ACCOUNT_LOCKED');
    case 'ACCOUNT_NOT_FOUND':
      return new AppError('UNAUTHORIZED');
  }
};

const EMAIL_RESEND_WAIT_SECONDS = 30;

export const registerAccountRoutes = (
  { add }: RouteRegistry,
  {
    invitationStore,
    accountService,
    sessionStore,
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
      ? async ({ body, response }) => {
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
            const session = await sessionStore.create({
              userId: account.userId,
              companyId: account.companyId,
            });

            setSessionCookie(response, session, isSecureCookie);

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
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/email/resend',
      summary: '이메일 인증 코드 재발송',
      auth: 'required',
      response: { status: 200, schema: emailResendResponseSchema },
      rateLimit: { windowMs: 60_000, limit: 3 },
    },
    notImplemented,
  );

  add(
    {
      method: 'post',
      path: '/auth/login',
      summary: '아이디 로그인',
      auth: 'none',
      request: { body: loginRequestSchema },
      response: { status: 200, schema: meResponseSchema },
      errors: ['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    isAccountReady
      ? async ({ body, response }) => {
          const input = body as LoginRequest;

          try {
            const account = await accountService.login({
              loginId: input.loginId.trim().toLowerCase(),
              password: input.password,
            });
            const session = await sessionStore.create(account, {
              isRemembered: input.isRemembered,
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
    notImplemented,
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
    notImplemented,
  );

  add(
    {
      method: 'get',
      path: '/me/devices',
      summary: '로그인 기기 목록',
      auth: 'required',
      response: { status: 200, schema: devicesResponseSchema },
    },
    notImplemented,
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
    notImplemented,
  );
};
