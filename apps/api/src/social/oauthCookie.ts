import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';

export const OAUTH_COOKIE = 'oauth_session';
export const OAUTH_TTL_MS = 10 * 60 * 1000;

// 소셜 로그인 진행 중 서버가 기억해야 하는 값. DB 대신 암호화한 쿠키에 담아 브라우저가 돌아올 때 검증
const sessionSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('login') }),
  // 로그인한 사용자의 소셜 연동: 시작한 사용자와 돌아온 사용자가 같은지 검사
  z.object({ purpose: z.literal('link'), userId: z.string(), companyId: z.string() }),
  // 초대 링크 가입: 동의 내용과 초대 토큰을 시작 시점에 받아 둠
  z.object({
    purpose: z.literal('signup'),
    inviteToken: z.string(),
    consents: z.array(z.object({ documentId: z.string(), isAgreed: z.boolean() })),
  }),
]);

const envelopeSchema = z.object({
  state: z.string(),
  expiresAt: z.number(),
  session: sessionSchema,
});

export type OAuthSession = z.infer<typeof sessionSchema>;

const deriveKey = (secret: string) =>
  createHash('sha256').update(`oauth-cookie:${secret}`).digest();

/**
 * @description 진행 상태를 AES-256-GCM으로 암호화 (변조·위조·내용 열람 방지)
 * @param secret 서버 비밀 값
 * @param state 제공자로 보낸 state 값 (돌아올 때 대조)
 * @param session 진행 상태
 * @param now 현재 시각
 * @returns 쿠키에 담을 문자열
 */
export const sealOAuthSession = (
  secret: string,
  state: string,
  session: OAuthSession,
  now = Date.now(),
) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ state, session, expiresAt: now + OAUTH_TTL_MS }), 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
};

/**
 * @description 쿠키 값을 열어 state가 일치하고 만료 전일 때만 진행 상태 반환
 * @param secret 서버 비밀 값
 * @param sealed 쿠키 값
 * @param state 제공자가 돌려준 state
 * @param now 현재 시각
 * @returns 진행 상태 (검증 실패 시 null)
 */
export const openOAuthSession = (
  secret: string,
  sealed: string | undefined,
  state: string | undefined,
  now = Date.now(),
): OAuthSession | null => {
  if (!sealed || !state) {
    return null;
  }

  try {
    const raw = Buffer.from(sealed, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), raw.subarray(0, 12));

    decipher.setAuthTag(raw.subarray(12, 28));

    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString(
      'utf8',
    );
    const envelope = envelopeSchema.parse(JSON.parse(plain));

    // state는 쿠키 안의 값과 정확히 같아야 하고 만료 전이어야 함
    return envelope.state === state && envelope.expiresAt > now ? envelope.session : null;
  } catch {
    // 변조·손상·형식 오류는 모두 같은 실패로 취급
    return null;
  }
};

// 제공자 화면에서 돌아오는 요청(최상위 이동 GET)에도 전달되도록 Lax, 콜백 경로에만 보냄
const cookieOptions = (isSecure: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: OAUTH_TTL_MS,
});

export const setOAuthCookie = (res: Response, sealed: string, isSecure: boolean) => {
  res.cookie(OAUTH_COOKIE, sealed, cookieOptions(isSecure));
};

export const clearOAuthCookie = (res: Response, isSecure: boolean) => {
  res.clearCookie(OAUTH_COOKIE, { ...cookieOptions(isSecure), maxAge: undefined });
};

export const readOAuthCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[OAUTH_COOKIE];

  return typeof value === 'string' ? value : undefined;
};
