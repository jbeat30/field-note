import type { PrismaClient } from '../db/client';

import { ANONYMIZED_COMPANY_NAME, ANONYMIZED_USER_NAME } from './purgePolicy';

type Clock = () => Date;

export class NotDueForPurgeError extends Error {
  constructor() {
    super('[closure.purge] 삭제 대상이 아님 (유예 중이거나 취소·삭제 완료)');
  }
}

export type PurgeResult = {
  companyId: string;
  // 테이블별 삭제 행 수 (개인정보 없는 개수만)
  deleted: Record<string, number>;
  anonymizedUsers: number;
};

/**
 * @description 해지 유예가 끝난 회사의 데이터 삭제·익명화 (삭제 전용 계정 전용)
 * 한 트랜잭션이라 중간에 실패하면 아무것도 바뀌지 않는다. `PURGE_POLICY`의 DELETE는 삭제, ANONYMIZE는 개인 식별 항목 제거, KEEP은 건드리지 않음
 * 업로드 파일(객체 저장소)은 파일 기능이 생기는 2단계에서 이 함수에 삭제 단계를 추가한다
 * @param prisma 삭제 전용 계정(DATABASE_PURGE_URL) Prisma 클라이언트
 * @param companyId 대상 회사
 * @param now 현재 시각
 * @returns 삭제·익명화 결과 (개수)
 * @throws 유예가 끝나지 않았거나 이미 취소·삭제된 경우
 */
export const purgeCompany = (
  prisma: PrismaClient,
  companyId: string,
  now: Clock = () => new Date(),
): Promise<PurgeResult> =>
  prisma.$transaction(async (tx) => {
    const at = now();
    const closure = await tx.companyClosure.findUnique({ where: { companyId } });
    const company = await tx.company.findUnique({ where: { id: companyId } });

    if (
      !closure ||
      closure.cancelledAt ||
      closure.purgedAt ||
      closure.purgeAfter > at ||
      company?.status !== 'CLOSING'
    ) {
      throw new NotDueForPurgeError();
    }

    const deleted: Record<string, number> = {};
    const where = { companyId };

    // 외래 키 순서: 메모 → 프로젝트 → 나머지 (소속 행이 먼저)
    // 직원이 선택 목록 항목을 참조하므로 직원을 먼저 삭제
    deleted.employees = (await tx.employee.deleteMany({ where })).count;
    deleted.partners = (await tx.partner.deleteMany({ where })).count;
    deleted.option_items = (await tx.optionItem.deleteMany({ where })).count;
    deleted.memos = (await tx.memo.deleteMany({ where })).count;
    deleted.projects = (await tx.project.deleteMany({ where })).count;
    deleted.sessions = (await tx.session.deleteMany({ where })).count;
    deleted.invitations = (await tx.invitation.deleteMany({ where })).count;
    deleted.email_verifications = (await tx.emailVerification.deleteMany({ where })).count;
    deleted.password_resets = (await tx.passwordReset.deleteMany({ where })).count;
    deleted.social_accounts = (await tx.socialAccount.deleteMany({ where })).count;
    deleted.user_credentials = (await tx.userCredential.deleteMany({ where })).count;
    deleted.company_settings = (await tx.companySettings.deleteMany({ where })).count;

    // 동의 이력 등이 계정 행을 참조하므로 계정은 지우지 않고 개인 식별 항목만 제거
    const anonymized = await tx.user.updateMany({
      where,
      data: {
        displayName: ANONYMIZED_USER_NAME,
        email: null,
        emailVerifiedAt: null,
        phone: null,
        ageConfirmedAt: null,
      },
    });

    await tx.company.update({
      where: { id: companyId },
      data: { name: ANONYMIZED_COMPANY_NAME, status: 'CLOSED' },
    });
    await tx.companyClosure.update({ where: { companyId }, data: { purgedAt: at } });

    return { companyId, deleted, anonymizedUsers: anonymized.count };
  });

export type DueClosure = { companyId: string; requestedAt: Date; purgeAfter: Date };

/**
 * @description 삭제 시기가 된 해지 요청 목록 (취소·삭제 완료 제외)
 * @param prisma 삭제 전용 계정 Prisma 클라이언트
 * @param now 현재 시각
 * @returns 삭제 대상
 */
export const listDueClosures = async (
  prisma: PrismaClient,
  now: Clock = () => new Date(),
): Promise<DueClosure[]> => {
  const rows = await prisma.companyClosure.findMany({
    where: { cancelledAt: null, purgedAt: null, purgeAfter: { lte: now() } },
    orderBy: { purgeAfter: 'asc' },
  });

  return rows.map((row) => ({
    companyId: row.companyId,
    requestedAt: row.requestedAt,
    purgeAfter: row.purgeAfter,
  }));
};

export type PurgeDueSummary = {
  purged: PurgeResult[];
  // 한 회사의 실패가 다른 회사의 삭제를 막지 않도록 오류는 모아서 보고
  failed: { companyId: string; reason: string }[];
};

/**
 * @description 삭제 시기가 된 모든 회사를 처리 (점검 작업이 주기적으로 호출, 여러 번 실행해도 안전)
 * @param prisma 삭제 전용 계정 Prisma 클라이언트
 * @param now 현재 시각
 * @returns 처리·실패 요약
 */
export const purgeDueCompanies = async (
  prisma: PrismaClient,
  now: Clock = () => new Date(),
): Promise<PurgeDueSummary> => {
  const summary: PurgeDueSummary = { purged: [], failed: [] };

  for (const due of await listDueClosures(prisma, now)) {
    try {
      summary.purged.push(await purgeCompany(prisma, due.companyId, now));
    } catch (error) {
      summary.failed.push({
        companyId: due.companyId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
};
