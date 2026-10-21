import pg from 'pg';

import { deleteCompanyBusinessData, deleteCompanyLoginData } from '../closure/purgeService';
import type { PrismaClient } from '../db/client';
import { seedDemoData, type SeedResult } from '../db/seed';
import type { ObjectStorage } from '../storage/objectStorage';

import { PUBLIC_DEMO } from './publicDemo';
import { buildPublicDemoDataset } from './publicDemoDataset';

export type DemoResetResult = {
  // 지운 업로드 파일 수
  removedObjects: number;
  // 테이블별 지운 행 수
  deleted: Record<string, number>;
  seeded: SeedResult;
};

// 초기화를 동시에 두 번 돌리지 않기 위한 DB 잠금 번호 (임의의 고정 값)
const RESET_LOCK_KEY = 482_011_201;

export class DemoResetBusyError extends Error {
  constructor() {
    super('[demo.reset] 다른 초기화가 실행 중');
  }
}

export class DemoLegalMissingError extends Error {
  constructor() {
    super('[demo.reset] 등록된 약관이 없음 (먼저 pnpm operator legal-register 실행)');
  }
}

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// 시연 회사의 업무 데이터와 로그인 기록·개인 설정을 모두 지움 (회사·계정 행과 약관 동의 이력은 남김)
const wipePublicDemo = async (tx: Tx): Promise<Record<string, number>> => {
  const { companyId } = PUBLIC_DEMO;
  // 로그인 기록과 개인 설정도 비움 (이후 시드가 처음 상태로 다시 만듦)
  return {
    ...(await deleteCompanyBusinessData(tx, companyId)),
    ...(await deleteCompanyLoginData(tx, companyId)),
  };
};

/**
 * @description 시연 회사를 처음 상태로 되돌림 (업로드 파일·업무 데이터·로그인 기록을 지우고 가상 샘플을 다시 입력)
 * 대상은 고정된 시연 회사 하나뿐이며 다른 회사는 건드리지 않으며 약관은 먼저 `operator legal-register`로 등록돼 있어야 함
 * 회사·계정 행은 유지하고 이름·이메일·상태·비밀번호를 원래대로 복원, 약관 동의 이력은 보존
 * @param prisma 소유 계정(DATABASE_MIGRATE_URL) Prisma 클라이언트
 * @param storage 객체 저장소 (없으면 업로드 파일은 건드리지 않음)
 * @returns 지운 개수와 입력한 개수
 * @throws 등록된 약관이 없는 경우
 */
export const resetPublicDemo = async (
  prisma: PrismaClient,
  storage?: ObjectStorage,
): Promise<DemoResetResult> => {
  const { companyId, userId } = PUBLIC_DEMO;
  const dataset = buildPublicDemoDataset();

  // 약관 등록 여부를 먼저 확인해 지운 뒤에 입력이 실패하는 일을 막음
  if ((await prisma.legalDocument.count({ where: { isRequired: true } })) === 0) {
    throw new DemoLegalMissingError();
  }

  const removedObjects = storage ? await storage.removePrefix(`company/${companyId}/`) : 0;

  const deleted = await prisma.$transaction(
    async (tx) => {
      const counts = await wipePublicDemo(tx);

      const now = new Date();

      await tx.company.upsert({
        where: { id: companyId },
        update: { name: PUBLIC_DEMO.companyName, status: 'ACTIVE' },
        create: { id: companyId, name: PUBLIC_DEMO.companyName },
      });
      await tx.user.upsert({
        where: { companyId_id: { companyId, id: userId } },
        update: {
          displayName: PUBLIC_DEMO.displayName,
          email: PUBLIC_DEMO.email,
          emailVerifiedAt: now,
          ageConfirmedAt: now,
          phone: null,
          status: 'ACTIVE',
        },
        create: {
          id: userId,
          companyId,
          displayName: PUBLIC_DEMO.displayName,
          email: PUBLIC_DEMO.email,
          emailVerifiedAt: now,
          ageConfirmedAt: now,
          status: 'ACTIVE',
        },
      });

      return counts;
    },
    { timeout: 60_000 },
  );

  const seeded = await seedDemoData(prisma, {
    dataset,
    legal: 'registered',
    withInvitation: false,
  });

  return { removedObjects, deleted, seeded };
};

/**
 * @description 시연 초기화를 한 번에 하나만 실행 (다른 연결이 잠금을 쥐고 있으면 즉시 실패)
 * 잠금은 전용 연결 하나로 잡고 작업이 끝나면 해제
 * @param ownerUrl 소유 계정 접속 주소
 * @param run 잠금을 쥔 상태에서 실행할 작업
 * @returns 작업 결과
 * @throws 다른 초기화가 실행 중인 경우
 */
export const withDemoResetLock = async <T>(ownerUrl: string, run: () => Promise<T>): Promise<T> => {
  const lock = new pg.Client({ connectionString: ownerUrl });

  await lock.connect();

  try {
    const { rows } = await lock.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [RESET_LOCK_KEY],
    );

    if (!rows[0]?.locked) {
      throw new DemoResetBusyError();
    }

    return await run();
  } finally {
    await lock.end();
  }
};

/**
 * @description 시연 회사를 없앰 (서비스 단계에서 시연 환경을 끌 때): 데이터·업로드 파일·로그인 정보를 지우고 회사를 닫힌 상태로 둠
 * 다시 `resetPublicDemo`를 실행하면 처음부터 복원됨
 * @param prisma 소유 계정 Prisma 클라이언트
 * @param storage 객체 저장소 (없으면 업로드 파일은 건드리지 않음)
 * @returns 지운 개수
 */
export const removePublicDemo = async (
  prisma: PrismaClient,
  storage?: ObjectStorage,
): Promise<Pick<DemoResetResult, 'removedObjects' | 'deleted'>> => {
  const { companyId } = PUBLIC_DEMO;
  const removedObjects = storage ? await storage.removePrefix(`company/${companyId}/`) : 0;
  const deleted = await prisma.$transaction(
    async (tx) => {
      const counts = await wipePublicDemo(tx);

      // 닫힌 회사의 세션은 쓸 수 없고 로그인 정보도 없어 접속할 수 없음 (행이 없으면 만들 필요 없음)
      await tx.company.updateMany({ where: { id: companyId }, data: { status: 'CLOSED' } });

      return counts;
    },
    { timeout: 60_000 },
  );

  return { removedObjects, deleted };
};
