import { generateToken, hashToken } from '../auth/token';
import type { PrismaClient } from '../db/client';
import { isPublicDemoCompany, PUBLIC_DEMO_MAX_SESSIONS } from '../demo/publicDemo';
import {
  REMEMBERED_SESSION_MS,
  ROTATION_GRACE_MS,
  SESSION_ROTATE_INTERVAL_MS,
  SHORT_SESSION_IDLE_MS,
  SHORT_SESSION_MS,
} from '../auth/loginPolicy';
import type { AuthContext } from '../http/types';

// 세션 최대 유지 기간 (로그인 유지를 선택한 경우)
export const SESSION_MAX_AGE_MS = REMEMBERED_SESSION_MS;

// 한 계정이 동시에 로그인해 둘 수 있는 기기 수 (넘으면 가장 오래 쓰지 않은 세션부터 정리: 로그아웃하지 않고 다시 로그인해도 세션이 무한히 쌓이지 않게 함)
export const MAX_SESSIONS_PER_USER = 10;

export type CreatedSession = {
  // 쿠키로만 전달하는 원문 토큰 (저장소에는 해시만 보관)
  token: string;
  expiresAt: Date;
  // false면 브라우저를 닫을 때 사라지는 세션 쿠키 (로그인 유지를 선택하지 않은 경우)
  isPersistent: boolean;
};

// 세션을 찾은 결과: 토큰 교체 시점이면 새 토큰을 함께 돌려주어 쿠키를 바꾸게 함
export type FoundSession = AuthContext & { rotated?: CreatedSession };

export type CreateSessionOptions = {
  // 기본 true (로그인 유지)
  isRemembered?: boolean;
  // 기기 목록에 보이는 이름 (접속 정보에서 만든 요약, 없으면 "알 수 없는 기기")
  deviceLabel?: string;
  // 로그인한 접속 IP (기기 목록에 보임)
  ipAddress?: string;
};

// 기기 목록의 한 항목. id는 토큰·해시와 무관한 공개용 식별자
export type SessionDevice = {
  id: string;
  label: string;
  lastActiveAt: Date;
  isCurrent: boolean;
  // 로그인 때 IP와 마지막으로 쓴 때의 IP (없으면 null)
  ipAddress: string | null;
  lastIp: string | null;
};

// 사용 시각 갱신 최소 간격: 요청마다 쓰기를 하지 않기 위함 (기기 목록의 "마지막 사용"은 분 단위면 충분)
export const LAST_ACTIVE_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const DEFAULT_DEVICE_LABEL = '알 수 없는 기기';

const sessionLifetimeMs = (options?: CreateSessionOptions) =>
  options?.isRemembered === false ? SHORT_SESSION_MS : SESSION_MAX_AGE_MS;

// 로그인 유지를 선택하지 않은 세션에만 미사용 만료가 있음
const idleExpiresAtFor = (at: Date, options?: CreateSessionOptions) =>
  options?.isRemembered === false ? new Date(at.getTime() + SHORT_SESSION_IDLE_MS) : null;

