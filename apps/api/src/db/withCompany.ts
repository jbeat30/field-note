import { z } from 'zod';

import type { Prisma, PrismaClient } from './client';

const companyIdSchema = z.uuid();

/**
 * @description 회사 범위 트랜잭션 실행 (모든 업무 쿼리는 이 헬퍼가 넘겨주는 tx로만 수행)
 * @param prisma 앱 계정 Prisma 클라이언트
 * @param companyId 세션에서 얻은 회사 ID (요청 본문·주소·헤더 값 금지)
 * @param fn 회사 범위 안에서 실행할 작업
 * @returns 작업 결과
 * @throws 회사 ID가 UUID 형식이 아닌 경우
 */
export const withCompany = <T>(
  prisma: PrismaClient,
  companyId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  const parsed = companyIdSchema.safeParse(companyId);

  if (!parsed.success) {
    throw new Error('[db.withCompany] 회사 ID 형식 오류');
  }

  return prisma.$transaction(async (tx) => {
    // 세 번째 인자 true는 SET LOCAL과 동일 (트랜잭션 종료 시 해제되어 풀 재사용 시 누수 없음)
    await tx.$executeRaw`SELECT set_config('app.company_id', ${parsed.data}, true)`;

    return fn(tx);
  });
};
