import {
  progressRecordCreateSchema,
  progressRecordSchema,
  progressRecordsResponseSchema,
  projectHealthSchema,
  projectParamsSchema,
  type ProgressRecordCreate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { ProgressError, type ProgressService } from '../progress/progressService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof ProgressError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 진행률·진행 점검 라우트 (프로젝트 아래). 회사 ID·기록자는 세션에서만 얻는다. 기록의 수정·삭제 API는 없다
 * @param registry 라우트 등록소
 * @param progress 진행률 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerProgressRoutes = (registry: RouteRegistry, progress?: ProgressService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, progress ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/progress',
      summary: '진행률 기록 목록 (기준일 최근순)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: progressRecordsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return {
          items: await progress!.list(auth!.companyId, (params as { id: string }).id),
        };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/progress',
      summary: '진행률 기록 추가 (예정·진행·중단에서만, 고치거나 지우지 않고 새로 기록)',
      auth: 'required',
      request: { params: projectParamsSchema, body: progressRecordCreateSchema },
      response: { status: 201, schema: progressRecordSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await progress!.create(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as ProgressRecordCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/health',
      summary: '프로젝트 진행 점검 (공수 소진율, 현재 진행률, 예상 필요 공수, 경고)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: projectHealthSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await progress!.health(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
