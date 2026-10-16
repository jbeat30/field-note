import {
  employeeFileParamsSchema,
  employeeFileUploadRequestSchema,
  fileParamsSchema,
  fileUploadRequestSchema,
  fileUploadTicketSchema,
  fileUrlQuerySchema,
  fileUrlResponseSchema,
  projectFileParamsSchema,
  storedFileSchema,
  type EmployeeFileUploadRequest,
  type FileUploadRequest,
  type FileUrlQuery,
  VALIDATION_MESSAGES,
} from '@field-note/shared';

import { FileError, type FileService } from '../file/fileService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof FileError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'QUOTA':
      return new AppError('STORAGE_QUOTA_EXCEEDED');
    case 'NOT_UPLOADED':
      return new AppError('VALIDATION_ERROR', [
        { path: 'file', message: VALIDATION_MESSAGES.FILE_UPLOAD_NOT_COMPLETE },
      ]);
    case 'NOT_READY':
      return new AppError('VALIDATION_ERROR', [
        { path: 'file', message: VALIDATION_MESSAGES.FILE_NOT_READY_TO_OPEN },
      ]);
  }
};

/**
 * @description 파일 업로드 라우트, 회사 ID는 세션에서만 얻음 (브라우저가 저장소에 직접 올리는 방식:
 * 신청 → 발급된 주소로 PUT → 완료 알림 → 서버 검사 → 사용 가능)
 * @param registry 라우트 등록소
 * @param files 파일 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerFileRoutes = (registry: RouteRegistry, files?: FileService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, files ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/files',
      summary: '파일 업로드 신청 (형식·크기·회사 용량 확인 후 짧은 만료의 업로드 주소 발급)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: fileUploadRequestSchema },
      response: { status: 201, schema: fileUploadTicketSchema },
      errors: ['NOT_FOUND', 'STORAGE_QUOTA_EXCEEDED'],
    },
    async ({ auth, params, body }) => {
      try {
        return await files!.requestUpload(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          body as FileUploadRequest,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/employees/{employeeId}/files',
      summary: '직원 서류 파일 업로드 신청 (이미지·PDF, 열람은 직원 서류 API로만)',
      auth: 'required',
      request: { params: employeeFileParamsSchema, body: employeeFileUploadRequestSchema },
      response: { status: 201, schema: fileUploadTicketSchema },
      errors: ['NOT_FOUND', 'STORAGE_QUOTA_EXCEEDED'],
    },
    async ({ auth, params, body }) => {
      try {
        return await files!.requestEmployeeUpload(
          auth!.companyId,
          auth!.userId,
          (params as { employeeId: string }).employeeId,
          body as EmployeeFileUploadRequest,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'post',
      path: '/files/{id}/complete',
      summary: '업로드 완료 알림 (내용 검사·썸네일 작업 시작, 여러 번 보내도 안전)',
      auth: 'required',
      request: { params: fileParamsSchema },
      response: { status: 200, schema: storedFileSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await files!.complete(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/files/{id}',
      summary: '파일 정보와 검사 상태 (거부되면 사유 포함)',
      auth: 'required',
      request: { params: fileParamsSchema },
      response: { status: 200, schema: storedFileSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await files!.get(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/files/{id}/url',
      summary: '내려받기·미리보기 주소 발급 (검사가 끝난 파일만, 짧은 만료)',
      auth: 'required',
      request: { params: fileParamsSchema, query: fileUrlQuerySchema },
      response: { status: 200, schema: fileUrlResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await files!.url(
          auth!.companyId,
          (params as { id: string }).id,
          query as FileUrlQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
