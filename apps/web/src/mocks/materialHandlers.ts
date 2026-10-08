import {
  MATERIAL_MAX_PER_COMPANY,
  compareMaterials,
  materialCreateSchema,
  materialListQuerySchema,
  materialParamsSchema,
  materialRecordBatchSchema,
  materialRecordCreateSchema,
  materialRecordListQuerySchema,
  materialRecordParamsSchema,
  materialRecordUpdateSchema,
  materialUpdateSchema,
  normalizeMaterialText,
  projectFileParamsSchema,
  summarizeMaterialBalance,
  type ErrorCode,
  type Material,
  type MaterialRecord,
  type MaterialRecordCreate,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { getCurrentAccount, getOptions, getPartners, getProjects } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockMaterial = Omit<Material, 'lastUsedOn'> & {
  scope: string;
  nameKey: string;
  specKey: string;
};
type MockRecord = MaterialRecord & { scope: string; deletedAt?: string };

// 목업 저장소: 회사별 자재·기록 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const materials = new Map<string, MockMaterial>();
const records = new Map<string, MockRecord>();
const seeded = new Set<string>();

export const resetMockMaterials = () => {
  materials.clear();
  records.clear();
  seeded.clear();
};

// 목업의 작성자 (계약 스키마가 UUID를 요구)
const MOCK_USER_ID = '0198d000-0000-7000-8000-000000000001';

// 회사 구분 값 (회사가 없는 가입 직후 계정은 계정 단위로 나눔)
const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

const addMaterial = (
  account: MockAccount,
  input: { name: string; spec?: string; unit: string; category: Material['category'] },
) => {
  const material: MockMaterial = {
    id: crypto.randomUUID(),
    scope: scopeOf(account),
    name: input.name,
    nameKey: normalizeMaterialText(input.name),
    spec: input.spec ?? null,
    specKey: normalizeMaterialText(input.spec),
    unit: input.unit,
    category: input.category,
    isActive: true,
  };

  materials.set(material.id, material);

  return material;
};

const addRecord = (
  account: MockAccount,
  projectId: string,
  input: Omit<MaterialRecordCreate, 'isChange' | 'isAfterService'> & {
    isChange?: boolean;
    isAfterService?: boolean;
  },
) => {
  const at = new Date().toISOString();
  const record: MockRecord = {
    id: crypto.randomUUID(),
    scope: scopeOf(account),
    projectId,
    materialId: input.materialId,
    recordDate: input.recordDate,
    kind: input.kind,
    quantity: input.quantity,
    categoryId: input.categoryId ?? null,
    area: input.area ?? null,
    partnerId: input.partnerId ?? null,
    sourceText: input.sourceText ?? null,
    isChange: input.isChange ?? false,
    isAfterService: input.isAfterService ?? false,
    memo: input.memo ?? null,
    createdBy: MOCK_USER_ID,
    createdAt: at,
    updatedAt: at,
  };

  records.set(record.id, record);

  return record;
};

// 더미 자재: 기획서 예시(아연도강판 1.0T 반입 100·사용 72·반출 10·폐기 3 → 잔량 15)와 잔량이 마이너스인 자재 하나
const seed = (account: MockAccount) => {
  if (seeded.has(scopeOf(account))) return;

  seeded.add(scopeOf(account));

  const zinc = addMaterial(account, {
    name: '아연도강판',
    spec: '1.0T',
    unit: '장',
    category: 'RAW',
  });
  const caulk = addMaterial(account, { name: '실리콘 코킹', unit: '개', category: 'CONSUMABLE' });

  addMaterial(account, { name: '피스', spec: '4.2x25', unit: '박스', category: 'SUB' });

  for (const project of getProjects(account)) {
    addRecord(account, project.id, {
      materialId: zinc.id,
      recordDate: '2026-10-05',
      kind: 'RECEIVED',
      quantity: 100,
    });
    addRecord(account, project.id, {
      materialId: zinc.id,
      recordDate: '2026-10-06',
      kind: 'USED',
      quantity: 40,
    });
    addRecord(account, project.id, {
      materialId: zinc.id,
      recordDate: '2026-10-07',
      kind: 'USED',
      quantity: 32,
      isChange: true,
    });
    addRecord(account, project.id, {
      materialId: zinc.id,
      recordDate: '2026-10-07',
      kind: 'RETURNED',
      quantity: 10,
    });
    addRecord(account, project.id, {
      materialId: zinc.id,
      recordDate: '2026-10-07',
      kind: 'DISCARDED',
      quantity: 3,
    });
    addRecord(account, project.id, {
      materialId: caulk.id,
      recordDate: '2026-10-06',
      kind: 'RECEIVED',
      quantity: 5,
    });
    addRecord(account, project.id, {
      materialId: caulk.id,
      recordDate: '2026-10-07',
      kind: 'USED',
      quantity: 8,
    });
  }
};

const liveRecords = (account: MockAccount, projectId?: string) => {
  seed(account);

  return [...records.values()].filter(
    (record) =>
      record.scope === scopeOf(account) &&
      !record.deletedAt &&
      (!projectId || record.projectId === projectId),
  );
};

// 작업일보 목업이 쓰는 자재 기록 조회 (자재 이름·규격·단위를 붙여 돌려줌, 지운 기록 제외)
export const listMockMaterialRecords = (account: MockAccount, projectId: string) =>
  liveRecords(account, projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((record) => {
      const material = materials.get(record.materialId);

      return {
        ...toRecord(record),
        materialName: material?.name ?? '',
        spec: material?.spec ?? null,
        unit: material?.unit ?? '',
      };
    });

const ownMaterials = (account: MockAccount) => {
  seed(account);

  return [...materials.values()].filter((material) => material.scope === scopeOf(account));
};

// 응답에는 목업 내부 값(회사 구분, 비교용 값)을 싣지 않음
const toMaterial = (account: MockAccount, material: MockMaterial): Material => ({
  id: material.id,
  name: material.name,
  spec: material.spec,
  unit: material.unit,
  category: material.category,
  isActive: material.isActive,
  lastUsedOn:
    liveRecords(account)
      .filter((record) => record.materialId === material.id)
      .map((record) => record.recordDate)
      .sort()
      .at(-1) ?? null,
});

const toRecord = (record: MockRecord): MaterialRecord => ({
  id: record.id,
  projectId: record.projectId,
  materialId: record.materialId,
  recordDate: record.recordDate,
  kind: record.kind,
  quantity: record.quantity,
  categoryId: record.categoryId,
  area: record.area,
  partnerId: record.partnerId,
  sourceText: record.sourceText,
  isChange: record.isChange,
  isAfterService: record.isAfterService,
  memo: record.memo,
  createdBy: record.createdBy,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const newestFirst = (a: MockRecord, b: MockRecord) =>
  b.recordDate.localeCompare(a.recordDate) || b.id.localeCompare(a.id);

/**
 * @description 자재 API 목업 핸들러 (실제 서버와 같은 규칙: 이름·규격 중복, 기록이 있으면 단위 변경 불가, 숨긴 자재·다른 회사 참조 거부, 일괄 입력은 전부 저장하거나 전부 거부, 잔량 집계)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createMaterialHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);

  const hasProject = (account: MockAccount, projectId: string) =>
    getProjects(account).some((project) => project.id === projectId);

  // 기록 한 건의 참조 검사: 문제가 있으면 오류 응답을 돌려줌
  const checkReferences = (
    account: MockAccount,
    input: { materialId?: string; categoryId?: string | null; partnerId?: string | null },
    prefix: string,
    currentMaterialId?: string,
  ) => {
    if (input.materialId && input.materialId !== currentMaterialId) {
      const material = ownMaterials(account).find((item) => item.id === input.materialId);

      if (!material || !material.isActive) {
        return apiError('VALIDATION_ERROR', [
          { path: `${prefix}.materialId`, message: '선택할 수 없는 자재입니다' },
        ]);
      }
    }

    if (
      input.categoryId &&
      !getOptions(account).some(
        (option) => option.id === input.categoryId && option.kind === 'WORK_CATEGORY',
      )
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: `${prefix}.categoryId`, message: '선택할 수 없는 작업 구분입니다' },
      ]);
    }

    if (
      input.partnerId &&
      !getPartners(account).some((partner) => partner.id === input.partnerId)
    ) {
      return apiError('VALIDATION_ERROR', [
        { path: `${prefix}.partnerId`, message: '선택할 수 없는 업체입니다' },
      ]);
    }

    return null;
  };

  const unauthorized = () => apiError('UNAUTHORIZED');

  return [
    http.get('/api/v1/materials', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const query = materialListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      const { q, category, includeInactive } = query.data;
      const keyword = q?.toLowerCase();

      return HttpResponse.json({
        items: ownMaterials(account)
          .filter(
            (material) =>
              (includeInactive || material.isActive) &&
              (!category || material.category === category) &&
              (!keyword ||
                material.name.toLowerCase().includes(keyword) ||
                (material.spec ?? '').toLowerCase().includes(keyword)),
          )
          .map((material) => toMaterial(account, material))
          .sort(compareMaterials),
      });
    }),

    http.post('/api/v1/materials', async ({ request }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const body = await parseBody(request, materialCreateSchema);

      if ('response' in body) return body.response;

      const own = ownMaterials(account);

      if (own.length >= MATERIAL_MAX_PER_COMPANY) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body', message: '자재는 회사마다 2000개까지 등록할 수 있습니다' },
        ]);
      }

      const nameKey = normalizeMaterialText(body.data.name);
      const specKey = normalizeMaterialText(body.data.spec);

      if (own.some((material) => material.nameKey === nameKey && material.specKey === specKey)) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.name', message: '같은 이름과 규격의 자재가 이미 있습니다' },
        ]);
      }

      return HttpResponse.json(toMaterial(account, addMaterial(account, body.data)), {
        status: 201,
      });
    }),

    http.patch('/api/v1/materials/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const parsed = materialParamsSchema.safeParse(params);
      const body = await parseBody(request, materialUpdateSchema);

      if ('response' in body) return body.response;

      const material = parsed.success
        ? ownMaterials(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!material) return apiError('NOT_FOUND');

      const name = body.data.name ?? material.name;
      const spec = body.data.spec === undefined ? material.spec : body.data.spec;
      const nameKey = normalizeMaterialText(name);
      const specKey = normalizeMaterialText(spec);

      if (
        ownMaterials(account).some(
          (item) => item.id !== material.id && item.nameKey === nameKey && item.specKey === specKey,
        )
      ) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.name', message: '같은 이름과 규격의 자재가 이미 있습니다' },
        ]);
      }

      if (
        body.data.unit !== undefined &&
        body.data.unit !== material.unit &&
        [...records.values()].some((record) => record.materialId === material.id)
      ) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.unit', message: '기록이 있는 자재는 단위를 바꿀 수 없습니다' },
        ]);
      }

      Object.assign(material, {
        name,
        nameKey,
        spec,
        specKey,
        unit: body.data.unit ?? material.unit,
        category: body.data.category ?? material.category,
        isActive: body.data.isActive ?? material.isActive,
      });

      return HttpResponse.json(toMaterial(account, material));
    }),

    http.post('/api/v1/projects/:projectId/material-records/batch', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const body = await parseBody(request, materialRecordBatchSchema);

      if ('response' in body) return body.response;

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      // 한 건이라도 잘못되면 전부 저장하지 않음
      for (const [index, input] of body.data.records.entries()) {
        const problem = checkReferences(account, input, `body.records.${index}`);

        if (problem) return problem;
      }

      return HttpResponse.json(
        {
          items: body.data.records.map((input) =>
            toRecord(addRecord(account, path.data.projectId, input)),
          ),
        },
        { status: 201 },
      );
    }),

    http.post('/api/v1/projects/:projectId/material-records', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const body = await parseBody(request, materialRecordCreateSchema);

      if ('response' in body) return body.response;

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      const problem = checkReferences(account, body.data, 'body');

      if (problem) return problem;

      return HttpResponse.json(toRecord(addRecord(account, path.data.projectId, body.data)), {
        status: 201,
      });
    }),

    http.get('/api/v1/projects/:projectId/material-records', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);
      const query = materialRecordListQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      if (!query.success) return apiError('VALIDATION_ERROR');

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      const { date, materialId, kind, cursor, limit } = query.data;
      const sorted = liveRecords(account, path.data.projectId)
        .filter(
          (record) =>
            (!date || record.recordDate === date) &&
            (!materialId || record.materialId === materialId) &&
            (!kind || record.kind === kind),
        )
        .sort(newestFirst);
      // 목업의 커서는 읽은 개수
      const start = cursor ? Number(cursor) : 0;

      return HttpResponse.json({
        items: sorted.slice(start, start + limit).map(toRecord),
        nextCursor: start + limit < sorted.length ? String(start + limit) : null,
      });
    }),

    http.get('/api/v1/projects/:projectId/material-balance', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const path = projectFileParamsSchema.safeParse(params);

      if (!path.success || !hasProject(account, path.data.projectId)) return apiError('NOT_FOUND');

      return HttpResponse.json({
        items: summarizeMaterialBalance(
          liveRecords(account, path.data.projectId),
          ownMaterials(account),
        ),
      });
    }),

    http.patch('/api/v1/material-records/:id', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const parsed = materialRecordParamsSchema.safeParse(params);
      const body = await parseBody(request, materialRecordUpdateSchema);

      if ('response' in body) return body.response;

      const record = parsed.success
        ? liveRecords(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!record) return apiError('NOT_FOUND');

      const problem = checkReferences(account, body.data, 'body', record.materialId);

      if (problem) return problem;

      Object.assign(record, {
        ...Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== undefined)),
        updatedAt: new Date().toISOString(),
      });

      return HttpResponse.json(toRecord(record));
    }),

    http.delete('/api/v1/material-records/:id', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return unauthorized();

      const parsed = materialRecordParamsSchema.safeParse(params);
      const record = parsed.success
        ? liveRecords(account).find((item) => item.id === parsed.data.id)
        : undefined;

      if (!record) return apiError('NOT_FOUND');

      record.deletedAt = new Date().toISOString();

      return HttpResponse.json({ success: true });
    }),
  ];
};
