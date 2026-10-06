import { generateToken, hashToken } from '../auth/token';
import type { PrismaClient } from '../db/client';
import { SHORT_SESSION_MS } from '../auth/loginPolicy';
import type { AuthContext } from '../http/types';

// 세션 최대 유지 기간 (기기 목록·원격 로그아웃은 P0-6에서 확장)
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type CreatedSession = {
  // 쿠키로만 전달하는 원문 토큰 (저장소에는 해시만 보관)
  token: string;
  expiresAt: Date;
  // false면 브라우저를 닫을 때 사라지는 세션 쿠키 (로그인 유지를 선택하지 않은 경우)
  isPersistent: boolean;
};

export type CreateSessionOptions = {
  // 기본 true (로그인 유지, §6.4)
  isRemembered?: boolean;
};

const sessionLifetimeMs = (options?: CreateSessionOptions) =>
  options?.isRemembered === false ? SHORT_SESSION_MS : SESSION_MAX_AGE_MS;

export type SessionStore = {
  create: (input: AuthContext, options?: CreateSessionOptions) => Promise<CreatedSession>;
  find: (token: string) => Promise<AuthContext | null>;
  delete: (token: string) => Promise<void>;
  // 비밀번호 재설정·전 기기 로그아웃용
  deleteByUser: (userId: string) => Promise<void>;
  deleteExpired: () => Promise<void>;
};

type Clock = () => Date;

/**
 * @description 회사 범위 밖 전용 계정으로 접속한 PostgreSQL 세션 저장소
 * @param prisma 전용 계정(DATABASE_AUTH_URL) Prisma 클라이언트
 * @param now 현재 시각 (테스트에서 교체)
 * @returns 세션 저장소
 */
export const createPrismaSessionStore = (
  prisma: PrismaClient,
  now: Clock = () => new Date(),
): SessionStore => ({
  create: async ({ userId, companyId }, options) => {
    const token = generateToken();
    const expiresAt = new Date(now().getTime() + sessionLifetimeMs(options));

    await prisma.session.create({
      data: { tokenHash: hashToken(token), userId, companyId, expiresAt },
    });

    return { token, expiresAt, isPersistent: options?.isRemembered !== false };
  },
  find: async (token) => {
    const session = await prisma.session.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: now() } },
    });

    return session ? { userId: session.userId, companyId: session.companyId } : null;
  },
  delete: async (token) => {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  },
  deleteByUser: async (userId) => {
    await prisma.session.deleteMany({ where: { userId } });
  },
  deleteExpired: async () => {
    await prisma.session.deleteMany({ where: { expiresAt: { lte: now() } } });
  },
});

/**
 * @description 메모리 세션 저장소 (DB 없이 도는 테스트·기본값용, 운영에서는 사용 금지)
 * @param now 현재 시각
 * @returns 세션 저장소
 */
export const createMemorySessionStore = (now: Clock = () => new Date()): SessionStore => {
  const sessions = new Map<string, AuthContext & { expiresAt: Date }>();

  return {
    create: async (input, options) => {
      const token = generateToken();
      const expiresAt = new Date(now().getTime() + sessionLifetimeMs(options));

      sessions.set(hashToken(token), { ...input, expiresAt });

      return { token, expiresAt, isPersistent: options?.isRemembered !== false };
    },
    find: async (token) => {
      const session = sessions.get(hashToken(token));

      return session && session.expiresAt > now()
        ? { userId: session.userId, companyId: session.companyId }
        : null;
    },
    delete: async (token) => {
      sessions.delete(hashToken(token));
    },
    deleteByUser: async (userId) => {
      for (const [key, session] of sessions) {
        if (session.userId === userId) {
          sessions.delete(key);
        }
      }
    },
    deleteExpired: async () => {
      for (const [key, session] of sessions) {
        if (session.expiresAt <= now()) {
          sessions.delete(key);
        }
      }
    },
  };
};
