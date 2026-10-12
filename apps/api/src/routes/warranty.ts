import {
  projectParamsSchema,
  projectWarrantySchema,
  warrantyCertificateCreateSchema,
  warrantyCertificateParamsSchema,
  warrantyCertificateUpdateSchema,
  warrantyUpdateSchema,
  type WarrantyCertificateCreate,
  type WarrantyCertificateUpdate,
  type WarrantyUpdate,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { WarrantyError, type WarrantyService } from '../warranty/warrantyService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof WarrantyError)) {
    return error;
  }

  return error.code === 'NOT_FOUND'
    ? new AppError('NOT_FOUND')
    : new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
};

/**
 * @description 보증 라우트. 회사 ID·변경자는 세션에서만 얻는다. 설정은 이력으로 남고 보증서는 지워도 기록이 남는다
 * @param registry 라우트 등록소
 * @param warranty 보증 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerWarrantyRoutes = (registry: RouteRegistry, warranty?: WarrantyService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, warranty ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/warranty',
      summary: '프로젝트 보증 설정·보증서·변경 이력 (설정이 없으면 기본 기간으로 계산한 값)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: projectWarrantySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await warranty!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'put',
      path: '/projects/{id}/warranty',
      summary:
        '보증 설정 저장 (완료·보증 중에서만, 종료 예정일은 시작일 + 기간, 바꿀 때는 사유 필수, 이력에 남음)',
      auth: 'required',
      request: { params: projectParamsSchema, body: warrantyUpdateSchema },
      response: { status: 200, schema: projectWarrantySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await warranty!.update(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as WarrantyUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/projects/{id}/warranty/certificates',
      summary: '보증서 등록 (문서함의 같은 프로젝트 문서 + 만료일)',
      auth: 'required',
      request: { params: projectParamsSchema, body: warrantyCertificateCreateSchema },
      response: { status: 201, schema: projectWarrantySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await warranty!.addCertificate(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
          body as WarrantyCertificateCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/projects/{id}/warranty/certificates/{certificateId}',
      summary: '보증서 만료일·발급처 수정',
      auth: 'required',
      request: { params: warrantyCertificateParamsSchema, body: warrantyCertificateUpdateSchema },
      response: { status: 200, schema: projectWarrantySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      const { id, certificateId } = params as { id: string; certificateId: string };

      try {
        return await warranty!.updateCertificate(
          auth!.companyId,
          id,
          certificateId,
          body as WarrantyCertificateUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/projects/{id}/warranty/certificates/{certificateId}',
      summary: '보증서 삭제 (기록은 남고 삭제 시각만 기록)',
      auth: 'required',
      request: { params: warrantyCertificateParamsSchema },
      response: { status: 200, schema: projectWarrantySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      const { id, certificateId } = params as { id: string; certificateId: string };

      try {
        return await warranty!.removeCertificate(auth!.companyId, id, certificateId);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
