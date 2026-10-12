import {
  credentialCreateSchema,
  credentialDaysLeft,
  credentialParamsSchema,
  credentialStatus,
  credentialUpdateSchema,
  employeeParamsSchema,
  findCredentialGaps,
  normalizeOptionName,
  projectParamsSchema,
  requiredCredentialsSchema,
  sortCredentials,
  todayInSeoul,
  type AssignmentWarning,
  type EmployeeCredential,
  type ErrorCode,
} from '@field-note/shared';
import { delay, http, HttpResponse } from 'msw';
import type { ZodType } from 'zod';

import type { MockAccount } from './data';
import { DEMO_CREDENTIALS, DEMO_REQUIRED_CREDENTIALS } from './demoSource';
import { getMockFile } from './photoHandlers';
import { getCurrentAccount, getEmployees, getOptions, getProjects } from './state';

type Helpers = {
  apiError: (code: ErrorCode, details?: { path: string; message: string }[]) => Response;
  parseBody: <T>(
    request: Request,
    schema: ZodType<T>,
  ) => Promise<{ data: T } | { response: Response }>;
};

type MockCredential = {
  id: string;
  employeeId: string;
  typeId: string;
  issuedOn: string | null;
  expiresOn: string | null;
  fileId: string | null;
  memo: string | null;
  createdAt: string;
  removedAt: string | null;
};

type Store = {
  credentials: MockCredential[];
  // 프로젝트별 필요 자격 종류
  required: Map<string, string[]>;
};

// 목업 저장소: 회사별 직원 서류·필요 자격 (새로고침하면 초기화). 실제 서버가 하는 일을 흉내 낸다
const stores = new Map<string, Store>();

export const resetMockCredentials = () => stores.clear();

const scopeOf = (account: MockAccount) => account.companyId ?? account.loginId;

// 더미 서류·필요 자격은 DB 시드와 같은 원본을 쓴다 (자격 종류는 선택 목록 이름, 프로젝트는 코드로 연결)
const storeOf = (account: MockAccount): Store => {
  const existing = stores.get(scopeOf(account));

  if (existing) return existing;

  const options = getOptions(account);
  const typeIdOf = (name: string) =>
    options.find(
      (item) =>
        item.kind === 'CREDENTIAL_TYPE' &&
        normalizeOptionName(item.name) === normalizeOptionName(name),
    )?.id;
  const store: Store = { credentials: [], required: new Map() };

  for (const item of DEMO_CREDENTIALS.filter((demo) => demo.companyId === account.companyId)) {
    const typeId = typeIdOf(item.typeName);

    if (!typeId) continue;

    store.credentials.push({
      id: crypto.randomUUID(),
      employeeId: item.employeeId,
      typeId,
      issuedOn: item.issuedOn ?? null,
      expiresOn: item.expiresOn ?? null,
      fileId: null,
      memo: item.memo ?? null,
      createdAt: '2026-10-01T00:00:00.000Z',
      removedAt: null,
    });
  }

  const projects = getProjects(account);

  for (const item of DEMO_REQUIRED_CREDENTIALS.filter(
    (demo) => demo.companyId === account.companyId,
  )) {
    const project = projects.find((candidate) => candidate.code === item.projectCode);

    if (!project) continue;

    store.required.set(
      project.id,
      item.typeNames.flatMap((name) => typeIdOf(name) ?? []),
    );
  }

  stores.set(scopeOf(account), store);

  return store;
};

/**
 * @description 투입 응답에 붙는 필요 자격 경고 (서버와 같은 규칙)
 * @param account 현재 계정
 * @param projectId 프로젝트
 * @param employeeId 직원
 * @param period 투입 기간
 * @returns 자격 경고 목록
 */
export const mockCredentialWarnings = (
  account: MockAccount,
  projectId: string,
  employeeId: string,
  period: { from: string; to: string },
): AssignmentWarning[] => {
  const store = storeOf(account);
  const required = store.required.get(projectId) ?? [];
  const names = new Map(getOptions(account).map((item) => [item.id, item.name]));
  const held = store.credentials.filter(
    (item) => item.employeeId === employeeId && !item.removedAt,
  );

  return findCredentialGaps(required, held, period).map((gap) => ({
    type: 'CREDENTIAL' as const,
    typeId: gap.typeId,
    typeName: names.get(gap.typeId) ?? '',
    reason: gap.reason,
    expiresOn: gap.expiresOn,
  }));
};

