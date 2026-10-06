import { LEGAL_DOCUMENT_CONTENTS } from '@field-note/shared';
import { DEMO_LEGAL_DOCUMENTS } from '@field-note/shared/demo';

import { seedDemoData } from '../db/seed';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';

import {
  legalContentHash,
  LegalContentChangedError,
  registerLegalDocuments,
} from './legalDocuments';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
});

afterAll(async () => {
  await db.stop();
});

describe('운영자 약관 문서 등록', () => {
  it('처음 등록하면 세 문서가 만들어지고 본문 해시가 저장된다', async () => {
    const results = await registerLegalDocuments(db.operator);

    expect(results.map((result) => result.status)).toEqual(['CREATED', 'CREATED', 'CREATED']);

    const stored = await db.owner.legalDocument.findMany();

    expect(stored).toHaveLength(3);

    for (const content of Object.values(LEGAL_DOCUMENT_CONTENTS)) {
      const row = stored.find((item) => item.type === content.type);

      expect(row?.version).toBe(content.version);
      expect(row?.contentHash).toBe(legalContentHash(content));
      expect(row?.isRequired).toBe(content.isRequired);
    }
  });

  it('다시 실행해도 같은 결과이고 중복이 생기지 않는다', async () => {
    const results = await registerLegalDocuments(db.operator);

    expect(results.map((result) => result.status)).toEqual(['UNCHANGED', 'UNCHANGED', 'UNCHANGED']);
    expect(await db.owner.legalDocument.count()).toBe(3);
  });

  it('같은 버전인데 내용이 달라졌다면 거부한다 (이미 동의받은 문서가 몰래 바뀌는 것을 막음)', async () => {
    await db.owner.legalDocument.updateMany({
      where: { type: 'PRIVACY_POLICY' },
      data: { contentHash: 'tampered-hash' },
    });

    await expect(registerLegalDocuments(db.operator)).rejects.toBeInstanceOf(
      LegalContentChangedError,
    );

    await db.owner.legalDocument.updateMany({
      where: { type: 'PRIVACY_POLICY' },
      data: { contentHash: legalContentHash(LEGAL_DOCUMENT_CONTENTS.PRIVACY_POLICY) },
    });
  });

  it('개발 시드와 운영 등록은 같은 본문에 같은 해시를 만든다', async () => {
    await seedDemoData(db.owner);

    for (const document of DEMO_LEGAL_DOCUMENTS) {
      const seeded = await db.owner.legalDocument.findUnique({
        where: { type_version: { type: document.type, version: document.version } },
      });

      expect(seeded?.contentHash).toBe(legalContentHash(LEGAL_DOCUMENT_CONTENTS[document.type]));
    }
  });

  it('운영자 계정은 문서를 등록·조회할 수 있지만 수정·삭제할 수 없다', async () => {
    await expect(
      db.operator.legalDocument.updateMany({ data: { isRequired: false } }),
    ).rejects.toThrow();
    await expect(db.operator.legalDocument.deleteMany()).rejects.toThrow();
  });
});
