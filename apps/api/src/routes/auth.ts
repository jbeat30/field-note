import { logoutResponseSchema } from '@field-note/shared';

import type { RouteRegistry } from '../http/route';
import { clearSessionCookie, readSessionToken } from '../session/cookie';
import type { SessionStore } from '../session/sessionStore';

type AuthRouteOptions = {
  sessionStore: SessionStore;
  isSecureCookie: boolean;
};

// 로그인·가입은 P0-3에서 추가 (회사 ID는 로그인한 계정의 세션에만 기록)
export const registerAuthRoutes = (
  { add }: RouteRegistry,
  { sessionStore, isSecureCookie }: AuthRouteOptions,
) => {
  add(
    {
      method: 'post',
      path: '/auth/logout',
      summary: '로그아웃',
      auth: 'required',
      response: { status: 200, schema: logoutResponseSchema },
    },
    async ({ request, response }) => {
      const token = readSessionToken(request);

      if (token) {
        await sessionStore.delete(token);
      }

      clearSessionCookie(response, isSecureCookie);

      return { success: true };
    },
  );
};
