import {
  auditLogListQuerySchema,
  auditLogsResponseSchema,
  type AuditLogListQuery,
} from '@field-note/shared';

import { AuditError, type AuditService } from '../audit/auditService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

/**
 * @description 기록 조회 라우트. 회사 ID는 세션에서만 얻고 조회만 한다 (감사 기록은 수정·삭제할 수 없음)
 * @param registry 라우트 등록소
 * @param audit 감사 기록 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerAuditRoutes = (registry: RouteRegistry, audit?: AuditService) => {
  registry.add(
    {
      method: 'get',
      path: '/audit-logs',
      summary:
        '기록 조회 (민감 자료·직원 서류 열람, 내보내기, 단가·인건비 조회, 월 공수 확정·재오픈, 최근순 커서 방식)',
      auth: 'required',
      request: { query: auditLogListQuerySchema },
      response: { status: 200, schema: auditLogsResponseSchema },
      errors: ['VALIDATION_ERROR'],
    },
    audit
      ? async ({ auth, query }) => {
          try {
            return await audit.list(auth!.companyId, query as AuditLogListQuery);
          } catch (error) {
            throw error instanceof AuditError
              ? new AppError('VALIDATION_ERROR', [error.detail])
              : error;
          }
        }
      : notImplemented,
  );
};
