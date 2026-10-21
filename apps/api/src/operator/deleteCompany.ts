import { deleteCompanyBusinessData, deleteCompanyLoginData } from '../closure/purgeService';
import type { PrismaClient } from '../db/client';
import { isPublicDemoCompany } from '../demo/publicDemo';
import type { ObjectStorage } from '../storage/objectStorage';

export type DeleteCompanyFailure =
  'DEMO_COMPANY' | 'NOT_FOUND' | 'NAME_MISMATCH' | 'NOT_ROLLED_BACK';

export class DeleteCompanyError extends Error {
  constructor(readonly failure: DeleteCompanyFailure) {
    super(
      {
        DEMO_COMPANY: '시연 회사는 지울 수 없음 (demo-remove 사용)',
        NOT_FOUND: '회사를 찾을 수 없음',
        NAME_MISMATCH: '--confirm-name이 회사 이름과 다름 (공백까지 같아야 함)',
        NOT_ROLLED_BACK: '미리보기가 되돌려지지 않음',
      }[failure],
    );
  }
}

export type DeleteCompanyResult = {
  companyName: string;
  dryRun: boolean;
  // 지운 업로드 파일 수 (미리보기에서는 0)
  removedObjects: number;
  // 테이블별 지운 행 수 (미리보기에서는 지울 행 수)
  deleted: Record<string, number>;
};

// 미리보기 때 지운 결과를 보여 준 뒤 트랜잭션을 되돌리기 위한 신호
class DryRunRollback extends Error {
  constructor(readonly deleted: Record<string, number>) {
    super('[operator.delete-company] 미리보기');
  }
}

/**
 * @description 회사를 해지 유예 없이 바로 완전 삭제 (시험 계정 정리용, 소유 계정 전용)
 * 업무 데이터·로그인 기록·약관 동의 이력·운영자 작업 기록·계정·회사 행까지 한 트랜잭션으로 지우며 되돌릴 수 없음
 * 회사 행이 사라지므로 운영자 작업 기록에는 남길 수 없어, 호출하는 쪽이 실행 기록을 출력해 보관
 * 시연 회사는 대상이 될 수 없음 (`demo-remove` 사용)
 * @param prisma 소유 계정(DATABASE_MIGRATE_URL) Prisma 클라이언트
 * @param input 대상 회사, 확인용 회사 이름, 미리보기 여부, 객체 저장소 (없으면 업로드 파일은 건드리지 않음)
 * @returns 지운 개수
 * @throws 회사가 없거나 이름이 다르거나 시연 회사인 경우
 */
export const deleteCompany = async (
  prisma: PrismaClient,
  input: { companyId: string; confirmName: string; dryRun: boolean; storage?: ObjectStorage },
): Promise<DeleteCompanyResult> => {
  const { companyId, confirmName, dryRun, storage } = input;

  if (isPublicDemoCompany(companyId)) {
    throw new DeleteCompanyError('DEMO_COMPANY');
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  if (!company) {
    throw new DeleteCompanyError('NOT_FOUND');
  }

  if (company.name !== confirmName) {
    throw new DeleteCompanyError('NAME_MISMATCH');
  }

  const run = async (): Promise<Record<string, number>> =>
    prisma.$transaction(
      async (tx) => {
        const deleted = {
          ...(await deleteCompanyBusinessData(tx, companyId)),
          ...(await deleteCompanyLoginData(tx, companyId)),
        };

        deleted.consents = (await tx.consent.deleteMany({ where: { companyId } })).count;
        deleted.operator_actions = (
          await tx.operatorAction.deleteMany({ where: { companyId } })
        ).count;
        deleted.users = (await tx.user.deleteMany({ where: { companyId } })).count;
        deleted.companies = (await tx.company.deleteMany({ where: { id: companyId } })).count;

        if (dryRun) {
          throw new DryRunRollback(deleted);
        }

        return deleted;
      },
      { timeout: 60_000 },
    );

  if (dryRun) {
    const deleted = await run().then(
      () => {
        throw new DeleteCompanyError('NOT_ROLLED_BACK');
      },
      (error: unknown) => {
        if (error instanceof DryRunRollback) return error.deleted;

        throw error;
      },
    );

    return { companyName: company.name, dryRun, removedObjects: 0, deleted };
  }

  // 파일을 먼저 지우고 DB를 지움: 중간에 실패해도 같은 명령을 다시 실행하면 이어서 처리됨
  const removedObjects = storage ? await storage.removePrefix(`company/${companyId}/`) : 0;

  return { companyName: company.name, dryRun, removedObjects, deleted: await run() };
};
