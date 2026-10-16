import {
  REPORT_XLSX_CONTENT_TYPE,
  companyExportRequestSchema,
  storageUsageSchema,
  successResponseSchema,
  type CompanyExportRequest,
  VALIDATION_MESSAGES,
} from '@field-note/shared';

import { AccountError } from '../auth/accountError';
import { CompanyDataError, type CompanyDataService } from '../companyData/companyDataService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스·계정 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (error instanceof CompanyDataError) {
    return new AppError('VALIDATION_ERROR', [
      { path: 'body.currentPassword', message: VALIDATION_MESSAGES.required('비밀번호') },
    ]);
  }

  if (error instanceof AccountError) {
    return error.code === 'ACCOUNT_LOCKED'
      ? new AppError('ACCOUNT_LOCKED')
      : new AppError('CURRENT_PASSWORD_INVALID');
  }

  return error;
};

/**
 * @description 저장 용량 현황·전체 데이터 내보내기 라우트, 회사 ID는 세션에서만 획득
 * @param registry 라우트 등록소
 * @param companyData 회사 데이터 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerCompanyDataRoutes = (
  registry: RouteRegistry,
  companyData?: CompanyDataService,
) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, companyData ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/company/storage',
      summary: '저장 용량 현황 (한도·사용량·용도별·프로젝트별)',
      auth: 'required',
      response: { status: 200, schema: storageUsageSchema },
    },
    async ({ auth }) => companyData!.usage(auth!.companyId),
  );

  add(
    {
      method: 'post',
      path: '/company/export',
      summary:
        '회사 전체 데이터 엑셀 내보내기 (비밀번호 재입력 필요, 파일 원본 제외, 내보낸 기록이 남음)',
      auth: 'required',
      request: { body: companyExportRequestSchema },
      response: { status: 200, schema: successResponseSchema },
      file: { contentType: REPORT_XLSX_CONTENT_TYPE },
      errors: ['CURRENT_PASSWORD_INVALID', 'ACCOUNT_LOCKED'],
      rateLimit: { windowMs: 60_000, limit: 5 },
    },
    async ({ auth, body }) => {
      try {
        return await companyData!.exportAll(auth!, (body as CompanyExportRequest).currentPassword);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
