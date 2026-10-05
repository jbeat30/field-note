import { startTestDatabase, type TestDatabase } from '../db/testDatabase';

import { describeSessionStoreContract } from './sessionStore.contract';
import { createPrismaSessionStore } from './sessionStore';

let db: TestDatabase;

jest.setTimeout(120_000);

beforeAll(async () => {
  db = await startTestDatabase();
  // 세션이 참조하는 회사 (소유 계정 경로로 준비)
  await db.ownerPool.query(
    `INSERT INTO companies (id, name) VALUES ('0198a000-0000-7000-8000-00000000000a', '회사 A')`,
  );
});

afterAll(async () => {
  await db.stop();
});

describeSessionStoreContract('PostgreSQL', () => ({
  createStore: (now) => createPrismaSessionStore(db.auth, now),
  readStoredValues: async () => {
    const { rows } = await db.ownerPool.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions',
    );

    return rows.map((row) => row.token_hash);
  },
}));
