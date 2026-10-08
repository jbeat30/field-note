import {
  memoCreateSchema,
  memoListQuerySchema,
  memoParamsSchema,
  memoSchema,
  memoSummarySchema,
  memoUpdateSchema,
  memosResponseSchema,
  successResponseSchema,
  type MemoCreate,
  type MemoListQuery,
  type MemoUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { MemoError, type MemoService } from '../memo/memoService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof MemoError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 메모함·프로젝트 메모 노트 라우트. 회사 ID는 세션에서만 얻는다
 * @param registry 라우트 등록소
 * @param memos 메모 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerMemoRoutes = (registry: RouteRegistry, memos?: MemoService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, memos ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/memos',
      summary: '메모 저장 (프로젝트를 정하지 않으면 메모함, 한 줄만 적어도 저장)',
      auth: 'required',
      request: { body: memoCreateSchema },
      response: { status: 201, schema: memoSchema },
    },
    async ({ auth, body }) => {
      try {
        return await memos!.create(auth!.companyId, auth!.userId, body as MemoCreate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/memos',
      summary:
        '메모함(scope=INBOX) 또는 프로젝트 메모 노트(scope=PROJECT) 목록 (날짜 최근순, 태그·완료 필터, 커서 방식)',
      auth: 'required',
      request: { query: memoListQuerySchema },
      response: { status: 200, schema: memosResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, query }) => {
      try {
        return await memos!.list(auth!.companyId, query as MemoListQuery);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/memos/summary',
      summary: '정리 안 된 메모함 건수와 끝내지 않은 할 일 건수',
      auth: 'required',
      response: { status: 200, schema: memoSummarySchema },
    },
    async ({ auth }) => memos!.summary(auth!.companyId),
  );

  add(
    {
      method: 'get',
      path: '/memos/{id}',
      summary: '메모 한 건',
      auth: 'required',
      request: { params: memoParamsSchema },
      response: { status: 200, schema: memoSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await memos!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/memos/{id}',
      summary: '메모 수정·프로젝트 연결(메모함 정리)·할 일 완료 표시',
      auth: 'required',
      request: { params: memoParamsSchema, body: memoUpdateSchema },
      response: { status: 200, schema: memoSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await memos!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as MemoUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/memos/{id}',
      summary: '메모 삭제 (소프트 삭제)',
      auth: 'required',
      request: { params: memoParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        await memos!.remove(auth!.companyId, (params as { id: string }).id);

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
