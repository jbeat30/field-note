import {
  REPORT_XLSX_CONTENT_TYPE,
  projectCompletionSummarySchema,
  projectParamsSchema,
  transitionNoticesQuerySchema,
  successResponseSchema,
  transitionNoticesSchema,
  type TransitionNoticesQuery,
} from '@field-note/shared';

import { CompletionError, type CompletionService } from '../completion/completionService';
import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown =>
  error instanceof CompletionError ? new AppError('NOT_FOUND') : error;

/**
 * @description 상태 전환 안내·프로젝트 요약 라우트 (조회만, 아무것도 저장하지 않음), 회사 ID는 세션에서만 획득
 * @param registry 라우트 등록소
 * @param completion 상태 전환 안내·요약 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerCompletionRoutes = (
  registry: RouteRegistry,
  completion?: CompletionService,
) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, completion ? handler : notImplemented);

  add(
    {
      method: 'get',
      path: '/projects/{id}/transition-notices',
      summary:
        '상태 전환 전 확인할 것 (완료: 임시 저장 작업 내역·진행률·남은 자재·협의 중 변경 작업, 재개: 종료 예정일 경과). 막지 않고 알림',
      auth: 'required',
      request: { params: projectParamsSchema, query: transitionNoticesQuerySchema },
      response: { status: 200, schema: transitionNoticesSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await completion!.notices(
          auth!.companyId,
          (params as { id: string }).id,
          (query as TransitionNoticesQuery).to,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/summary',
      summary:
        '프로젝트 요약 (완료 리포트: 기본정보·투입 공수·자재·변경 작업·대표 사진·자료, 금액·민감 문서 제외)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: projectCompletionSummarySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await completion!.summary(auth!.companyId, (params as { id: string }).id);
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{id}/summary.xlsx',
      summary:
        '프로젝트 요약 엑셀 내보내기 (요약과 같은 내용, 금액·민감 문서 제외, 내보낸 기록이 남음)',
      auth: 'required',
      request: { params: projectParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      file: { contentType: REPORT_XLSX_CONTENT_TYPE },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params }) => {
      try {
        return await completion!.exportXlsx(
          auth!.companyId,
          auth!.userId,
          (params as { id: string }).id,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
