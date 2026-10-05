import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

/**
 * @description pg 어댑터 기반 Prisma 클라이언트 생성
 * @param connectionString 접속 주소 (앱 계정은 DATABASE_URL, 소유 계정은 DATABASE_MIGRATE_URL)
 * @returns Prisma 클라이언트
 */
export const createPrismaClient = (connectionString: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

export type { Prisma } from '../generated/prisma/client';
export { PrismaClient };
