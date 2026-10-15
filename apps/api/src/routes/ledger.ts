import {
  LEDGER_KIND_LABELS,
  ledgerEntriesResponseSchema,
  ledgerEntryCreateSchema,
  ledgerEntryListQuerySchema,
  ledgerEntryParamsSchema,
  ledgerEntrySchema,
  ledgerEntryUpdateSchema,
  ledgerSummaryQuerySchema,
  ledgerSummarySchema,
  projectFileParamsSchema,
  successResponseSchema,
  type LedgerEntryCreate,
  type LedgerEntryListQuery,
  type LedgerEntryUpdate,
  type LedgerSummaryQuery,
} from '@field-note/shared';

import { AppError } from '../http/AppError';
import type { RouteHandler, RouteRegistry } from '../http/route';
import { LedgerError, type LedgerService, type RemovedLedgerEntry } from '../ledger/ledgerService';

const notImplemented: RouteHandler = async () => {
  throw new AppError('NOT_IMPLEMENTED');
};

// 서비스의 업무 오류를 공통 오류 형식으로 변환
const toAppError = (error: unknown): unknown => {
  if (!(error instanceof LedgerError)) {
    return error;
  }

  switch (error.code) {
    case 'NOT_FOUND':
      return new AppError('NOT_FOUND');
    case 'INVALID':
      return new AppError('VALIDATION_ERROR', error.detail ? [error.detail] : undefined);
  }
};

/**
 * @description 지출·수입 기록 라우트. 회사 ID는 세션에서만 얻는다 (프로젝트별 기록, 합계)
 * @param registry 라우트 등록소
 * @param ledger 지출·수입 서비스 (없으면 구현 전 상태 501로 등록해 OpenAPI 문서는 항상 같음)
 */
export const registerLedgerRoutes = (registry: RouteRegistry, ledger?: LedgerService) => {
  const add: RouteRegistry['add'] = (spec, handler) =>
    registry.add(spec, ledger ? handler : notImplemented);

  add(
    {
      method: 'post',
      path: '/projects/{projectId}/ledger-entries',
      summary: '지출·수입 기록 한 건 (구분마다 분류 목록이 다름, 증빙 문서·추가 공사 연결은 선택)',
      auth: 'required',
      request: { params: projectFileParamsSchema, body: ledgerEntryCreateSchema },
      response: { status: 201, schema: ledgerEntrySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await ledger!.create(
          auth!.companyId,
          auth!.userId,
          (params as { projectId: string }).projectId,
          body as LedgerEntryCreate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/ledger-entries',
      summary: '프로젝트 지출·수입 내역 (날짜 최근순, 구분·분류·기간 필터, 커서 방식)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: ledgerEntryListQuerySchema },
      response: { status: 200, schema: ledgerEntriesResponseSchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await ledger!.list(
          auth!.companyId,
          (params as { projectId: string }).projectId,
          query as LedgerEntryListQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'get',
      path: '/projects/{projectId}/ledger-summary',
      summary: '프로젝트 지출 합계·수입 합계·분류별 합계 (내역과 같은 필터)',
      auth: 'required',
      request: { params: projectFileParamsSchema, query: ledgerSummaryQuerySchema },
      response: { status: 200, schema: ledgerSummarySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, query }) => {
      try {
        return await ledger!.summary(
          auth!.companyId,
          (params as { projectId: string }).projectId,
          query as LedgerSummaryQuery,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'patch',
      path: '/ledger-entries/{id}',
      summary: '지출·수입 기록 수정 (구분을 바꾸면 분류도 새로 골라야 하며 안 고르면 비움)',
      auth: 'required',
      request: { params: ledgerEntryParamsSchema, body: ledgerEntryUpdateSchema },
      response: { status: 200, schema: ledgerEntrySchema },
      errors: ['NOT_FOUND'],
    },
    async ({ auth, params, body }) => {
      try {
        return await ledger!.update(
          auth!.companyId,
          (params as { id: string }).id,
          body as LedgerEntryUpdate,
        );
      } catch (error) {
        throw toAppError(error);
      }
    },
  );

  add(
    {
      method: 'delete',
      path: '/ledger-entries/{id}',
      summary: '지출·수입 기록 삭제 (소프트 삭제)',
      auth: 'required',
      request: { params: ledgerEntryParamsSchema },
      response: { status: 200, schema: successResponseSchema },
      errors: ['NOT_FOUND'],
      // 활동 기록: 지운 기록의 프로젝트·구분·날짜·금액 (핸들러가 response.locals에 담아 둠)
      audit: {
        entry: ({ params, response }) => {
          const removed = response.locals.removedLedgerEntry as RemovedLedgerEntry | undefined;

          return removed
            ? {
                action: 'LEDGER_ENTRY_DELETED',
                targetId: removed.projectId,
                projectId: removed.projectId,
                detail: {
                  kind:
                    LEDGER_KIND_LABELS[removed.kind as keyof typeof LEDGER_KIND_LABELS] ??
                    removed.kind,
                  entryDate: removed.entryDate,
                  amount: removed.amount,
                  content: removed.content ?? '',
                  entryId: (params as { id: string }).id,
                },
              }
            : null;
        },
      },
    },
    async ({ auth, params, response }) => {
      try {
        response.locals.removedLedgerEntry = await ledger!.remove(
          auth!.companyId,
          (params as { id: string }).id,
        );

        return { success: true };
      } catch (error) {
        throw toAppError(error);
      }
    },
  );
};