export type SessionStore = {
  create: (input: AuthContext, options?: CreateSessionOptions) => Promise<CreatedSession>;
  // ip를 주면 마지막 사용 시각을 갱신할 때 마지막 IP도 함께 갱신
  find: (token: string, ip?: string) => Promise<FoundSession | null>;
  delete: (token: string) => Promise<void>;
  // 비밀번호 재설정·전 기기 로그아웃용
  deleteByUser: (userId: string) => Promise<void>;
  // 비밀번호 변경 시 현재 기기만 남기고 다른 기기 로그아웃
  deleteByUserExcept: (userId: string, keepToken: string) => Promise<void>;
  deleteExpired: () => Promise<void>;
  // 로그인한 기기 목록 (만료된 세션 제외, 최근 사용 순)
  listDevices: (userId: string, currentToken: string) => Promise<SessionDevice[]>;
  // 다른 기기 원격 로그아웃, 같은 사용자의 현재 기기가 아닌 세션만 삭제하고 삭제했으면 true 반환
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
): SessionStore => {
  // 현재 토큰이거나 교체 직전 토큰인 세션 (교체 뒤에도 요청 중이던 토큰으로 같은 세션을 가리킬 수 있어야 함)
  const isToken = (hash: string) => ({
    OR: [{ tokenHash: hash }, { previousTokenHash: hash }],
  });
  // 위 조건의 반대 (nullable 컬럼의 not은 null 행을 빼므로 null을 따로 허용)
  const isNotToken = (hash: string) => ({
    tokenHash: { not: hash },
    OR: [{ previousTokenHash: null }, { previousTokenHash: { not: hash } }],
  });
  // 절대 만료와 미사용 만료가 모두 지나지 않은 세션
  const isActive = (at: Date) => ({
    expiresAt: { gt: at },
    AND: [{ OR: [{ idleExpiresAt: null }, { idleExpiresAt: { gt: at } }] }],
  });

  return {
    create: async ({ userId, companyId }, options) => {
      const token = generateToken();
      const at = now();
      const expiresAt = new Date(at.getTime() + sessionLifetimeMs(options));

      await prisma.session.create({
        data: {
          tokenHash: hashToken(token),
          userId,
          companyId,
          expiresAt,
          idleExpiresAt: idleExpiresAtFor(at, options),
          rotatedAt: at,
          deviceLabel: options?.deviceLabel ?? DEFAULT_DEVICE_LABEL,
          ipAddress: options?.ipAddress ?? null,
          lastIp: options?.ipAddress ?? null,
          lastActiveAt: at,
        },
      });

      const stale = await prisma.session.findMany({
        where: { userId },
        orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
        skip: isPublicDemoCompany(companyId) ? PUBLIC_DEMO_MAX_SESSIONS : MAX_SESSIONS_PER_USER,
        select: { tokenHash: true },
      });

      if (stale.length > 0) {
        await prisma.session.deleteMany({
          where: { tokenHash: { in: stale.map((session) => session.tokenHash) } },
        });
      }

      return { token, expiresAt, isPersistent: options?.isRemembered !== false };
    },
    find: async (token, ip) => {
      const at = now();
      const hash = hashToken(token);
      const graceStart = new Date(at.getTime() - ROTATION_GRACE_MS);
      const session = await prisma.session.findFirst({
        where: {
          ...isActive(at),
          // 정지·해지 중·삭제된 회사의 기존 세션은 쓸 수 없음 (로그인뿐 아니라 이미 로그인한 기기도 막음)
          company: { status: 'ACTIVE' },
          OR: [{ tokenHash: hash }, { previousTokenHash: hash, rotatedAt: { gt: graceStart } }],
        },
      });

      if (!session) {
        return null;
      }

      const auth = { userId: session.userId, companyId: session.companyId };
      const isNewestToken = session.tokenHash === hash;
      const touch = {
        lastActiveAt: at,
        ...(ip ? { lastIp: ip } : {}),
        ...(session.idleExpiresAt
          ? { idleExpiresAt: new Date(at.getTime() + SHORT_SESSION_IDLE_MS) }
          : {}),
      };

      // 교체 간격이 지난 사용 중인 세션은 새 토큰으로 바꿈 (동시에 요청한 쪽 하나만 성공하고 나머지는 이전 토큰 허용 시간 안에서 그대로 통과)
      if (
        isNewestToken &&
        at.getTime() - session.rotatedAt.getTime() >= SESSION_ROTATE_INTERVAL_MS
      ) {
        const newToken = generateToken();
        const { count } = await prisma.session
          .updateMany({
            where: { tokenHash: hash, rotatedAt: session.rotatedAt },
            data: {
              ...touch,
              tokenHash: hashToken(newToken),
              previousTokenHash: hash,
              rotatedAt: at,
            },
          })
          .catch(() => ({ count: 0 }));

        if (count === 1) {
          return {
            ...auth,
            rotated: {
              token: newToken,
              expiresAt: session.expiresAt,
              isPersistent: session.idleExpiresAt === null,
            },
          };
        }
      }

      // 최근에 갱신했으면 건너뛰어 요청마다 쓰기가 생기지 않게 함 (갱신 실패는 인증 결과에 영향 없음)
      if (at.getTime() - session.lastActiveAt.getTime() >= LAST_ACTIVE_TOUCH_INTERVAL_MS) {
        await prisma.session
          .updateMany({ where: { tokenHash: session.tokenHash }, data: touch })
          .catch(() => undefined);
      }

      return auth;
    },
    delete: async (token) => {
      await prisma.session.deleteMany({ where: isToken(hashToken(token)) });
    },
    deleteByUser: async (userId) => {
      await prisma.session.deleteMany({ where: { userId } });
    },
    deleteByUserExcept: async (userId, keepToken) => {
      await prisma.session.deleteMany({ where: { userId, ...isNotToken(hashToken(keepToken)) } });
    },
    deleteExpired: async () => {
      const at = now();

      await prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lte: at } }, { idleExpiresAt: { lte: at } }] },
      });
    },
    listDevices: async (userId, currentToken) => {
      const currentHash = hashToken(currentToken);
      const sessions = await prisma.session.findMany({
        where: { userId, ...isActive(now()) },
        orderBy: { lastActiveAt: 'desc' },
      });

      return sessions.map((session) => ({
        id: session.publicId,
        label: session.deviceLabel,
        lastActiveAt: session.lastActiveAt,
        isCurrent: session.tokenHash === currentHash || session.previousTokenHash === currentHash,
        ipAddress: session.ipAddress,
        lastIp: session.lastIp,
      }));
    },
    revokeDevice: async (userId, deviceId, currentToken) => {
      // 사용자 조건을 함께 걸어 다른 사용자의 세션은 식별자를 알아도 지울 수 없음
      const { count } = await prisma.session.deleteMany({
        where: { userId, publicId: deviceId, ...isNotToken(hashToken(currentToken)) },
      });

      return count === 1;
    },
  };
};

