import { generateToken, hashToken } from '../auth/token';
import type { PrismaClient } from '../db/client';

export const DEFAULT_INVITATION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Clock = () => Date;

export type IssuedInvitation = {
  companyId: string;
  userId: string;
  // 링크에 들어가는 원문 토큰. 저장소에는 해시만 있어 이 값은 지금 한 번만 알 수 있음
  token: string;
  expiresAt: Date;
};

type OperatorContext = {
  // 작업을 실행한 운영자 (OS 사용자명, 기록용)
  operator: string;
  now?: Clock;
};

/**
 * @description 회사와 관리자 계정(초대 상태)을 만들고 1회용 초대 링크 발급 (운영자 계정 전용)
 * 회사·계정·초대·작업 기록은 한 트랜잭션이라 중간에 실패하면 아무것도 남지 않음
 * @param prisma 운영자 계정(DATABASE_OPERATOR_URL) Prisma 클라이언트
 * @param input 회사 이름, 관리자 이름, 유효 일수
 * @returns 발급된 초대 (토큰 원문 포함)
 */
export const createCompanyWithInvitation = (
  prisma: PrismaClient,
  input: { companyName: string; adminName: string; days?: number } & OperatorContext,
): Promise<IssuedInvitation> =>
  prisma.$transaction(async (tx) => {
    const now = (input.now ?? (() => new Date()))();
    const token = generateToken();
    const expiresAt = new Date(now.getTime() + (input.days ?? DEFAULT_INVITATION_DAYS) * DAY_MS);

    const company = await tx.company.create({ data: { name: input.companyName } });
    const user = await tx.user.create({
      data: { companyId: company.id, displayName: input.adminName, status: 'INVITED' },
    });

    await tx.invitation.create({
      data: { tokenHash: hashToken(token), companyId: company.id, userId: user.id, expiresAt },
    });
    await tx.operatorAction.createMany({
      data: [
        { companyId: company.id, action: 'COMPANY_CREATED', operator: input.operator },
        { companyId: company.id, action: 'INVITATION_ISSUED', operator: input.operator },
      ],
    });

    return { companyId: company.id, userId: user.id, token, expiresAt };
  });

export class InvitationReissueError extends Error {
  constructor(reason: 'COMPANY_NOT_FOUND' | 'ALREADY_REGISTERED') {
    super(`[operator.reissueInvitation] ${reason}`);
  }
}

/**
 * @description 가입 전인 회사의 초대 링크 재발급 (기존 미사용 링크는 즉시 만료)
 * 이미 가입을 마친 계정은 재발급하지 않음 (계정 복구는 별도 절차, §6.3)
 * @param prisma 운영자 계정 Prisma 클라이언트
 * @param input 대상 회사 ID, 유효 일수
 * @returns 새로 발급된 초대
 * @throws 회사가 없거나 이미 가입을 마친 경우
 */
export const reissueInvitation = (
  prisma: PrismaClient,
  input: { companyId: string; days?: number } & OperatorContext,
): Promise<IssuedInvitation> =>
  prisma.$transaction(async (tx) => {
    const now = (input.now ?? (() => new Date()))();
    const user = await tx.user.findFirst({ where: { companyId: input.companyId } });

    if (!user) {
      throw new InvitationReissueError('COMPANY_NOT_FOUND');
    }

    if (user.status !== 'INVITED') {
      throw new InvitationReissueError('ALREADY_REGISTERED');
    }

    await tx.invitation.updateMany({
      where: { companyId: user.companyId, userId: user.id, usedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });

    const token = generateToken();
    const expiresAt = new Date(now.getTime() + (input.days ?? DEFAULT_INVITATION_DAYS) * DAY_MS);

    await tx.invitation.create({
      data: { tokenHash: hashToken(token), companyId: user.companyId, userId: user.id, expiresAt },
    });
    await tx.operatorAction.create({
      data: { companyId: user.companyId, action: 'INVITATION_ISSUED', operator: input.operator },
    });

    return { companyId: user.companyId, userId: user.id, token, expiresAt };
  });

export type CompanySummary = {
  companyId: string;
  companyName: string;
  companyStatus: string;
  adminName: string;
  // 가입 상태: 가입 완료, 유효한 초대 있음, 링크 사용 후 가입 진행 중(이메일 인증 전), 초대 만료, 초대 없음
  registration: 'REGISTERED' | 'INVITED' | 'SIGNING_UP' | 'EXPIRED' | 'NONE';
};

/**
 * @description 회사 목록과 가입 상태 조회 (회사 업무 데이터는 조회하지 않음)
 * @param prisma 운영자 계정 Prisma 클라이언트
 * @param now 현재 시각
 * @returns 회사별 요약
 */
export const listCompanies = async (
  prisma: PrismaClient,
  now: Clock = () => new Date(),
): Promise<CompanySummary[]> => {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' },
    include: { users: true, invitations: true },
  });

  return companies.map((company) => {
    const admin = company.users[0];
    const hasValidInvitation = company.invitations.some(
      (invitation) => invitation.usedAt === null && invitation.expiresAt > now(),
    );

    let registration: CompanySummary['registration'] = 'NONE';

    if (admin?.status === 'ACTIVE') {
      registration = 'REGISTERED';
    } else if (hasValidInvitation) {
      registration = 'INVITED';
    } else if (company.invitations.some((invitation) => invitation.usedAt !== null)) {
      registration = 'SIGNING_UP';
    } else if (company.invitations.length > 0) {
      registration = 'EXPIRED';
    }

    return {
      companyId: company.id,
      companyName: company.name,
      companyStatus: company.status,
      adminName: admin?.displayName ?? '-',
      registration,
    };
  });
};

/**
 * @description 초대 링크 주소 조합 (원문 토큰은 이 주소에만 담겨 한 번만 출력)
 * @param appOrigin 웹 주소
 * @param token 토큰 원문
 * @returns 관리자에게 전달할 링크
 */
export const buildInvitationLink = (appOrigin: string, token: string) =>
  `${new URL(appOrigin).origin}/invite/${token}`;
