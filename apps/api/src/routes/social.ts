import {
  SOCIAL_PROVIDER_LABELS,
  socialCallbackQuerySchema,
  socialMethodsResponseSchema,
  socialProviderParamsSchema,
  socialProvidersResponseSchema,
  socialStartRequestSchema,
  socialStartResponseSchema,
  successResponseSchema,
  type SocialProviderKey,
  type SocialResult,
  type SocialStartRequest,
} from '@field-note/shared';
import { generateCodeVerifier } from 'arctic';
import { z } from 'zod';

import { AccountError } from '../auth/accountError';
import type { AccountService } from '../auth/accountService';
import { generateToken } from '../auth/token';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import type { InvitationStore } from '../invitation/invitationStore';
import type { Logger } from '../logger';
import { readSessionToken, setSessionCookie } from '../session/cookie';
import { buildDeviceLabel } from '../session/deviceLabel';
import { clientIp } from '../session/clientIp';
import type { SessionStore } from '../session/sessionStore';
import type { SocialProviderId, SocialService } from '../auth/socialService';
import {
  clearOAuthCookie,
  openOAuthSession,
  readOAuthCookie,
  sealOAuthSession,
  setOAuthCookie,
} from '../social/oauthCookie';
import type { SocialProviderChoices } from '../social/provider';

type SocialRouteOptions = {
  choices: SocialProviderChoices;
  socialService: SocialService;
  accountService: AccountService;
  sessionStore: SessionStore;
  invitationStore?: InvitationStore;
  // 진행 상태 쿠키 암호화용 서버 비밀 값
  cookieSecret: string;
  // 제공자에서 돌아온 사용자를 보낼 웹 주소
  appOrigin: string;
  isSecureCookie: boolean;
  logger?: Logger;
};

const toResult = (error: unknown): SocialResult => {
  if (!(error instanceof AccountError)) {
    return 'failed';
  }

  switch (error.code) {
    case 'SOCIAL_ALREADY_LINKED':
      return 'already-linked';
    case 'EMAIL_TAKEN':
      return 'email-taken';
    case 'INVITATION_INVALID':
      return 'invitation-invalid';
    default:
      return 'failed';
  }
};

/**
 * @description 소셜 로그인 라우트: 시작 → 제공자 화면 → 콜백, 연동·로그인·초대 가입이 같은 콜백을 씀
 * 제공자가 돌려준 사용자 번호로만 계정을 찾고, 이메일이 같다는 이유로 연결하지 않음
 * @param registry 라우트 등록소
 * @param options 제공자, 서비스, 쿠키 비밀 값
 */
const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 소셜 설정이 없을 때(문서 생성, 서비스 구성 전) 쓰는 자리 채움 값: 이 값으로는 어떤 핸들러도 실행되지 않음 (501로 등록)
const UNUSED_OPTIONS = {
  choices: {
    kakao: { kind: 'none' },
    naver: { kind: 'none' },
    google: { kind: 'none' },
  },
  socialService: undefined,
  accountService: undefined,
  sessionStore: undefined,
  cookieSecret: '',
  appOrigin: 'http://localhost',
  isSecureCookie: false,
} as unknown as SocialRouteOptions;

