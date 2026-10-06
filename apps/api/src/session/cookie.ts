import type { CookieOptions, Request, Response } from 'express';

import type { AuthResolver } from '../http/types';

import { SESSION_MAX_AGE_MS, type CreatedSession, type SessionStore } from './sessionStore';

export const SESSION_COOKIE = 'sid';

/**
 * @description 세션 쿠키 옵션 (HttpOnly로 스크립트 접근 차단, SameSite=Lax로 외부 사이트 전송 제한)
 * @param isSecure HTTPS 전용 여부 (운영은 true, 로컬 http 개발은 false)
 * @returns 쿠키 옵션
 */
export const sessionCookieOptions = (isSecure: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE_MS,
});

export const setSessionCookie = (res: Response, session: CreatedSession, isSecure: boolean) => {
  // 로그인 유지를 선택하지 않으면 만료 시각 없이 세션 쿠키로 보내 브라우저를 닫으면 사라지게 함
  res.cookie(SESSION_COOKIE, session.token, {
    ...sessionCookieOptions(isSecure),
    ...(session.isPersistent ? { expires: session.expiresAt } : { maxAge: undefined }),
  });
};

export const clearSessionCookie = (res: Response, isSecure: boolean) => {
  // 삭제 시에도 발급 때와 같은 속성이어야 브라우저가 지움
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(isSecure), maxAge: undefined });
};

export const readSessionToken = (req: Request): string | undefined => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];

  return typeof token === 'string' && token.length > 0 ? token : undefined;
};

/**
 * @description 쿠키의 세션 토큰으로 인증 정보를 찾는 해석기 (회사 ID의 유일한 출처)
 * @param store 세션 저장소
 * @returns requireAuth에 주입할 해석기
 */
export const createSessionResolver =
  (store: SessionStore): AuthResolver =>
  async (req) => {
    const token = readSessionToken(req);

    return token ? store.find(token) : null;
  };
