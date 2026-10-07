import {
  workLogListQuerySchema,
  workLogParamsSchema,
  workLogRevisionsSchema,
  workLogSaveSchema,
  workLogSchema,
  workLogsResponseSchema,
  projectParamsSchema,
  type WorkLogListQuery,
  type WorkLogSave,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { WorkLogError, type WorkLogService } from '../workLog/workLogService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof WorkLogError)) {
    return error;
  }

  if (error.code === 'NOT_FOUND') return new AppError('NOT_FOUND');
  if (error.code === 'CONFLICT') return new AppError('CONFLICT');

  return new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 작업일지 라우트 (프로젝트 아래, 날짜마다 한 건). 회사 ID는 세션에서만 얻는다. 삭제 API는 없다
 * @param registry 라우트 등록소
 * @param workLogs 작업일지 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerWorkLogRoutes = (registry: RouteRegistry, workLogs?: WorkLogService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, workLogs ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/work-logs',
      summary: '프로젝트 작업일지 목록 (날짜·상태 필터, 공수 합과 임시 저장 표시)',
      auth: 'required',
      request: { params: projectParamsSchema, query: workLogListQuerySchema },
      response: { status: 200, schema: workLogsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return {
          items: await workLogs!.list(
            auth!.companyId,
            (params as { id: string }).id,
            query as WorkLogListQuery,
          ),
        };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/work-logs/{workDate}',
      summary: '그날의 작업일지 (공수 항목과 경고 포함)',
      auth: 'required',
      request: { params: workLogParamsSchema },
      response: { status: 200, schema: workLogSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      const { id, workDate } = params as { id: string; workDate: string };

      try {
        return await workLogs!.get(auth!.companyId, id, workDate);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'put',
      path: '/projects/{id}/work-logs/{workDate}',
      summary: '그날의 작업일지 임시 저장·저장 (없으면 만들고 있으면 고침, 낙관적 잠금)',
      auth: 'required',
      request: { params: workLogParamsSchema, body: workLogSaveSchema },
      response: { status: 200, schema: workLogSchema },
      errors: ['NOT_FOUND', 'CONFLICT'],
    },
    async ({ auth, params, body }) => {
      const { id, workDate } = params as { id: string; workDate: string };

      try {
        return await workLogs!.save(
          auth!.companyId,
          auth!.userId,
          id,
          workDate,
          body as WorkLogSave,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/work-logs/{workDate}/revisions',
      summary: '작업일지 수정 이력 (고치기 전 값, 최근이 맨 앞)',
      auth: 'required',
      request: { params: workLogParamsSchema },
      response: { status: 200, schema: workLogRevisionsSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      const { id, workDate } = params as { id: string; workDate: string };

      try {
        return { items: await workLogs!.revisions(auth!.companyId, id, workDate) };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