export const registerSocialRoutes = (registry: RouteRegistry, config?: SocialRouteOptions) => {
  const options = config ?? UNUSED_OPTIONS;
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, config ? handler : notImplemented);
  const { choices, socialService, accountService, sessionStore, invitationStore } = options;
  const origin = new URL(options.appOrigin).origin;
  const redirectTo = (path: string, result?: SocialResult) =>
    `${origin}${path}${result ? `?social=${result}` : ''}`;

  const toProviderId = (provider: SocialProviderKey) => provider.toUpperCase() as SocialProviderId;
  const providerOf = (params: unknown) => (params as { provider: SocialProviderKey }).provider;

  const begin = async (
    provider: SocialProviderKey,
    response: Parameters<typeof setOAuthCookie>[0],
    session: Parameters<typeof sealOAuthSession>[2]['session'],
  ) => {
    const choice = choices[provider];

    if (choice.kind === 'none') {
      // 제공자 설정이 없는 환경(예: 앱 등록 전 운영)에서는 시작할 수 없음
      throw new AppError('NOT_IMPLEMENTED');
    }

    const state = generateToken();
    const codeVerifier = generateCodeVerifier();

    setOAuthCookie(
      response,
      sealOAuthSession(options.cookieSecret, state, { provider, codeVerifier, session }),
      options.isSecureCookie,
    );

    return { url: choice.client.createAuthorizationUrl(state, codeVerifier).toString() };
  };

  add(
    {
      method: 'get',
      path: '/auth/social/providers',
      summary: '사용 가능한 소셜 로그인 제공자',
      auth: 'none',
      response: { status: 200, schema: socialProvidersResponseSchema },
    },
    async () => ({
      kakao: choices.kakao.kind !== 'none',
      naver: choices.naver.kind !== 'none',
      google: choices.google.kind !== 'none',
    }),
  );

  add(
    {
      method: 'post',
      path: '/auth/{provider}/start',
      summary: '소셜 로그인·가입 시작 (제공자 화면 주소 반환)',
      auth: 'none',
      request: { params: socialProviderParamsSchema, body: socialStartRequestSchema },
      response: { status: 200, schema: socialStartResponseSchema },
      errors: ['NOT_FOUND', 'NOT_IMPLEMENTED'],
      rateLimit: { windowMs: 60_000, limit: 20 },
    },
    async ({ params, body, response }) => {
      const provider = providerOf(params);
      const input = body as SocialStartRequest;

      if (input.purpose === 'login') {
        return begin(provider, response, { purpose: 'login' });
      }

      // 없는 링크는 제공자 화면으로 보내기 전에 알림 (만료·사용 완료·없는 링크는 구분하지 않음)
      if (invitationStore && !(await invitationStore.find(input.inviteToken))) {
        throw new AppError('NOT_FOUND');
      }

      return begin(provider, response, {
        purpose: 'signup',
        inviteToken: input.inviteToken,
        consents: input.consents,
      });
    },
  );

  add(
    {
      method: 'post',
      path: '/me/social/{provider}/start',
      summary: '로그인한 계정에 소셜 계정 연동 시작',
      auth: 'required',
      blockedInDemo: true,
      request: { params: socialProviderParamsSchema },
      response: { status: 200, schema: socialStartResponseSchema },
      errors: ['DEMO_RESTRICTED', 'NOT_IMPLEMENTED'],
      rateLimit: { windowMs: 60_000, limit: 10 },
    },
    async ({ auth, params, response }) =>
      begin(providerOf(params), response, {
        purpose: 'link',
        userId: auth!.userId,
        companyId: auth!.companyId,
      }),
  );

  add(
    {
      method: 'get',
      path: '/auth/{provider}/callback',
      summary: '제공자에서 돌아오는 주소 (연동·로그인·가입을 마치고 웹 화면으로 이동)',
      auth: 'none',
      request: { params: socialProviderParamsSchema, query: socialCallbackQuerySchema },
      response: { status: 302, schema: z.null() },
      redirect: true,
      rateLimit: { windowMs: 60_000, limit: 30 },
    },
    async ({ params, query, request, response }) => {
      const provider = providerOf(params);
      const choice = choices[provider];
      const providerId = toProviderId(provider);
      const { code, state, error } = query as z.infer<typeof socialCallbackQuerySchema>;
      const context = openOAuthSession(options.cookieSecret, readOAuthCookie(request), state);

      // 한 번 쓴 진행 상태는 결과와 관계없이 즉시 폐기
      clearOAuthCookie(response, options.isSecureCookie);

      // 쿠키가 없거나 state가 다르거나 시작한 제공자와 다르면(다른 사람이 만든 주소로 들어온 경우 포함) 아무 처리도 하지 않음
      if (!context || context.provider !== provider || choice.kind === 'none') {
        return redirectTo('/login', 'failed');
      }

      const { session, codeVerifier } = context;

      const returnPath =
        session.purpose === 'link'
          ? '/settings'
          : session.purpose === 'signup'
            ? `/invite/${encodeURIComponent(session.inviteToken)}`
            : '/login';

      if (error || !code || !state) {
        return redirectTo(returnPath, 'cancelled');
      }

      try {
        const profile = await choice.client.exchangeCode(code, state, codeVerifier);

        if (session.purpose === 'login') {
          const account = await socialService.findAccount(providerId, profile.providerUserId);

          if (!account) {
            // 해지 요청 중인 계정이면 연결이 없는 것과 구분해 취소 링크를 안내
            const isClosing = await socialService.isClosing(providerId, profile.providerUserId);

            return redirectTo('/login', isClosing ? 'closing' : 'not-linked');
          }

          const created = await sessionStore.create(account, {
            deviceLabel: buildDeviceLabel(request.get('user-agent')),
            ipAddress: clientIp(request),
          });

          setSessionCookie(response, created, options.isSecureCookie);

          const me = await accountService.getMe(account);

          return redirectTo(me.isEmailVerified ? '/' : '/verify-email');
        }

        if (session.purpose === 'link') {
          // 연동을 시작한 사용자와 지금 로그인한 사용자가 같아야 함 (다른 사람 계정에 연동되는 것을 막음)
          const token = readSessionToken(request);
          const current = token ? await sessionStore.find(token) : null;

          // 이 조회에서 토큰이 교체됐으면 새 쿠키를 내려보내야 로그인이 풀리지 않음
          if (current?.rotated) {
            setSessionCookie(response, current.rotated, options.isSecureCookie);
          }

          if (current?.userId !== session.userId || current.companyId !== session.companyId) {
            return redirectTo('/settings', 'failed');
          }

          await socialService.link(current, providerId, profile.providerUserId);

          return redirectTo('/settings', 'linked');
        }

        const account = await socialService.signup({
          inviteToken: session.inviteToken,
          consents: session.consents,
          provider: providerId,
          providerUserId: profile.providerUserId,
          verifiedEmail: profile.verifiedEmail,
        });
        const created = await sessionStore.create(account, {
          deviceLabel: buildDeviceLabel(request.get('user-agent')),
          ipAddress: clientIp(request),
        });

        setSessionCookie(response, created, options.isSecureCookie);

        // 인증된 이메일을 받지 못했으면 이메일 등록·인증 화면으로 이동
        return redirectTo(profile.verifiedEmail ? '/' : '/verify-email');
      } catch (failure) {
        const result = toResult(failure);

        if (result === 'failed') {
          options.logger?.error(
            { err: failure },
            `[routes.socialCallback] ${SOCIAL_PROVIDER_LABELS[provider]} 로그인 처리 실패`,
          );
        }

        return redirectTo(returnPath, result);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/me/social',
      summary: '연동된 로그인 수단',
      auth: 'required',
      response: { status: 200, schema: socialMethodsResponseSchema },
    },
    async ({ auth }) => {
      const methods = await socialService.methods(auth!);

      const isLinked = (id: SocialProviderId) => ({ isLinked: methods.linked.includes(id) });

      return {
        hasPassword: methods.hasPassword,
        kakao: isLinked('KAKAO'),
        naver: isLinked('NAVER'),
        google: isLinked('GOOGLE'),
      };
    },
  );

  add(
    {
      method: 'delete',
      path: '/me/social/{provider}',
      summary: '소셜 연동 해제 (로그인 수단이 하나 이상 남아야 함)',
      auth: 'required',
      blockedInDemo: true,
      request: { params: socialProviderParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['DEMO_RESTRICTED', 'LAST_LOGIN_METHOD'],
    },
    async ({ auth, params }) => {
      try {
        await socialService.unlink(auth!, toProviderId(providerOf(params)));
      } catch (error) {
        throw error instanceof AccountError && error.code === 'LAST_LOGIN_METHOD'
          ? new AppError('LAST_LOGIN_METHOD')
          : error;
      }

      return { success: true };
    },
  );
};
