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
