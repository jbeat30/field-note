import { hashToken } from '../auth/token';
import type { PrismaClient } from '../db/client';

type Clock = () => Date;

export type InvitationInfo = {
  companyName: string;
  adminName: string;
  expiresAt: Date;
};

export type ConsumedInvitation = {
  companyId: string;
  userId: string;
};

export type CurrentLegalDocument = {
  id: string;
  type: 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING';
  version: string;
  isRequired: boolean;
};

// 트랜잭션 안과 밖에서 같은 조회를 쓰기 위한 최소 형태
type InvitationReader = Pick<PrismaClient, 'invitation' | 'legalDocument'>;

/**
 * @description 유효한 초대의 조회 조건: 미사용·미만료·회사 활성·관리자 가입 전
 * @param token 토큰 원문
 * @param now 현재 시각
 * @returns Prisma where 조건
 */
export const validInvitationWhere = (token: string, now: Date) => ({
  tokenHash: hashToken(token),
  usedAt: null,
  expiresAt: { gt: now },
  company: { status: 'ACTIVE' as const },
  user: { status: 'INVITED' as const },
});

/**
 * @description 종류별로 현재 시행 중인 최신 약관 문서 (시행 전 미래 버전과 옛 버전 제외)
 * @param prisma 조회에 쓸 클라이언트 또는 트랜잭션
 * @param now 현재 시각
 * @returns 현재 약관 문서 목록
 */
export const findCurrentDocuments = async (
  prisma: InvitationReader,
  now: Date,
): Promise<CurrentLegalDocument[]> => {
  const documents = await prisma.legalDocument.findMany({
    where: { effectiveAt: { lte: now } },
    orderBy: { effectiveAt: 'desc' },
  });
  const latestByType = new Map<string, CurrentLegalDocument>();

  for (const document of documents) {
    if (!latestByType.has(document.type)) {
      latestByType.set(document.type, {
        id: document.id,
        type: document.type,
        version: document.version,
        isRequired: document.isRequired,
      });
    }
  }

  // 시행 시각이 같아도 화면 순서가 흔들리지 않게 고정 순서로 정렬: 이용약관, 개인정보, 마케팅(선택)
  return [...latestByType.values()].sort(
    (a, b) => DOCUMENT_ORDER.indexOf(a.type) - DOCUMENT_ORDER.indexOf(b.type),
  );
};

const DOCUMENT_ORDER: readonly CurrentLegalDocument['type'][] = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING',
];

export type InvitationStore = {
  // 사용·만료·정지·가입 완료 등 유효하지 않은 이유를 구분하지 않고 null
  find: (token: string) => Promise<InvitationInfo | null>;
  // 가입 처리 시 호출: 처음 한 번만 성공하고 이후에는 null (1회용)
  consume: (token: string) => Promise<ConsumedInvitation | null>;
  // 종류별로 현재 시행 중인 최신 약관 문서
  listCurrentDocuments: () => Promise<CurrentLegalDocument[]>;
};

/**
 * @description 회사 범위 밖 전용 계정으로 초대를 조회·사용 처리하는 저장소
 * @param prisma 전용 계정(DATABASE_AUTH_URL) Prisma 클라이언트
 * @param now 현재 시각 (테스트에서 교체)
 * @returns 초대 저장소
 */
export const createPrismaInvitationStore = (
  prisma: PrismaClient,
  now: Clock = () => new Date(),
): InvitationStore => {
  const validWhere = (token: string) => validInvitationWhere(token, now());

  return {
    find: async (token) => {
      const invitation = await prisma.invitation.findFirst({
        where: validWhere(token),
        include: { company: true, user: true },
      });

      return invitation
        ? {
            companyName: invitation.company.name,
            adminName: invitation.user.displayName,
            expiresAt: invitation.expiresAt,
          }
        : null;
    },
    consume: async (token) => {
      const invitation = await prisma.invitation.findFirst({ where: validWhere(token) });

      if (!invitation) {
        return null;
      }

      // 동시에 두 번 요청돼도 조건부 갱신이라 한 쪽만 성공
      const { count } = await prisma.invitation.updateMany({
        where: { tokenHash: invitation.tokenHash, usedAt: null },
        data: { usedAt: now() },
      });

      return count === 1 ? { companyId: invitation.companyId, userId: invitation.userId } : null;
    },
    listCurrentDocuments: () => findCurrentDocuments(prisma, now()),
  };
};
