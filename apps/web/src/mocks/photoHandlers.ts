import {
  PHOTO_CATEGORY_LABELS,
  fileParamsSchema,
  fileUploadRequestSchema,
  fileUrlQuerySchema,
  photoCreateSchema,
  photoListQuerySchema,
  photoParamsSchema,
  photoUpdateSchema,
  projectFileParamsSchema,
  todayInSeoul,
  type ErrorCode,
  type Photo,
  type PhotoCategory,
  type StoredFile,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { getCurrentAccount, getProjects } from './state';

type ApiError = (code: ErrorCode, details?: { path: string; message: string }[]) => Response;

type Helpers = {
  apiError: ApiError;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

export type MockFile = StoredFile & { companyId: string; uploaded: boolean };
type MockPhoto = Omit<Photo, 'file' | 'thumbnailUrl'> & { companyId: string; deletedAt?: string };

// 목업 저장소: 회사별 파일·사진 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const files = new Map<string, MockFile>();
const photos = new Map<string, MockPhoto>();
const seeded = new Set<string>();

// 문서 목업이 쓰는 파일 조회·생성 (파일 업로드 목업과 같은 저장소를 공유)
export const getMockFile = (id: string) => files.get(id);

export const addMockReadyFile = (
  companyId: string,
  projectId: string,
  input: { name: string; contentType: string; size: number; createdAt: string },
) => {
  const id = crypto.randomUUID();

  files.set(id, {
    id,
    companyId,
    projectId,
    purpose: 'DOCUMENT',
    name: input.name,
    contentType: input.contentType,
    size: input.size,
    status: 'READY',
    rejectReason: null,
    hasThumbnail: false,
    sha256: 'c'.repeat(64),
    uploadedBy: '0198d000-0000-7000-8000-000000000001',
    createdAt: input.createdAt,
    readyAt: input.createdAt,
    uploaded: true,
  });

  return id;
};

export const resetMockPhotos = () => {
  files.clear();
  photos.clear();
  seeded.clear();
};

const COLORS: Record<PhotoCategory, string> = {
  BEFORE: '#94a3b8',
  DURING: '#f59e0b',
  AFTER: '#22c55e',
  DEFECT: '#ef4444',
  MATERIAL: '#8b5cf6',
  SAFETY: '#0ea5e9',
  OTHER: '#64748b',
};

// 사진 대신 구분 색과 이름을 그린 이미지 (외부 사진·실제 현장 사진을 쓰지 않음)
const placeholderImage = (category: PhotoCategory, label: string, size: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="${COLORS[category]}"/><text x="50%" y="50%" fill="#fff" font-size="${size / 10}" text-anchor="middle" dominant-baseline="middle">${PHOTO_CATEGORY_LABELS[category]} ${label}</text></svg>`,
  )}`;

const uuid = () => crypto.randomUUID();

// 목업의 업로더 (계약 스키마가 UUID를 요구)
const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

const toPhoto = (photo: MockPhoto): Photo => {
  const file = files.get(photo.fileId)!;

  return {
    id: photo.id,
    projectId: photo.projectId,
    fileId: photo.fileId,
    category: photo.category,
    area: photo.area,
    takenAt: photo.takenAt,
    workDate: photo.workDate,
    description: photo.description,
    isCover: photo.isCover,
    uploadedBy: photo.uploadedBy,
    createdAt: photo.createdAt,
    file: { status: file.status, rejectReason: file.rejectReason, size: file.size },
    thumbnailUrl:
      file.status === 'READY' && file.hasThumbnail
        ? placeholderImage(photo.category, photo.area ?? '', 240)
        : null,
  };
};

// 더미 사진: 작업 전·후 짝이 있는 구역과 한쪽만 있는 구역을 섞어 둠 (사진첩·전후 비교 화면 확인용)
const DEMO_PHOTOS: [PhotoCategory, string | null, string][] = [
  ['BEFORE', '3층 301호', '2026-10-05T01:00:00.000Z'],
  ['AFTER', '3층 301호', '2026-10-07T05:00:00.000Z'],
  ['BEFORE', '3층 302호', '2026-10-05T01:30:00.000Z'],
  ['DURING', '3층 302호', '2026-10-06T02:00:00.000Z'],
  ['SAFETY', null, '2026-10-06T00:30:00.000Z'],
];

const seedProject = (account: MockAccount, projectId: string) => {
  DEMO_PHOTOS.forEach(([category, area, takenAt], index) => {
    const fileId = uuid();
    const id = uuid();

    files.set(fileId, {
      id: fileId,
      companyId: scopeOf(account),
      projectId,
      purpose: 'PHOTO',
      name: `더미${index + 1}.jpg`,
      contentType: 'image/jpeg',
      size: 120_000,
      status: 'READY',
      rejectReason: null,
      hasThumbnail: true,
      sha256: 'a'.repeat(64),
      uploadedBy: MOCK_USER_ID,
      createdAt: takenAt,
      readyAt: takenAt,
      uploaded: true,
    });
    photos.set(id, {
      id,
      companyId: scopeOf(account),
      projectId,
      fileId,
      category,
      area,
      takenAt,
      workDate: todayInSeoul(new Date(takenAt)),
      description: null,
      isCover: index === 0,
      uploadedBy: MOCK_USER_ID,
      createdAt: takenAt,
    });
  });
};

const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  for (const project of getProjects(account)) {
    seedProject(account, project.id);
  }
};

const livePhotos = (account: MockAccount, projectId?: string) => {
  seed(account);

  return [...photos.values()].filter(
    (photo) =>
      photo.companyId === scopeOf(account) &&
      !photo.deletedAt &&
      (!projectId || photo.projectId === projectId),
  );
};

const newestFirst = (a: MockPhoto, b: MockPhoto) =>
  b.takenAt.localeCompare(a.takenAt) || b.id.localeCompare(a.id);

/**
 * @description 파일 업로드·사진 API 목업 핸들러. 업로드 주소는 같은 출처의 `/mock-storage/...`로 발급하고 이 핸들러가 받는다 (실제 흐름: 신청 → PUT → 완료 알림 → 사진 등록)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createPhotoHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);

  return [
    http.post('/api/v1/projects/:projectId/files', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectFileParamsSchema.safeParse(params);

      if (!path.success) return apiError('VALIDATION_ERROR');

      const body = await parseBody(request, fileUploadRequestSchema);

      if ('response' in body) return body.response;

      if (!getProjects(account).some((project) => project.id === path.data.projectId)) {
        return apiError('NOT_FOUND');
      }

      const id = uuid();
      const file: MockFile = {
        id,
        companyId: scopeOf(account),
        projectId: path.data.projectId,
        purpose: body.data.purpose,
        name: body.data.name,
        contentType: body.data.contentType,
        size: body.data.size,
        status: 'PENDING',
        rejectReason: null,
        hasThumbnail: false,
        sha256: null,
        uploadedBy: MOCK_USER_ID,
        createdAt: new Date().toISOString(),
        readyAt: null,
        uploaded: false,
      };

      files.set(id, file);

      return HttpResponse.json(
        {
          file: toStoredFile(file),
          upload: {
            url: `${location.origin}/mock-storage/${id}`,
            method: 'PUT',
            headers: { 'Content-Type': body.data.contentType },
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          },
        },
        { status: 201 },
      );
    }),

    // 브라우저가 업로드 주소로 보내는 PUT (실제로는 객체 저장소가 받음)
    http.put('/mock-storage/:id', async ({ params }) => {
      await latency();

      const file = files.get(String(params.id));

      if (!file) return new HttpResponse(null, { status: 403 });

      file.uploaded = true;

      return new HttpResponse(null, { status: 200 });
    }),

    http.post('/api/v1/files/:id/complete', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = fileParamsSchema.safeParse(params);
      const file = parsed.success ? files.get(parsed.data.id) : undefined;

      if (!file || file.companyId !== scopeOf(account)) return apiError('NOT_FOUND');

      if (file.status === 'PENDING') {
        if (!file.uploaded) {
          return apiError('VALIDATION_ERROR', [
            {
              path: 'file',
              message: '파일이 아직 올라오지 않았습니다. 업로드를 마친 뒤 알려 주세요',
            },
          ]);
        }

        // 실제 서버는 작업 큐에서 검사하지만 목업은 바로 통과시킴
        file.status = 'READY';
        file.hasThumbnail = true;
        file.sha256 = 'b'.repeat(64);
        file.readyAt = new Date().toISOString();
      }

      return HttpResponse.json(toStoredFile(file));
    }),

    http.get('/api/v1/files/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = fileParamsSchema.safeParse(params);
      const file = parsed.success ? files.get(parsed.data.id) : undefined;

      return file && file.companyId === scopeOf(account)
        ? HttpResponse.json(toStoredFile(file))
        : apiError('NOT_FOUND');
    }),

    http.get('/api/v1/files/:id/url', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = fileParamsSchema.safeParse(params);
      const query = fileUrlQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      const file = parsed.success ? files.get(parsed.data.id) : undefined;

      if (!file || file.companyId !== scopeOf(account) || !query.success) {
        return apiError('NOT_FOUND');
      }

      if (file.status !== 'READY') {
        return apiError('VALIDATION_ERROR', [
          { path: 'file', message: '검사가 끝난 파일만 열 수 있습니다' },
        ]);
      }

      const photo = [...photos.values()].find((item) => item.fileId === file.id);

      return HttpResponse.json({
        url: placeholderImage(
          photo?.category ?? 'OTHER',
          photo?.area ?? '',
          query.data.variant === 'thumbnail' ? 240 : 1200,
        ),
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    }),

    http.post('/api/v1/projects/:projectId/photos', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectFileParamsSchema.safeParse(params);

      if (!path.success) return apiError('VALIDATION_ERROR');

      const body = await parseBody(request, photoCreateSchema);

      if ('response' in body) return body.response;

      if (!getProjects(account).some((project) => project.id === path.data.projectId)) {
        return apiError('NOT_FOUND');
      }

      const file = files.get(body.data.fileId);

      if (
        !file ||
        file.companyId !== scopeOf(account) ||
        file.projectId !== path.data.projectId ||
        file.purpose !== 'PHOTO' ||
        file.status === 'REJECTED'
      ) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.fileId', message: '이 프로젝트에 올린 사진 파일이 아닙니다' },
        ]);
      }

      // 같은 파일을 다시 등록하면 기존 사진 (재시도에 안전)
      const existing = [...photos.values()].find((photo) => photo.fileId === file.id);

      if (existing) return HttpResponse.json(toPhoto(existing), { status: 201 });

      const takenAt = body.data.takenAt ?? new Date().toISOString();
      const created: MockPhoto = {
        id: uuid(),
        companyId: scopeOf(account),
        projectId: path.data.projectId,
        fileId: file.id,
        category: body.data.category,
        area: body.data.area ?? null,
        takenAt: new Date(takenAt).toISOString(),
        workDate: body.data.workDate ?? todayInSeoul(new Date(takenAt)),
        description: body.data.description ?? null,
        isCover: false,
        uploadedBy: MOCK_USER_ID,
        createdAt: new Date().toISOString(),
      };

      photos.set(created.id, created);

      return HttpResponse.json(toPhoto(created), { status: 201 });
    }),

    http.get('/api/v1/projects/:projectId/photos', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectFileParamsSchema.safeParse(params);
      const query = photoListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!path.success || !query.success) return apiError('VALIDATION_ERROR');

      if (!getProjects(account).some((project) => project.id === path.data.projectId)) {
        return apiError('NOT_FOUND');
      }

      const { category, area, workDate, cursor, limit } = query.data;
      const sorted = livePhotos(account, path.data.projectId)
        .filter(
          (photo) =>
            (!category || photo.category === category) &&
            (!area || photo.area === area) &&
            (!workDate || photo.workDate === workDate),
        )
        .sort(newestFirst);
      // 목업의 커서는 읽은 개수
      const start = cursor ? Number(cursor) : 0;
      const page = sorted.slice(start, start + limit);

      return HttpResponse.json({
        items: page.map(toPhoto),
        nextCursor: start + limit < sorted.length ? String(start + limit) : null,
      });
    }),

    http.get('/api/v1/photos/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = photoParamsSchema.safeParse(params);
      const photo = parsed.success
        ? livePhotos(account).find((item) => item.id === parsed.data.id)
        : undefined;

      return photo ? HttpResponse.json(toPhoto(photo)) : apiError('NOT_FOUND');
    }),

    http.patch('/api/v1/photos/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = photoParamsSchema.safeParse(params);
      const body = await parseBody(request, photoUpdateSchema);

      if ('response' in body) return body.response;

      const photo = parsed.success
        ? livePhotos(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!photo) return apiError('NOT_FOUND');

      if (body.data.isCover) {
        livePhotos(account, photo.projectId).forEach((item) => (item.isCover = false));
      }

      Object.assign(photo, body.data);

      return HttpResponse.json(toPhoto(photo));
    }),

    http.delete('/api/v1/photos/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const parsed = photoParamsSchema.safeParse(params);
      const photo = parsed.success
        ? livePhotos(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!photo) return apiError('NOT_FOUND');

      photo.deletedAt = new Date().toISOString();
      photo.isCover = false;

      return HttpResponse.json({ success: true });
    }),
  ];
};

// 응답에는 목업 내부 값(회사 구분, 업로드 여부)을 싣지 않음
const toStoredFile = (file: MockFile): StoredFile => ({
  id: file.id,
  projectId: file.projectId,
  purpose: file.purpose,
  name: file.name,
  contentType: file.contentType,
  size: file.size,
  status: file.status,
  rejectReason: file.rejectReason,
  hasThumbnail: file.hasThumbnail,
  sha256: file.sha256,
  uploadedBy: file.uploadedBy,
  createdAt: file.createdAt,
  readyAt: file.readyAt,
});
