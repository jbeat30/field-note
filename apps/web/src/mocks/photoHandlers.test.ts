import {
  errorResponseSchema,
  fileUploadTicketSchema,
  photoSchema,
  photosResponseSchema,
  projectsResponseSchema,
  storedFileSchema,
} from '@field-note/shared';
import { setupServer } from 'msw/node';

import { createApiClient } from '../api/client';

import { DEMO_ACCOUNTS } from './data';
import { handlers } from './handlers';
import { resetMockPhotos } from './photoHandlers';
import { resetMockState } from './state';

// 목업 응답이 서버 계약(공유 스키마)을 지키는지 검사 (handlers.test.ts와 같은 방식)
Object.defineProperty(globalThis, 'location', {
  value: new URL('http://localhost/'),
  configurable: true,
});

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
});
afterAll(() => server.close());

const setup = async () => {
  await client.POST('/api/v1/auth/login', {
    body: { loginId: demo.loginId, password: demo.password, isRemembered: true },
  });

  const { data } = await client.GET('/api/v1/projects', { params: { query: {} } });

  return projectsResponseSchema.parse(data).items[0]!.id;
};

const upload = async (projectId: string) => {
  const { data } = await client.POST('/api/v1/projects/{projectId}/files', {
    params: { path: { projectId } },
    body: { name: '현장.jpg', purpose: 'PHOTO', contentType: 'image/jpeg', size: 1000 },
  });
  const ticket = fileUploadTicketSchema.parse(data);

  return ticket;
};

describe('사진 목업 서버 계약', () => {
  it('로그인하지 않으면 401이다', async () => {
    const { response } = await client.GET('/api/v1/projects/{projectId}/photos', {
      params: { path: { projectId: '018f3b1e-0000-7000-8000-000000000000' }, query: {} },
    });

    expect(response.status).toBe(401);
  });

  it('더미 사진이 촬영일시 최근순으로 나오고 구분으로 거를 수 있다', async () => {
    const projectId = await setup();
    const { data } = await client.GET('/api/v1/projects/{projectId}/photos', {
      params: { path: { projectId }, query: {} },
    });
    const all = photosResponseSchema.parse(data);
    const before = photosResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/photos', {
          params: { path: { projectId }, query: { category: 'BEFORE' } },
        })
      ).data,
    );

    expect(all.items.length).toBeGreaterThan(3);
    expect(all.items.map((item) => item.takenAt)).toEqual(
      [...all.items.map((item) => item.takenAt)].sort().reverse(),
    );
    expect(before.items.every((item) => item.category === 'BEFORE')).toBe(true);
    expect(all.items[0]!.thumbnailUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it('커서로 이어서 읽는다', async () => {
    const projectId = await setup();
    const first = photosResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/photos', {
          params: { path: { projectId }, query: { limit: 2 } },
        })
      ).data,
    );
    const second = photosResponseSchema.parse(
      (
        await client.GET('/api/v1/projects/{projectId}/photos', {
          params: { path: { projectId }, query: { limit: 2, cursor: first.nextCursor! } },
        })
      ).data,
    );

    expect(first.items).toHaveLength(2);
    expect(second.items.map((item) => item.id)).not.toContain(first.items[0]!.id);
  });

  it('신청 → 저장소 PUT → 완료 알림 → 사진 등록 → 수정 → 삭제 흐름이 서버와 같다', async () => {
    const projectId = await setup();
    const ticket = await upload(projectId);

    // 올리기 전에 완료를 알리면 거부
    const early = await client.POST('/api/v1/files/{id}/complete', {
      params: { path: { id: ticket.file.id } },
    });

    expect(early.response.status).toBe(400);

    expect((await fetch(ticket.upload.url, { method: 'PUT', body: 'x' })).status).toBe(200);

    const done = storedFileSchema.parse(
      (
        await client.POST('/api/v1/files/{id}/complete', {
          params: { path: { id: ticket.file.id } },
        })
      ).data,
    );

    expect(done).toMatchObject({ status: 'READY', hasThumbnail: true });

    const created = await client.POST('/api/v1/projects/{projectId}/photos', {
      params: { path: { projectId } },
      body: { fileId: ticket.file.id, category: 'AFTER', area: '401호' },
    });
    const photo = photoSchema.parse(created.data);

    expect(created.response.status).toBe(201);
    expect(photo).toMatchObject({ category: 'AFTER', area: '401호', file: { status: 'READY' } });

    // 같은 파일을 다시 등록하면 같은 사진
    const again = await client.POST('/api/v1/projects/{projectId}/photos', {
      params: { path: { projectId } },
      body: { fileId: ticket.file.id },
    });

    expect(photoSchema.parse(again.data).id).toBe(photo.id);

    const updated = photoSchema.parse(
      (
        await client.PATCH('/api/v1/photos/{id}', {
          params: { path: { id: photo.id } },
          body: { category: 'DEFECT', isCover: true },
        })
      ).data,
    );

    expect(updated).toMatchObject({ category: 'DEFECT', isCover: true });

    const removed = await client.DELETE('/api/v1/photos/{id}', {
      params: { path: { id: photo.id } },
    });

    expect(removed.data).toEqual({ success: true });
    expect(
      (await client.GET('/api/v1/photos/{id}', { params: { path: { id: photo.id } } })).response
        .status,
    ).toBe(404);
  });

  it('다른 프로젝트의 파일이나 없는 파일은 사진으로 등록할 수 없다', async () => {
    const projectId = await setup();
    const { error, response } = await client.POST('/api/v1/projects/{projectId}/photos', {
      params: { path: { projectId } },
      body: { fileId: '018f3b1e-0000-7000-8000-000000000000' },
    });

    expect(response.status).toBe(400);
    expect(errorResponseSchema.parse(error).error.code).toBe('VALIDATION_ERROR');
  });
});
