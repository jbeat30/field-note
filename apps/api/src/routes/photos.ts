import {
  photoCreateSchema,
  photoListQuerySchema,
  photoParamsSchema,
  photoSchema,
  photoUpdateSchema,
  photosResponseSchema,
  projectFileParamsSchema,
  successResponseSchema,
  type PhotoCreate,
  type PhotoListQuery,
  type PhotoUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { PhotoError, type PhotoService } from '../photo/photoService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof PhotoError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 작업 사진 라우트. 회사 ID는 세션에서만 얻는다 (파일 올리기는 파일 라우트, 여기서는 사진 기록 등록·사진첩 조회·수정·삭제)
 * @param registry 라우트 등록소
 * @param photos 사진 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerPhotoRoutes = (registry: RouteRegistry, photos?: PhotoService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, photos ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/photos',
      summary: '올린 파일을 사진으로 등록 (같은 파일을 다시 등록하면 기존 사진을 돌려줌)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: photoCreateSchema },
      response: { status: 201, schema: photoSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await photos!.create(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          body as PhotoCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/photos',
      summary: '사진첩 (촬영일시 최근순, 구분·구역·작업일 필터, 커서 방식)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: photoListQuerySchema },
      response: { status: 200, schema: photosResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await photos!.list(
          auth!.companyId,
          (params as { projectId: string }).projectId,
          query as PhotoListQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/photos/{id}',
      summary: '사진 한 장',
      auth: 'required',
      request: { params: photoParamsSchema },
      response: { status: 200, schema: photoSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await photos!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/photos/{id}',
      summary: '사진 정보 수정·대표 사진 지정 (대표는 프로젝트마다 한 장)',
      auth: 'required',
      request: { params: photoParamsSchema, body: photoUpdateSchema },
      response: { status: 200, schema: photoSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await photos!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as PhotoUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/photos/{id}',
      summary: '사진 삭제 (소프트 삭제: 파일과 기록은 보존)',
      auth: 'required',
      request: { params: photoParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        await photos!.remove(auth!.companyId, (params as { id: string }).id);

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
