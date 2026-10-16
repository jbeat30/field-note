import {
  changeUsageSchema,
  changeWorkCreateSchema,
  changeWorkDetailSchema,
  changeWorkDocumentParamsSchema,
  changeWorkEvidenceCreateSchema,
  changeWorkLinkSchema,
  changeWorkListQuerySchema,
  changeWorkParamsSchema,
  changeWorkTransitionSchema,
  changeWorkUnlinkQuerySchema,
  changeWorkUpdateSchema,
  changeWorksResponseSchema,
  projectParamsSchema,
  type ChangeWorkCreate,
  type ChangeWorkEvidenceCreate,
  type ChangeWorkLink,
  type ChangeWorkListQuery,
  type ChangeWorkTransition,
  type ChangeWorkUnlinkQuery,
  type ChangeWorkUpdate,
} from '@field-note/shared';

import { ChangeWorkError, type ChangeWorkService } from '../changeWork/changeWorkService';
import { DocumentError, type DocumentService } from '../document/documentService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof ChangeWorkError) && !(error instanceof DocumentError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 변경·추가 작업 라우트, 회사 ID·작성자는 세션에서만 획득, 삭제 API 없이 상태(협의 중·합의됨·철회)와 이력으로 표현
 * @param registry 라우트 등록소
 * @param changeWorks 변경·추가 작업 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 * @param documents 문서함 서비스 (증빙 올리기에서 문서 생성)
 */
export const registerChangeWorkRoutes = (
  registry: RouteRegistry,
  changeWorks?: ChangeWorkService,
  documents?: DocumentService,
) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, changeWorks && documents ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/change-works',
      summary: '프로젝트 변경·추가 작업 목록 (번호 큰 것이 먼저, 상태 필터)',
      auth: 'required',
      request: { params: projectParamsSchema, query: changeWorkListQuerySchema },
      response: { status: 200, schema: changeWorksResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return {
          items: await changeWorks!.list(
            auth!.companyId,
            (params as { id: string }).id,
            (query as ChangeWorkListQuery).status,
          ),
        };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/change-works',
      summary: '변경·추가 작업 기록 (예정·진행·중단, 완료는 확인 필요, 협의 중으로 시작)',
      auth: 'required',
      request: { params: projectParamsSchema, body: changeWorkCreateSchema },
      response: { status: 201, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await changeWorks!.create(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as ChangeWorkCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/change-usage',
      summary: '변경·추가 작업으로 쓴 공수·자재 (작업 내역·자재 기록의 변경 작업 표시 합계)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: changeUsageSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await changeWorks!.usage(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/change-works/{id}',
      summary: '변경·추가 작업 상세 (상태 이력과 증빙 문서 포함)',
      auth: 'required',
      request: { params: changeWorkParamsSchema },
      response: { status: 200, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await changeWorks!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/change-works/{id}',
      summary: '변경·추가 작업 수정 (협의 중일 때만 요청일·요청자·내용)',
      auth: 'required',
      request: { params: changeWorkParamsSchema, body: changeWorkUpdateSchema },
      response: { status: 200, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await changeWorks!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as ChangeWorkUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/change-works/{id}/status',
      summary: '변경·추가 작업 상태 변경 (협의 중·합의됨·철회, 철회는 사유 필수, 이력으로 남음)',
      auth: 'required',
      request: { params: changeWorkParamsSchema, body: changeWorkTransitionSchema },
      response: { status: 200, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await changeWorks!.transition(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as ChangeWorkTransition,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/change-works/{id}/documents',
      summary: '증빙 문서 연결 (같은 프로젝트의 문서함 문서)',
      auth: 'required',
      request: { params: changeWorkParamsSchema, body: changeWorkLinkSchema },
      response: { status: 201, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await changeWorks!.linkDocument(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as ChangeWorkLink,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/change-works/{id}/evidence',
      summary:
        '증빙 올리기 (올린 파일로 문서함에 계약·공문 문서를 만들고 이 변경·추가 작업에 한 번에 연결, 같은 파일로 다시 부르면 이미 만든 증빙을 돌려줌)',
      auth: 'required',
      request: { params: changeWorkParamsSchema, body: changeWorkEvidenceCreateSchema },
      response: { status: 201, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      const { id } = params as { id: string };
      const input = body as ChangeWorkEvidenceCreate;

      try {
        // 기록할 수 없는 상태(취소·완료 미확인 등)는 문서 생성 전에 차단
        const { projectId } = await changeWorks!.evidenceTarget(
          auth!.companyId,
          id,
          input.confirmCompleted,
        );
        const document = await documents!.create(auth!.companyId, auth!.userId, projectId, {
          fileId: input.fileId,
          title: input.title,
          category: 'CONTRACT',
        });

        try {
          return await changeWorks!.linkDocument(auth!.companyId, auth!.userId, id, {
            documentId: document.id,
            confirmCompleted: input.confirmCompleted,
          });
        } catch (error) {
          // 같은 파일로 다시 부른 경우: 이미 연결돼 있으면 그대로 돌려줌
          if (
            error instanceof ChangeWorkError &&
            error.detail?.message === '이미 연결된 문서입니다'
          ) {
            return await changeWorks!.get(auth!.companyId, id);
          }

          throw error;
        }
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/change-works/{id}/documents/{documentId}',
      summary: '증빙 문서 연결 해제 (연결 기록은 남고 해제 시각만 기록)',
      auth: 'required',
      request: { params: changeWorkDocumentParamsSchema, query: changeWorkUnlinkQuerySchema },
      response: { status: 200, schema: changeWorkDetailSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      const { id, documentId } = params as { id: string; documentId: string };

      try {
        return await changeWorks!.unlinkDocument(
          auth!.companyId,
          id,
          documentId,
          (query as ChangeWorkUnlinkQuery).confirmCompleted === 'true',
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
