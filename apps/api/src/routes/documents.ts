import {
  documentAccessLogsResponseSchema,
  documentAccessQuerySchema,
  documentAccessUrlSchema,
  documentCreateSchema,
  documentDetailSchema,
  documentListQuerySchema,
  documentParamsSchema,
  documentUpdateSchema,
  documentVersionCreateSchema,
  documentVersionParamsSchema,
  documentsResponseSchema,
  projectFileParamsSchema,
  successResponseSchema,
  type DocumentAccessQuery,
  type DocumentCreate,
  type DocumentListQuery,
  type DocumentUpdate,
  type DocumentVersionCreate,
} from '@field-note/shared';

import { DocumentError, type DocumentService } from '../document/documentService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof DocumentError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 작업자료 문서함 라우트. 회사 ID는 세션에서만 얻는다 (파일 올리기는 파일 라우트, 여기서는 문서·버전·열람)
 * @param registry 라우트 등록소
 * @param documents 문서 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerDocumentRoutes = (registry: RouteRegistry, documents?: DocumentService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, documents ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/documents',
      summary:
        '올린 파일로 문서 만들기 (첫 버전, 계약·행정은 기본 민감 자료, 같은 파일로 다시 부르면 같은 문서)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: documentCreateSchema },
      response: { status: 201, schema: documentDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await documents!.create(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          body as DocumentCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/documents',
      summary: '프로젝트 문서함 (고정한 문서가 먼저, 분류·이름·고정 필터, 문서마다 최신본)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: documentListQuerySchema },
      response: { status: 200, schema: documentsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await documents!.list(
          auth!.companyId,
          (params as { projectId: string }).projectId,
          query as DocumentListQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/documents/{id}',
      summary: '문서 한 건 (최신본과 이전 버전 전체)',
      auth: 'required',
      request: { params: documentParamsSchema },
      response: { status: 200, schema: documentDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await documents!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/documents/{id}',
      summary: '문서 이름·분류·민감 표시·프로젝트 첫 화면 고정 수정',
      auth: 'required',
      request: { params: documentParamsSchema, body: documentUpdateSchema },
      response: { status: 200, schema: documentDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await documents!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as DocumentUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/documents/{id}',
      summary: '문서 삭제 (소프트 삭제: 파일·버전·열람 기록은 보존)',
      auth: 'required',
      request: { params: documentParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        await documents!.remove(auth!.companyId, (params as { id: string }).id);

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/documents/{id}/versions',
      summary: '새 버전 추가 (최신본이 기본으로 보이고 이전본은 보존, 개정일·사유 기록)',
      auth: 'required',
      request: { params: documentParamsSchema, body: documentVersionCreateSchema },
      response: { status: 201, schema: documentDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await documents!.addVersion(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as DocumentVersionCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/documents/{id}/versions/{versionNo}/url',
      summary: '열람·내려받기 주소 발급 (짧은 만료, 민감 자료는 열람 기록을 남긴 뒤에만 발급)',
      auth: 'required',
      request: { params: documentVersionParamsSchema, query: documentAccessQuerySchema },
      response: { status: 200, schema: documentAccessUrlSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        const { id, versionNo } = params as { id: string; versionNo: number };

        return await documents!.access(
          auth!.companyId,
          auth!.userId,
          id,
          versionNo,
          query as DocumentAccessQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/documents/{id}/access-logs',
      summary: '민감 자료 열람·내려받기 기록 (최근순, 수정·삭제할 수 없는 감사 기록)',
      auth: 'required',
      request: { params: documentParamsSchema },
      response: { status: 200, schema: documentAccessLogsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await documents!.accessLogs(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
