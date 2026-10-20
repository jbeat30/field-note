import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

/**
 * @description pg 어댑터 기반 Prisma 클라이언트 생성
 * @param connectionString 접속 주소 (앱 계정은 DATABASE_URL, 소유 계정은 DATABASE_MIGRATE_URL)
 * @param maxConnections 이 클라이언트가 동시에 열 수 있는 DB 연결 수 상한 (지정하지 않으면 pg 기본값 10)
 * @returns Prisma 클라이언트
 */
export const createPrismaClient = (connectionString: string, maxConnections?: number) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString, max: maxConnections }) });

export type { Prisma } from '../generated/prisma/client';
export { PrismaClient };
