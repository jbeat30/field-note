import { generateToken, hashToken } from '../auth/token';
import type { PrismaClient } from '../db/client';
import { SHORT_SESSION_MS } from '../auth/loginPolicy';
import type { AuthContext } from '../http/types';

// 세션 최대 유지 기간 (로그인 유지를 선택한 경우)
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
  // 기기 목록에 보이는 이름 (접속 정보에서 만든 요약, 없으면 "알 수 없는 기기")
  deviceLabel?: string;
};

// 기기 목록의 한 항목. id는 토큰·해시와 무관한 공개용 식별자
export type SessionDevice = {
  id: string;
  label: string;
  lastActiveAt: Date;
  isCurrent: boolean;
};

// 사용 시각 갱신 최소 간격: 요청마다 쓰기를 하지 않기 위함 (기기 목록의 "마지막 사용"은 분 단위면 충분)
export const LAST_ACTIVE_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const DEFAULT_DEVICE_LABEL = '알 수 없는 기기';

const sessionLifetimeMs = (options?: CreateSessionOptions) =>
  options?.isRemembered === false ? SHORT_SESSION_MS : SESSION_MAX_AGE_MS;

export type SessionStore = {
  create: (input: AuthContext, options?: CreateSessionOptions) => Promise<CreatedSession>;
  find: (token: string) => Promise<AuthContext | null>;
  delete: (token: string) => Promise<void>;
  // 비밀번호 재설정·전 기기 로그아웃용
  deleteByUser: (userId: string) => Promise<void>;
  // 비밀번호 변경 시 현재 기기만 남기고 다른 기기 로그아웃
  deleteByUserExcept: (userId: string, keepToken: string) => Promise<void>;
  deleteExpired: () => Promise<void>;
  // 로그인한 기기 목록 (만료된 세션 제외, 최근 사용 순)
  listDevices: (userId: string, currentToken: string) => Promise<SessionDevice[]>;
  // 다른 기기 원격 로그아웃. 같은 사용자의 현재 기기가 아닌 세션만 지우고, 지웠으면 true
  revokeDevice: (userId: string, deviceId: string, currentToken: string) => Promise<boolean>;
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
      data: {
        tokenHash: hashToken(token),
        userId,
        companyId,
        expiresAt,
        deviceLabel: options?.deviceLabel ?? DEFAULT_DEVICE_LABEL,
        lastActiveAt: now(),
      },
    });

    return { token, expiresAt, isPersistent: options?.isRemembered !== false };
  },
  find: async (token) => {
    const at = now();
    const session = await prisma.session.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: at } },
    });

    if (!session) {
      return null;
    }

    // 최근에 갱신했으면 건너뛰어 요청마다 쓰기가 생기지 않게 함 (갱신 실패는 인증 결과에 영향 없음)
    if (at.getTime() - session.lastActiveAt.getTime() >= LAST_ACTIVE_TOUCH_INTERVAL_MS) {
      await prisma.session
        .update({ where: { tokenHash: session.tokenHash }, data: { lastActiveAt: at } })
        .catch(() => undefined);
    }

    return { userId: session.userId, companyId: session.companyId };
  },
  delete: async (token) => {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  },
  deleteByUser: async (userId) => {
    await prisma.session.deleteMany({ where: { userId } });
  },
  deleteByUserExcept: async (userId, keepToken) => {
    await prisma.session.deleteMany({
      where: { userId, tokenHash: { not: hashToken(keepToken) } },
    });
  },
  deleteExpired: async () => {
    await prisma.session.deleteMany({ where: { expiresAt: { lte: now() } } });
  },
  listDevices: async (userId, currentToken) => {
    const currentHash = hashToken(currentToken);
    const sessions = await prisma.session.findMany({
      where: { userId, expiresAt: { gt: now() } },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.publicId,
      label: session.deviceLabel,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session.tokenHash === currentHash,
    }));
  },
  revokeDevice: async (userId, deviceId, currentToken) => {
    // 사용자 조건을 함께 걸어 다른 사용자의 세션은 식별자를 알아도 지울 수 없음
    const { count } = await prisma.session.deleteMany({
      where: { userId, publicId: deviceId, tokenHash: { not: hashToken(currentToken) } },
    });

    return count === 1;
  },
});

/**
 * @description 메모리 세션 저장소 (DB 없이 도는 테스트·기본값용, 운영에서는 사용 금지)
 * @param now 현재 시각
 * @returns 세션 저장소
 */
export const createMemorySessionStore = (now: Clock = () => new Date()): SessionStore => {
  const sessions = new Map<
    string,
    AuthContext & { expiresAt: Date; publicId: string; deviceLabel: string; lastActiveAt: Date }
  >();

  return {
    create: async (input, options) => {
      const token = generateToken();
      const expiresAt = new Date(now().getTime() + sessionLifetimeMs(options));

      sessions.set(hashToken(token), {
        ...input,
        expiresAt,
        publicId: generateToken(),
        deviceLabel: options?.deviceLabel ?? DEFAULT_DEVICE_LABEL,
        lastActiveAt: now(),
      });

      return { token, expiresAt, isPersistent: options?.isRemembered !== false };
    },
    find: async (token) => {
      const session = sessions.get(hashToken(token));

      if (!session || session.expiresAt <= now()) {
        return null;
      }

      if (now().getTime() - session.lastActiveAt.getTime() >= LAST_ACTIVE_TOUCH_INTERVAL_MS) {
        session.lastActiveAt = now();
      }

      return { userId: session.userId, companyId: session.companyId };
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
    deleteByUserExcept: async (userId, keepToken) => {
      for (const [key, session] of sessions) {
        if (session.userId === userId && key !== hashToken(keepToken)) {
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
    listDevices: async (userId, currentToken) =>
      [...sessions.entries()]
        .filter(([, session]) => session.userId === userId && session.expiresAt > now())
        .sort(([, a], [, b]) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
        .map(([key, session]) => ({
          id: session.publicId,
          label: session.deviceLabel,
          lastActiveAt: session.lastActiveAt,
          isCurrent: key === hashToken(currentToken),
        })),
    revokeDevice: async (userId, deviceId, currentToken) => {
      const target = [...sessions.entries()].find(
        ([key, session]) =>
          session.userId === userId &&
          session.publicId === deviceId &&
          key !== hashToken(currentToken),
      );

      return target ? sessions.delete(target[0]) : false;
    },
  };
};