type MemorySession = AuthContext & {
  tokenHash: string;
  previousTokenHash: string | null;
  expiresAt: Date;
  idleExpiresAt: Date | null;
  rotatedAt: Date;
  publicId: string;
  deviceLabel: string;
  lastActiveAt: Date;
  ipAddress: string | null;
  lastIp: string | null;
};

/**
 * @description 메모리 세션 저장소 (DB 없이 도는 테스트·기본값용, 운영에서는 사용 금지)
 * @param now 현재 시각
 * @returns 세션 저장소
 */
export const createMemorySessionStore = (now: Clock = () => new Date()): SessionStore => {
  const sessions: MemorySession[] = [];
  const isActive = (session: MemorySession) =>
    session.expiresAt > now() && (!session.idleExpiresAt || session.idleExpiresAt > now());
  const isToken = (session: MemorySession, hash: string) =>
    session.tokenHash === hash || session.previousTokenHash === hash;
  const removeWhere = (predicate: (session: MemorySession) => boolean) => {
    for (let index = sessions.length - 1; index >= 0; index -= 1) {
      if (predicate(sessions[index]!)) {
        sessions.splice(index, 1);
      }
    }
  };

  return {
    create: async ({ userId, companyId }, options) => {
      const token = generateToken();
      const at = now();
      const expiresAt = new Date(at.getTime() + sessionLifetimeMs(options));

      sessions.push({
        userId,
        companyId,
        tokenHash: hashToken(token),
        previousTokenHash: null,
        expiresAt,
        idleExpiresAt: idleExpiresAtFor(at, options),
        rotatedAt: at,
        publicId: generateToken(),
        deviceLabel: options?.deviceLabel ?? DEFAULT_DEVICE_LABEL,
        ipAddress: options?.ipAddress ?? null,
        lastIp: options?.ipAddress ?? null,
        lastActiveAt: at,
      });

      // 같은 시각이면 방금 만든 세션이 앞에 오도록 뒤집은 뒤 정렬
      const own = sessions
        .filter((session) => session.userId === userId)
        .reverse()
        .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
      const stale = new Set(own.slice(MAX_SESSIONS_PER_USER));

      removeWhere((session) => stale.has(session));

      return { token, expiresAt, isPersistent: options?.isRemembered !== false };
    },
    find: async (token, ip) => {
      const at = now();
      const hash = hashToken(token);
      const session = sessions.find(
        (candidate) =>
          isActive(candidate) &&
          (candidate.tokenHash === hash ||
            (candidate.previousTokenHash === hash &&
              at.getTime() - candidate.rotatedAt.getTime() < ROTATION_GRACE_MS)),
      );

      if (!session) {
        return null;
      }

      const auth = { userId: session.userId, companyId: session.companyId };
      const isTouchDue =
        at.getTime() - session.lastActiveAt.getTime() >= LAST_ACTIVE_TOUCH_INTERVAL_MS;
      const touch = () => {
        session.lastActiveAt = at;
        if (ip) session.lastIp = ip;
        if (session.idleExpiresAt) {
          session.idleExpiresAt = new Date(at.getTime() + SHORT_SESSION_IDLE_MS);
        }
      };

      if (
        session.tokenHash === hash &&
        at.getTime() - session.rotatedAt.getTime() >= SESSION_ROTATE_INTERVAL_MS
      ) {
        const newToken = generateToken();

        touch();
        session.previousTokenHash = hash;
        session.tokenHash = hashToken(newToken);
        session.rotatedAt = at;

        return {
          ...auth,
          rotated: {
            token: newToken,
            expiresAt: session.expiresAt,
            isPersistent: session.idleExpiresAt === null,
          },
        };
      }

      if (isTouchDue) {
        touch();
      }

      return auth;
    },
    delete: async (token) => {
      const hash = hashToken(token);

      removeWhere((session) => isToken(session, hash));
    },
    deleteByUser: async (userId) => {
      removeWhere((session) => session.userId === userId);
    },
    deleteByUserExcept: async (userId, keepToken) => {
      const hash = hashToken(keepToken);

      removeWhere((session) => session.userId === userId && !isToken(session, hash));
    },
    deleteExpired: async () => {
      removeWhere((session) => !isActive(session));
    },
    listDevices: async (userId, currentToken) => {
      const hash = hashToken(currentToken);

      return sessions
        .filter((session) => session.userId === userId && isActive(session))
        .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
        .map((session) => ({
          id: session.publicId,
          label: session.deviceLabel,
          lastActiveAt: session.lastActiveAt,
          isCurrent: isToken(session, hash),
          ipAddress: session.ipAddress,
          lastIp: session.lastIp,
        }));
    },
    revokeDevice: async (userId, deviceId, currentToken) => {
      const hash = hashToken(currentToken);
      const target = sessions.find(
        (session) =>
          session.userId === userId && session.publicId === deviceId && !isToken(session, hash),
      );

      if (!target) {
        return false;
      }

      removeWhere((session) => session === target);

      return true;
    },
  };
};
