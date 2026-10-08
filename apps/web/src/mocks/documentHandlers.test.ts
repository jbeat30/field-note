import {
  documentAccessLogsResponseSchema,
  documentAccessUrlSchema,
  documentDetailSchema,
  documentsResponseSchema,
  fileUploadTicketSchema,
  projectsResponseSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { resetMockDocuments } from './documentHandlers';
import { handlers } from './handlers';
import { resetMockPhotos } from './photoHandlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사 (handlers.test.ts와 같은 방식)
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

// 목업은 응답마다 0.3초씩 지연하므로 요청이 많은 시험은 넉넉히
jest.setTimeout(60_000);

const server = setupServer(...handlers);
let client: ReturnType<typeof createApiClient>;
const demo = DEMO_ACCOUNTS[0]!;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  client = createApiClient('http://localhost');
});
afterEach(() => {
  resetMockState();
  resetMockPhotos();
  resetMockDocuments();
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });

  return projectsResponseSchema.parse(data).items[0]!.id;
};

// 파일 신청 → 저장소 PUT → 완료 알림까지 마친 문서용 파일
const uploadedFile = async (projectId: string, name = '새 문서.pdf') => {
  const { data } = await client.POST('/api/v1/projects/{projectId}/files', {
    params: { path: { projectId } },
    body: { name, purpose: 'DOCUMENT', contentType: 'application/pdf', size: 1000 },
  });
  const ticket = fileUploadTicketSchema.parse(data);

  await fetch(ticket.upload.url, { method: 'PUT', body: 'x' });
  await client.POST('/api/v1/files/{id}/complete', { params: { path: { id: ticket.file.id } } });

  return ticket.file.id;
};

const list = async (projectId: string, query: Record<string, string> = {}) =>
  documentsResponseSchema.parse(
    (
      await client.GET('/api/v1/projects/{projectId}/documents', {
        params: { path: { projectId }, query },
      })
    ).data,
  ).items;