const toCredential = (account: MockAccount, row: MockCredential): EmployeeCredential => {
  const today = todayInSeoul(new Date());
  const type = getOptions(account).find((item) => item.id === row.typeId);
  const file = row.fileId ? getMockFile(row.fileId) : undefined;

  return {
    id: row.id,
    employeeId: row.employeeId,
    typeId: row.typeId,
    typeName: type?.name ?? '',
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    status: credentialStatus(row.expiresOn, today),
    daysLeft: credentialDaysLeft(row.expiresOn, today),
    memo: row.memo,
    file: file
      ? {
          id: file.id,
          name: file.name,
          contentType: file.contentType,
          size: file.size,
          status: file.status,
        }
      : null,
    createdAt: row.createdAt,
  };
};

/**
 * @description 직원 서류·필요 자격 API 목업 핸들러 (서버와 같은 규칙: 자격 종류 목록 확인, 이 직원의 서류 파일만 연결)
 * @param helpers 공통 오류 응답과 본문 검증 함수 (handlers.ts와 같은 규칙)
 * @returns msw 핸들러 목록
 */
export const createCredentialHandlers = ({ apiError, parseBody }: Helpers) => {
  const latency = () => delay(300);

  // 자격 종류 목록에 있고 새로 쓰는 종류는 사용 중이어야 함
  const typeError = (account: MockAccount, typeId: string, path: string) => {
    const type = getOptions(account).find(
      (item) => item.id === typeId && item.kind === 'CREDENTIAL_TYPE',
    );

    if (!type) {
      return apiError('VALIDATION_ERROR', [{ path, message: '자격 종류 목록에 없는 종류입니다' }]);
    }

    return type.isActive
      ? null
      : apiError('VALIDATION_ERROR', [{ path, message: '사용하지 않는 종류입니다' }]);
  };

  const fileError = (employeeId: string, fileId: string) => {
    const file = getMockFile(fileId);

    if (!file || file.employeeId !== employeeId || file.purpose !== 'EMPLOYEE_DOCUMENT') {
      return apiError('VALIDATION_ERROR', [
        { path: 'body.fileId', message: '이 직원의 서류로 올린 파일이 아닙니다' },
      ]);
    }

    return file.status === 'REJECTED'
      ? apiError('VALIDATION_ERROR', [
          { path: 'body.fileId', message: '검사에서 거부된 파일은 연결할 수 없습니다' },
        ])
      : null;
  };

  const requiredResponse = (account: MockAccount, projectId: string) => {
    const names = new Map(getOptions(account).map((item) => [item.id, item]));

    return {
      items: (storeOf(account).required.get(projectId) ?? []).map((typeId) => ({
        typeId,
        typeName: names.get(typeId)?.name ?? '',
      })),
    };
  };

  return [
    http.get('/api/v1/employees/:id/credentials', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = employeeParamsSchema.safeParse(params);

      if (!path.success || !getEmployees(account).some((item) => item.id === path.data.id)) {
        return apiError('NOT_FOUND');
      }

      return HttpResponse.json({
        items: sortCredentials(
          storeOf(account)
            .credentials.filter((item) => item.employeeId === path.data.id && !item.removedAt)
            .map((item) => toCredential(account, item)),
        ),
      });
    }),

    http.post('/api/v1/employees/:id/credentials', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = employeeParamsSchema.safeParse(params);

      if (!path.success || !getEmployees(account).some((item) => item.id === path.data.id)) {
        return apiError('NOT_FOUND');
      }

      const body = await parseBody(request, credentialCreateSchema);

      if ('response' in body) return body.response;

      const input = body.data;
      const problem =
        typeError(account, input.typeId, 'body.typeId') ??
        (input.fileId ? fileError(path.data.id, input.fileId) : null);

      if (problem) return problem;

      const row: MockCredential = {
        id: crypto.randomUUID(),
        employeeId: path.data.id,
        typeId: input.typeId,
        issuedOn: input.issuedOn ?? null,
        expiresOn: input.expiresOn ?? null,
        fileId: input.fileId ?? null,
        memo: input.memo || null,
        createdAt: new Date().toISOString(),
        removedAt: null,
      };

      storeOf(account).credentials.push(row);

      return HttpResponse.json(toCredential(account, row), { status: 201 });
    }),

    http.patch('/api/v1/employees/:id/credentials/:credentialId', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = credentialParamsSchema.safeParse(params);
      const row = path.success
        ? storeOf(account).credentials.find(
            (item) =>
              item.id === path.data.credentialId &&
              item.employeeId === path.data.id &&
              !item.removedAt,
          )
        : undefined;

      if (!path.success || !row) return apiError('NOT_FOUND');

      const body = await parseBody(request, credentialUpdateSchema);

      if ('response' in body) return body.response;

      const input = body.data;
      const problem =
        (input.typeId !== undefined && input.typeId !== row.typeId
          ? typeError(account, input.typeId, 'body.typeId')
          : null) ??
        (input.fileId && input.fileId !== row.fileId
          ? fileError(row.employeeId, input.fileId)
          : null);

      if (problem) return problem;

      const issuedOn = input.issuedOn !== undefined ? input.issuedOn : row.issuedOn;
      const expiresOn = input.expiresOn !== undefined ? input.expiresOn : row.expiresOn;

      if (issuedOn && expiresOn && issuedOn > expiresOn) {
        return apiError('VALIDATION_ERROR', [
          { path: 'body.expiresOn', message: '만료일은 취득일보다 빠를 수 없습니다' },
        ]);
      }

      if (input.typeId !== undefined) row.typeId = input.typeId;

      row.issuedOn = issuedOn ?? null;
      row.expiresOn = expiresOn ?? null;

      if (input.fileId !== undefined) row.fileId = input.fileId;
      if (input.memo !== undefined) row.memo = input.memo || null;

      return HttpResponse.json(toCredential(account, row));
    }),

    http.delete('/api/v1/employees/:id/credentials/:credentialId', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = credentialParamsSchema.safeParse(params);
      const row = path.success
        ? storeOf(account).credentials.find(
            (item) =>
              item.id === path.data.credentialId &&
              item.employeeId === path.data.id &&
              !item.removedAt,
          )
        : undefined;

      if (!row) return apiError('NOT_FOUND');

      row.removedAt = new Date().toISOString();

      return HttpResponse.json({ success: true });
    }),

    http.get('/api/v1/employees/:id/credentials/:credentialId/file-url', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = credentialParamsSchema.safeParse(params);
      const row = path.success
        ? storeOf(account).credentials.find(
            (item) =>
              item.id === path.data.credentialId &&
              item.employeeId === path.data.id &&
              !item.removedAt,
          )
        : undefined;
      const file = row?.fileId ? getMockFile(row.fileId) : undefined;

      if (!row || !file) return apiError('NOT_FOUND');

      if (file.status !== 'READY') {
        return apiError('VALIDATION_ERROR', [
          { path: 'params.credentialId', message: '검사가 끝난 파일만 열 수 있습니다' },
        ]);
      }

      // 목업은 실제 파일이 없으므로 이름을 담은 안내 이미지를 돌려줌
      return HttpResponse.json({
        url: `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#eef"/><text x="24" y="160" font-size="20">${file.name.replace(/[<>&]/g, '')}</text></svg>`,
        )}`,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    }),

    http.get('/api/v1/projects/:id/required-credentials', async ({ params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectParamsSchema.safeParse(params);

      if (!path.success || !getProjects(account).some((item) => item.id === path.data.id)) {
        return apiError('NOT_FOUND');
      }

      return HttpResponse.json(requiredResponse(account, path.data.id));
    }),

    http.put('/api/v1/projects/:id/required-credentials', async ({ request, params }) => {
      await latency();

      const account = getCurrentAccount();

      if (!account) return apiError('UNAUTHORIZED');

      const path = projectParamsSchema.safeParse(params);

      if (!path.success || !getProjects(account).some((item) => item.id === path.data.id)) {
        return apiError('NOT_FOUND');
      }

      const body = await parseBody(request, requiredCredentialsSchema);

      if ('response' in body) return body.response;

      const store = storeOf(account);
      const wanted = [...new Set(body.data.typeIds)];
      const kept = new Set(store.required.get(path.data.id) ?? []);

      for (const typeId of wanted.filter((id) => !kept.has(id))) {
        const problem = typeError(account, typeId, 'body.typeIds');

        if (problem) return problem;
      }

      store.required.set(path.data.id, wanted);

      return HttpResponse.json(requiredResponse(account, path.data.id));
    }),
  ];
};
