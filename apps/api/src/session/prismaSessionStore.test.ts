import { startTestDatabase, type TestDatabase } from '../db/testDatabase';

import {
  COMPANY_1,
  COMPANY_2,
  USER_1,
  USER_2,
  describeSessionStoreContract,
} from './sessionStore.contract';
import { createPrismaSessionStore } from './sessionStore';

let db: TestDatabase;

jest.setTimeout(120_000);

beforeAll(async () => {
  db = await startTestDatabase();
  // 세션이 참조하는 회사와 계정 (소유 계정 경로로 준비)
  await db.ownerPool.query(
    `INSERT INTO companies (id, name) VALUES ($1, '회사 1'), ($2, '회사 2')`,
    [COMPANY_1, COMPANY_2],
  );
  await db.ownerPool.query(
    `INSERT INTO users (id, company_id, display_name) VALUES ($1, $2, '관리자 1'), ($3, $4, '관리자 2')`,
    [USER_1, COMPANY_1, USER_2, COMPANY_2],
  );
});

afterAll(async () => {
  await db.stop();
});

describeSessionStoreContract('PostgreSQL', () => ({
  createStore: (now) => createPrismaSessionStore(db.auth, now),
  reset: async () => {
    await db.ownerPool.query('DELETE FROM sessions');
  },
  readStoredValues: async () => {
    const { rows } = await db.ownerPool.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions',
    );

    return rows.map((row) => row.token_hash);
  },
}));

describe('회사 상태와 세션', () => {
  it.each(['SUSPENDED', 'CLOSING', 'CLOSED'])(
    '회사가 %s이면 이미 만든 세션도 쓸 수 없고 ACTIVE로 돌아오면 다시 쓸 수 있다',
    async (status) => {
      await db.ownerPool.query('DELETE FROM sessions');

      const store = createPrismaSessionStore(db.auth);
      const { token } = await store.create({ userId: USER_1, companyId: COMPANY_1 });

      expect(await store.find(token)).toEqual({ userId: USER_1, companyId: COMPANY_1 });

      try {
        await db.ownerPool.query(`UPDATE companies SET status = $1 WHERE id = $2`, [
          status,
          COMPANY_1,
        ]);

        expect(await store.find(token)).toBeNull();
      } finally {
        await db.ownerPool.query(`UPDATE companies SET status = 'ACTIVE' WHERE id = $1`, [
          COMPANY_1,
        ]);
      }

      expect(await store.find(token)).toEqual({ userId: USER_1, companyId: COMPANY_1 });
    },
  );
});
