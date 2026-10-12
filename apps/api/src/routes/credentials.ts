import {
  credentialCreateSchema,
  credentialParamsSchema,
  credentialUpdateSchema,
  employeeCredentialSchema,
  employeeCredentialsResponseSchema,
  employeeParamsSchema,
  fileUrlResponseSchema,
  projectParamsSchema,
  requiredCredentialsResponseSchema,
  requiredCredentialsSchema,
  successResponseSchema,
  type CredentialCreate,
  type CredentialUpdate,
  type RequiredCredentials,
} from '@field-note/shared';
import { CredentialError, type CredentialService } from '../credential/credentialService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof CredentialError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 직원 서류·자격 라우트. 회사 ID·등록자는 세션에서만 얻는다. 서류 파일 열람은 감사 기록으로 남는다
 * @param registry 라우트 등록소
 * @param credentials 서류 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerCredentialRoutes = (
  registry: RouteRegistry,
  credentials?: CredentialService,
) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, credentials ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/employees/{id}/credentials',
      summary: '직원 서류·자격 목록 (만료가 빠른 순, 오늘 기준 상태 포함)',
      auth: 'required',
      request: { params: employeeParamsSchema },
      response: { status: 200, schema: employeeCredentialsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await credentials!.list(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/employees/{id}/credentials',
      summary: '직원 서류·자격 등록 (종류만 있어도 등록, 파일은 직원 서류로 올린 것 연결)',
      auth: 'required',
      request: { params: employeeParamsSchema, body: credentialCreateSchema },
      response: { status: 201, schema: employeeCredentialSchema },
      errors: ['NOT_FOUND', 'VALIDATION_ERROR'],
    },
    async ({ auth, params, body }) => {
      try {
        return await credentials!.create(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as CredentialCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/employees/{id}/credentials/{credentialId}',
      summary: '직원 서류·자격 수정 (종류·날짜·파일·메모, 갱신하면 만료일을 바꿈)',
      auth: 'required',
      request: { params: credentialParamsSchema, body: credentialUpdateSchema },
      response: { status: 200, schema: employeeCredentialSchema },
      errors: ['NOT_FOUND', 'VALIDATION_ERROR'],
    },
    async ({ auth, params, body }) => {
      const { id, credentialId } = params as { id: string; credentialId: string };

      try {
        return await credentials!.update(
          auth!.companyId,
          id,
          credentialId,
          body as CredentialUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/employees/{id}/credentials/{credentialId}',
      summary: '직원 서류·자격 삭제 (기록은 남고 목록에서만 사라짐)',
      auth: 'required',
      request: { params: credentialParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      const { id, credentialId } = params as { id: string; credentialId: string };

      try {
        await credentials!.remove(auth!.companyId, id, credentialId);

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/employees/{id}/credentials/{credentialId}/file-url',
      summary: '서류 파일 열람 주소 발급 (열람 기록을 남기고 짧은 만료의 주소 발급)',
      auth: 'required',
      request: { params: credentialParamsSchema },
      response: { status: 200, schema: fileUrlResponseSchema },
      errors: ['NOT_FOUND', 'VALIDATION_ERROR'],
    },
    async ({ auth, params }) => {
      const { id, credentialId } = params as { id: string; credentialId: string };

      try {
        return await credentials!.fileUrl(auth!.companyId, auth!.userId, id, credentialId);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/required-credentials',
      summary: '프로젝트 필요 자격 (투입 배정 때 자격이 없거나 만료된 직원을 경고하는 기준)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: requiredCredentialsResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await credentials!.getRequired(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'put',
      path: '/projects/{id}/required-credentials',
      summary: '프로젝트 필요 자격 저장 (보낸 목록으로 바꿈)',
      auth: 'required',
      request: { params: projectParamsSchema, body: requiredCredentialsSchema },
      response: { status: 200, schema: requiredCredentialsResponseSchema },
      errors: ['NOT_FOUND', 'VALIDATION_ERROR'],
    },
    async ({ auth, params, body }) => {
      try {
        return await credentials!.setRequired(
          auth!.companyId,
          (params as { id: string }).id,
          (body as RequiredCredentials).typeIds,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
