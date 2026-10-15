import { createHash } from 'node:crypto';

import type { Prisma, PrismaClient } from '../db/client';
import { withCompany } from '../db/withCompany';

import type { IdempotencyEntry, IdempotencyStore } from './idempotency';

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

const toEntry = (row: Prisma.IdempotencyKeyGetPayload<object>): IdempotencyEntry =>
  row.state === 'DONE'
    ? {
        state: 'done',
        fingerprint: row.fingerprint,
        status: row.status ?? 200,
        body: row.body,
        expiresAt: row.expiresAt.getTime(),
      }
    : { state: 'processing', fingerprint: row.fingerprint, expiresAt: row.expiresAt.getTime() };

/**
 * @description DB 멱등 키 저장소 (앱 계정으로 자기 회사 범위에서만 처리). 서버를 여러 대 띄우거나 다시 시작해도 키가 유지된다
 * @param app 앱 계정 Prisma 클라이언트
 * @param now 현재 시각 (테스트에서 교체)
 * @returns 멱등 키 저장소
 */
export const createPrismaIdempotencyStore = (
  app: PrismaClient,
  now: () => Date = () => new Date(),
): IdempotencyStore => ({
  claim: (companyId, key, entry) =>
    withCompany(app, companyId, async (tx) => {
      const keyHash = hashKey(key);

      // 만료된 기록은 없는 것으로 보고 치움 (같은 키를 다시 쓸 수 있게)
      await tx.idempotencyKey.deleteMany({ where: { keyHash, expiresAt: { lte: now() } } });

      // 동시에 같은 키가 와도 한 요청만 들어간다 (기본 키 충돌은 무시)
      const created = await tx.idempotencyKey.createMany({
        data: {
          companyId,
          keyHash,
          fingerprint: entry.fingerprint,
          state: 'PROCESSING',
          expiresAt: new Date(entry.expiresAt),
        },
        skipDuplicates: true,
      });

      if (created.count === 1) {
        return null;
      }

      const row = await tx.idempotencyKey.findFirst({ where: { keyHash } });

      return row ? toEntry(row) : null;
    }),

  complete: (companyId, key, entry) =>
    withCompany(app, companyId, async (tx) => {
      await tx.idempotencyKey.updateMany({
        where: { keyHash: hashKey(key) },
        data: {
          state: 'DONE',
          status: entry.status,
          body: (entry.body ?? null) as Prisma.InputJsonValue,
          expiresAt: new Date(entry.expiresAt),
        },
      });
    }),

  release: (companyId, key) =>
    withCompany(app, companyId, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { keyHash: hashKey(key) } });
    }),
});
