import { errorResponseSchema, invitationResponseSchema } from '@field-note/shared';
import request from 'supertest';

import { createApp } from '../app';
import { startTestDatabase, type TestDatabase } from '../db/testDatabase';
import { createCompanyWithInvitation } from '../operator/operatorService';

import { createPrismaInvitationStore } from './invitationStore';

let db: TestDatabase;

jest.setTimeout(180_000);

beforeAll(async () => {
  db = await startTestDatabase();
  await db.ownerPool.query(
    `INSERT INTO legal_documents (type, version, effective_at, content_hash, is_required) VALUES
      ('TERMS_OF_SERVICE', '2026-01-01', '2026-01-01', 'old', true),
      ('TERMS_OF_SERVICE', '2026-10-01', '2026-10-01', 'new', true),
      ('PRIVACY_POLICY', '2026-10-01', '2026-10-01', 'p', true),
      ('MARKETING', '2026-10-01', '2026-10-01', 'm', false),
      ('TERMS_OF_SERVICE', '2099-01-01', '2099-01-01', 'future', true)`,
  );
});

afterAll(async () => {
  await db.stop();
});

const buildApp = () => createApp({ invitationStore: createPrismaInvitationStore(db.auth) });

describe('GET /api/v1/invitations/{token}', () => {
  it('유효한 링크는 회사·관리자 이름과 현재 시행 중인 약관만 돌려준다', async () => {
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '라우트설비',
      adminName: '조라우트',
      operator: 'operator-a',
    });
    const res = await request(buildApp()).get(`/api/v1/invitations/${invitation.token}`);
    const body = invitationResponseSchema.parse(res.body);

    expect(res.status).toBe(200);
    expect(body.companyName).toBe('라우트설비');
    expect(body.adminName).toBe('조라우트');
    // 종류별 최신 시행본만 (옛 버전과 아직 시행 전인 미래 버전 제외)
    expect(body.documents.map((document) => `${document.type}:${document.version}`).sort()).toEqual(
      ['MARKETING:2026-10-01', 'PRIVACY_POLICY:2026-10-01', 'TERMS_OF_SERVICE:2026-10-01'],
    );
    expect(body.documents.find((document) => document.type === 'MARKETING')?.isRequired).toBe(
      false,
    );
    // 회사·계정 식별값은 응답에 없음
    expect(JSON.stringify(res.body)).not.toContain(invitation.companyId);
    expect(JSON.stringify(res.body)).not.toContain(invitation.userId);
  });

  it('없는 링크와 사용한 링크는 같은 404 응답이다', async () => {
    const app = buildApp();
    const invitation = await createCompanyWithInvitation(db.operator, {
      companyName: '사용설비',
      adminName: '한사용',
      operator: 'operator-a',
    });

    await createPrismaInvitationStore(db.auth).consume(invitation.token);

    const used = await request(app).get(`/api/v1/invitations/${invitation.token}`);
    const unknown = await request(app).get('/api/v1/invitations/unknown-token-0000');

    expect(used.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(used.body).toEqual(unknown.body);
    expect(errorResponseSchema.parse(used.body).error.code).toBe('NOT_FOUND');
  });

  it('저장소를 주입하지 않으면 구현 전 상태(501)다', async () => {
    const res = await request(createApp()).get('/api/v1/invitations/any-token-000000');

    expect(res.status).toBe(501);
  });
});