describe('문서 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/projects/{projectId}/documents', {
      params: { path: { projectId: '018f3b1e-0000-7000-8000-000000000000' }, query: {} },
    });

    expect(response.status).toBe(401);
  });

  it('더미 문서는 고정한 문서가 먼저이고 문서마다 최신본을 보여 준다', async () => {
    const projectId = await setup();
    const items = await list(projectId);

    expect(items.map((item) => item.title)[0]).toBe('1층 시공도');
    expect(items[0]).toMatchObject({
      isPinned: true,
      versionCount: 2,
      latest: { versionNo: 2, reason: '배관 위치 변경' },
    });
    // 계약·행정은 기본 민감 자료
    expect(items.find((item) => item.title === '도급 계약서')!.isSensitive).toBe(true);
    expect(await list(projectId, { category: 'SPEC' })).toHaveLength(1);
    expect(await list(projectId, { q: '계약' })).toHaveLength(1);
  });

  it('파일을 올려 문서를 만들고 새 버전을 올리면 이전본이 남는다', async () => {
    const projectId = await setup();
    const first = await uploadedFile(projectId, '견적서.pdf');
    const created = await client.POST('/api/v1/projects/{projectId}/documents', {
      params: { path: { projectId } },
      body: { fileId: first, title: '견적서', category: 'CONTRACT' },
    });
    const detail = documentDetailSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(detail).toMatchObject({
      isSensitive: true,
      versionCount: 1,
      latest: { fileName: '견적서.pdf' },
    });

    // 같은 파일을 다시 등록하면 같은 문서
    const again = documentDetailSchema.parse(
      (
        await client.POST('/api/v1/projects/{projectId}/documents', {
          params: { path: { projectId } },
          body: { fileId: first, title: '다른 이름' },
        })
      ).data,
    );

    expect(again.id).toBe(detail.id);

    const second = await uploadedFile(projectId, '견적서_수정.pdf');
    const updated = documentDetailSchema.parse(
      (
        await client.POST('/api/v1/documents/{id}/versions', {
          params: { path: { id: detail.id } },
          body: { fileId: second, reason: '금액 조정' },
        })
      ).data,
    );

    expect(updated.versions.map((version) => version.versionNo)).toEqual([2, 1]);
    expect(updated.latest).toMatchObject({ fileName: '견적서_수정.pdf', reason: '금액 조정' });
  });

  it('다른 문서에 쓴 파일이나 없는 파일은 거부한다', async () => {
    const projectId = await setup();
    const taken = (await list(projectId))[0]!.latest.fileId;
    const taken2 = await client.POST('/api/v1/projects/{projectId}/documents', {
      params: { path: { projectId } },
      body: { fileId: '018f3b1e-0000-7000-8000-000000000000', title: '없는 파일' },
    });
    const other = (await list(projectId))[1]!;
    const reuse = await client.POST('/api/v1/documents/{id}/versions', {
      params: { path: { id: other.id } },
      body: { fileId: taken },
    });

    expect(taken2.response.status).toBe(400);
    expect(reuse.response.status).toBe(400);
  });

  it('민감 자료는 열람·내려받기가 기록으로 남고 일반 자료는 남지 않는다', async () => {
    const projectId = await setup();
    const items = await list(projectId);
    const contract = items.find((item) => item.isSensitive)!;
    const drawing = items.find((item) => !item.isSensitive)!;
    const open = async (id: string, mode: 'view' | 'download') =>
      documentAccessUrlSchema.parse(
        (
          await client.GET('/api/v1/documents/{id}/versions/{versionNo}/url', {
            params: { path: { id, versionNo: 1 }, query: { mode } },
          })
        ).data,
      );

    expect((await open(contract.id, 'view')).isLogged).toBe(true);
    expect((await open(contract.id, 'download')).isLogged).toBe(true);
    expect((await open(drawing.id, 'view')).isLogged).toBe(false);

    const logs = documentAccessLogsResponseSchema.parse(
      (
        await client.GET('/api/v1/documents/{id}/access-logs', {
          params: { path: { id: contract.id } },
        })
      ).data,
    ).items;

    expect(logs.map((log) => log.action)).toEqual(['DOCUMENT_DOWNLOADED', 'DOCUMENT_VIEWED']);
    expect(logs[0]!.actorName).toBe('김한빛');
    expect(
      documentAccessLogsResponseSchema.parse(
        (
          await client.GET('/api/v1/documents/{id}/access-logs', {
            params: { path: { id: drawing.id } },
          })
        ).data,
      ).items,
    ).toEqual([]);
  });

  it('없는 버전은 열 수 없고 고정은 10개까지이며 삭제하면 목록에서 빠진다', async () => {
    const projectId = await setup();
    const [first] = await list(projectId);
    const missing = await client.GET('/api/v1/documents/{id}/versions/{versionNo}/url', {
      params: { path: { id: first!.id, versionNo: 9 }, query: { mode: 'view' } },
    });

    expect(missing.response.status).toBe(404);

    for (let i = 0; i < 9; i += 1) {
      const fileId = await uploadedFile(projectId, `문서${i}.pdf`);
      const created = documentDetailSchema.parse(
        (
          await client.POST('/api/v1/projects/{projectId}/documents', {
            params: { path: { projectId } },
            body: { fileId, title: `문서${i}` },
          })
        ).data,
      );

      expect(
        (
          await client.PATCH('/api/v1/documents/{id}', {
            params: { path: { id: created.id } },
            body: { isPinned: true },
          })
        ).response.status,
      ).toBe(200);
    }

    const extra = documentDetailSchema.parse(
      (
        await client.POST('/api/v1/projects/{projectId}/documents', {
          params: { path: { projectId } },
          body: { fileId: await uploadedFile(projectId, '열한번째.pdf'), title: '열한 번째' },
        })
      ).data,
    );

    expect(
      (
        await client.PATCH('/api/v1/documents/{id}', {
          params: { path: { id: extra.id } },
          body: { isPinned: true },
        })
      ).response.status,
    ).toBe(400);
    expect(
      (await client.DELETE('/api/v1/documents/{id}', { params: { path: { id: extra.id } } })).data,
    ).toEqual({ success: true });
    expect((await list(projectId)).some((item) => item.id === extra.id)).toBe(false);
  });
});
